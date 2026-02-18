/**
 * All Contacts Sync Service (Fetch-Merge-Upsert Pattern)
 *
 * Syncs ALL HubSpot contacts to Supabase using a clean merge pattern:
 * 1. Fetch existing Supabase record (if any)
 * 2. Merge: Start with existing data, overlay HubSpot values (only where HubSpot has data)
 * 3. UPSERT the complete merged object
 *
 * SAFETY:
 * - Never destroys existing Supabase data when HubSpot fields are blank
 * - Supabase-only fields are always preserved (business_type, hubspot_company_id, etc.)
 * - Only overwrites fields where HubSpot has actual values
 *
 * REQUIRES: UNIQUE constraint on (hubspot_contact_id, user_id)
 * Migration: 20251129000000_add_contacts_unique_constraint.sql
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  authenticateSupabase,
  retryWithBackoff,
  sleep,
  formatDuration,
} from './utils'

// Configuration
const HUBSPOT_BATCH_SIZE = 100
const SUPABASE_BATCH_SIZE = 50 // Smaller batches for UPSERT
const REQUEST_DELAY_MS = 150

/**
 * HubSpot Lifecycle Stage Labels
 *
 * Maps internal HubSpot values (including numeric IDs for custom stages)
 * to human-readable labels. Standard stages use string identifiers,
 * while custom stages created in HubSpot get numeric IDs.
 *
 * Updated dynamically by querying: GET /crm/v3/properties/contacts/lifecyclestage
 * See: scripts/get-lifecycle-stages.ts
 */
const LIFECYCLE_STAGE_LABELS: Record<string, string> = {
  // Custom stages (numeric IDs)
  '944991848': 'HOT',
  '999377175': 'Active',
  '958707767': 'No Show',
  '946862144': 'DNC',
  '81722417': 'Zing Employee',
  '1000822942': 'Reengage',
  '1009016957': 'VC',
  // Standard HubSpot stages
  'customer': 'Customer',
  'lead': 'Lead',
  'salesqualifiedlead': 'Sales Qualified Lead',
  'opportunity': 'Opportunity',
  'other': 'Other',
  'subscriber': 'Subscriber',
  'marketingqualifiedlead': 'Marketing Qualified Lead',
  'evangelist': 'Evangelist',
}

/**
 * Get human-readable label for a lifecycle stage value
 * Returns the original value if no mapping exists (fallback for unknown stages)
 */
export function getLifecycleLabel(stageValue: string | null): string {
  if (!stageValue) return '(none)'
  return LIFECYCLE_STAGE_LABELS[stageValue] || stageValue
}

// Contact properties to fetch from HubSpot
// Optimized list based on fill rate analysis (see scripts/test-property-fill-rates.ts)
// Total: 29 properties (original 18 + 11 valuable additions)
const CONTACT_PROPERTIES = [
  // === ORIGINAL 18 PROPERTIES (MUST KEEP) ===
  // Core Identity (100% fill except mobilephone: 5%)
  'firstname',
  'lastname',
  'email',
  'phone',
  'mobilephone',
  'company',
  'website', // 74% fill

  // Location/Address (5-79% fill)
  'address',
  'city',
  'state',
  'zip',
  'country',

  // HubSpot Standard (77-100% fill)
  'lifecyclestage',
  'hs_lead_status',
  'hs_object_id',
  'num_notes',
  'createdate',
  'lastmodifieddate',

  // === NEW VALUABLE PROPERTIES (>0% fill) ===
  // High fill (100%)
  'hs_email_domain',
  'hs_analytics_source',
  'hs_analytics_num_page_views',
  'hs_analytics_num_visits',

  // Medium fill (9-24%)
  'industry', // 24%
  'notes_last_updated', // 16%
  'jobtitle', // 15%
  'notes_last_contacted', // 9%

  // Low fill but useful for analytics (1-4%)
  'hs_analytics_first_visit_timestamp',
  'hs_analytics_last_visit_timestamp',
  'associatedcompanyid',

  // NOTE: Removed 0% fill properties (Zing-specific custom that don't exist in HubSpot):
  // - current_website, business_hours, business_category_type
  // - published_status, publishing_fee_paid, annualrevenue
  // These can be re-added if they're created in HubSpot later
]

// Sync mode type
// - 'insert': Only add new contacts (skips existing)
// - 'sync': Full sync - upserts all contacts
// - 'incremental': Only sync contacts modified since last sync (FAST!)
export type SyncMode = 'insert' | 'sync' | 'incremental'

interface HubSpotContact {
  id: string
  properties: Record<string, string | null>
  createdAt: string
  updatedAt: string
}

interface ContactsResponse {
  results: HubSpotContact[]
  paging?: {
    next?: {
      after: string
    }
  }
}

// Full contact record from Supabase (matches ACTUAL database schema from check-schema.ts)
// NOTE: Column names match HubSpot convention (no underscores) not PostgreSQL snake_case!
interface ExistingContactRecord {
  id: string
  hubspot_contact_id: string
  hubspot_company_id?: string | null
  user_id: string
  // Core identity - HubSpot naming (no underscores)
  hs_object_id?: string | null
  firstname: string | null // NOT first_name
  lastname: string | null // NOT last_name
  email: string | null
  phone: string | null
  mobilephone: string | null
  company: string | null
  // Address fields
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  // Website fields
  website: string | null
  current_website: string | null
  website_status: string | null
  // Business fields (Supabase-only)
  business_type: string | null
  business_category_type: string | null
  business_hours: string | null
  locations: string | null
  active_customer: boolean | null
  gbp_ready: boolean | null
  published_status: string | null
  publishing_fee_paid: boolean | null
  completeness_score: number | null
  // HubSpot lifecycle
  lifecyclestage: string | null // NOT lifecycle_stage
  // HubSpot timestamps
  createdate: string | null
  lastmodifieddate: string | null
  synced_at: string | null // NOT last_synced_at
  // Auto-managed timestamps
  created_at?: string
  updated_at?: string
}

interface SyncStats {
  totalFetched: number
  upserted: number
  skipped: number
  failed: number
  startTime: number
}

/**
 * Represents a single field change detected during sync
 */
export interface FieldChange {
  field: string
  oldValue: string | null
  newValue: string | null
}

/**
 * Detailed information about a synced contact for logging purposes
 */
export interface SyncedContactInfo {
  hubspotId: string
  email: string | null
  name: string
  company: string | null
  lifecyclestage: string | null
  /** Human-readable lifecycle stage label (translates numeric IDs to names) */
  lifecycleLabel: string
  lastModified: string | null
  isNew: boolean // true = new contact, false = updated existing
  /** List of fields that changed (only for updates, not new contacts) */
  changedFields: FieldChange[]
}

export interface AllContactsSyncResult {
  success: boolean
  totalContacts: number
  inserted: number
  updated: number
  skipped: number
  errors: number
  duration: string
  timestamp: string
  mode: SyncMode
  errorMessage?: string
  /** Detailed list of synced contacts (only populated for incremental mode) */
  syncedContacts?: SyncedContactInfo[]
  /** The timestamp used as the sync cutoff (start of day UTC) */
  syncSinceTimestamp?: string
}

/**
 * Main sync function - syncs ALL contacts from HubSpot to Supabase
 * Uses Fetch-Merge-Upsert pattern for clean, safe synchronization
 *
 * @param mode - Sync mode:
 *   - 'insert': Only add new contacts (skips existing)
 *   - 'sync': Full sync - upserts all contacts (RECOMMENDED)
 */
export async function syncAllContacts(
  hubspotAccessToken: string,
  supabaseUrl: string,
  supabaseKey: string,
  userEmail: string,
  userPassword: string,
  mode: SyncMode = 'sync' // Default to full sync now
): Promise<AllContactsSyncResult> {
  const startTime = Date.now()
  const stats: SyncStats = {
    totalFetched: 0,
    upserted: 0,
    skipped: 0,
    failed: 0,
    startTime,
  }

  // === GLOBAL DUPLICATE TRACKING ===
  // HubSpot cursor pagination can return the same contact on different pages
  // if data changes during a long sync (14+ minutes for 133K contacts).
  // Track all processed IDs to prevent duplicate key violations.
  const processedHubSpotIds = new Set<string>()
  let duplicatesSkipped = 0

  // === DETAILED CONTACT TRACKING (for incremental mode) ===
  // Track synced contacts info for detailed logging
  const syncedContactsInfo: SyncedContactInfo[] = []
  let syncSinceTimestamp: string | undefined

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authenticate
    const userId = await authenticateSupabase(supabase, userEmail, userPassword)

    // For 'sync' mode, fetch all existing contacts (full records)
    // For 'insert' mode, just fetch IDs to know what to skip
    console.log(`[All Contacts Sync] Mode: ${mode}`)
    console.log('[All Contacts Sync] Fetching existing contacts from Supabase...')

    // Fetch existing contacts (we no longer need to track PRIMARY KEY IDs since we never set `id` field)
    // For 'sync' and 'incremental' modes, we need full records to merge data
    const needFullRecords = mode === 'sync' || mode === 'incremental'
    const existingContacts = await fetchExistingContacts(supabase, userId, needFullRecords)
    console.log(`[All Contacts Sync] Found ${existingContacts.size} existing contacts in Supabase`)

    // === INCREMENTAL SYNC MODE ===
    // If incremental mode, get the last sync timestamp and use HubSpot Search API
    let incrementalSinceTimestamp: number | null = null
    let effectiveMode = mode

    if (mode === 'incremental') {
      console.log('[All Contacts Sync] Getting last sync timestamp...')
      incrementalSinceTimestamp = await getLastSyncTimestamp(supabase, userId)

      if (incrementalSinceTimestamp) {
        const sinceDate = new Date(incrementalSinceTimestamp).toISOString()
        syncSinceTimestamp = sinceDate // Store for result
        console.log('[All Contacts Sync] ═════════════════════════════════════════════════════════')
        console.log(`[All Contacts Sync] 📅 Incremental sync from: ${sinceDate}`)
        console.log(`[All Contacts Sync]    (Start of day: midnight UTC)`)
        console.log('[All Contacts Sync] ═════════════════════════════════════════════════════════')
      } else {
        console.log('[All Contacts Sync] No previous sync found - falling back to full sync')
        effectiveMode = 'sync' // Fall back to full sync
      }
    }

    // Fetch contacts from HubSpot
    let after: string | undefined
    let pageCount = 0
    // For incremental, limit to 100 pages (10K max - Search API limit)
    // For full sync, allow 3000 pages (300K contacts)
    const maxPages = effectiveMode === 'incremental' ? 100 : 3000

    console.log(`[All Contacts Sync] Starting HubSpot fetch (${effectiveMode} mode)...`)

    while (pageCount < maxPages) {
      // Fetch page of contacts - use Search API for incremental, List API for full sync
      let response: ContactsResponse

      if (effectiveMode === 'incremental' && incrementalSinceTimestamp) {
        // Use HubSpot Search API with lastmodifieddate filter
        response = await searchModifiedContacts(hubspotAccessToken, incrementalSinceTimestamp, after)
      } else {
        // Use standard list API (no filter)
        response = await fetchContactsPage(hubspotAccessToken, after)
      }

      const contacts = response.results

      if (!contacts || contacts.length === 0) {
        break
      }

      stats.totalFetched += contacts.length

      if (effectiveMode === 'insert') {
        // INSERT mode: Only process new contacts
        const newContacts = contacts.filter(c => !existingContacts.has(c.id))
        stats.skipped += contacts.length - newContacts.length

        if (newContacts.length > 0) {
          const records = newContacts.map(c => buildMergedRecord(c, null, userId))
          const { success, failed } = await upsertContacts(supabase, records)
          stats.upserted += success
          stats.failed += failed
        }
      } else {
        // SYNC mode: Upsert all contacts (merge with existing data)
        // === GLOBAL DUPLICATE FILTER ===
        // Filter out contacts we've already processed in this sync session
        // This prevents duplicate key violations when HubSpot pagination returns
        // the same contact on multiple pages during a long-running sync
        const uniqueContacts = contacts.filter(c => {
          if (processedHubSpotIds.has(c.id)) {
            duplicatesSkipped++
            return false
          }
          processedHubSpotIds.add(c.id)
          return true
        })

        // Track how many duplicates we filtered out
        const duplicatesInThisBatch = contacts.length - uniqueContacts.length
        if (duplicatesInThisBatch > 0) {
          stats.skipped += duplicatesInThisBatch
          console.log(`[All Contacts Sync] Skipped ${duplicatesInThisBatch} duplicate contact(s) already processed`)
        }

        // Only process unique contacts
        if (uniqueContacts.length > 0) {
          const records = uniqueContacts.map(hubspotContact => {
            const existing = existingContacts.get(hubspotContact.id) || null
            return buildMergedRecord(hubspotContact, existing, userId)
          })

          // === DETAILED LOGGING FOR INCREMENTAL MODE ===
          // Log each contact being synced with relevant details
          if (effectiveMode === 'incremental') {
            uniqueContacts.forEach((hubspotContact, index) => {
              const props = hubspotContact.properties
              const existing = existingContacts.get(hubspotContact.id) || null
              const isNew = !existing

              // Build display name (prefer full name, fallback to email)
              const firstName = props.firstname || ''
              const lastName = props.lastname || ''
              const fullName = `${firstName} ${lastName}`.trim() || props.email || 'Unknown'

              // Format last modified date nicely
              const lastMod = props.lastmodifieddate
                ? new Date(props.lastmodifieddate).toLocaleString()
                : 'N/A'

              // Detect field-level changes (only for existing contacts)
              const changedFields = detectFieldChanges(props, existing)

              // Translate lifecycle stage to human-readable label
              const lifecycleLabel = getLifecycleLabel(props.lifecyclestage || null)

              // Track contact info for result
              syncedContactsInfo.push({
                hubspotId: hubspotContact.id,
                email: props.email || null,
                name: fullName,
                company: props.company || null,
                lifecyclestage: props.lifecyclestage || null,
                lifecycleLabel,
                lastModified: props.lastmodifieddate || null,
                isNew,
                changedFields,
              })

              // Log each contact with status icon (using human-readable lifecycle label)
              const statusIcon = isNew ? '🆕' : '🔄'
              const statusText = isNew ? 'NEW' : 'UPD'
              console.log(
                `[Sync] ${statusIcon} ${statusText} | ` +
                `ID: ${hubspotContact.id} | ` +
                `${fullName} | ` +
                `${props.email || 'no-email'} | ` +
                `${props.company || 'no-company'} | ` +
                `${lifecycleLabel} | ` +
                `Modified: ${lastMod}`
              )

              // Log field-level changes if any
              if (changedFields.length > 0) {
                console.log(`        📝 ${changedFields.length} field(s) changed:`)
                changedFields.forEach(change => {
                  // Special handling for lifecyclestage - show human-readable label with raw ID
                  let oldDisplay = change.oldValue || '(empty)'
                  let newDisplay = change.newValue || '(empty)'
                  if (change.field === 'lifecyclestage') {
                    if (oldDisplay !== '(empty)') {
                      oldDisplay = `${getLifecycleLabel(change.oldValue)} [${oldDisplay}]`
                    }
                    if (newDisplay !== '(empty)') {
                      newDisplay = `${getLifecycleLabel(change.newValue)} [${newDisplay}]`
                    }
                  }
                  // Truncate long values for display
                  const truncatedOld = oldDisplay.length > 50 ? oldDisplay.substring(0, 47) + '...' : oldDisplay
                  const truncatedNew = newDisplay.length > 50 ? newDisplay.substring(0, 47) + '...' : newDisplay
                  console.log(`           • ${change.field}: "${truncatedOld}" → "${truncatedNew}"`)
                })
              }
            })
          }

          const { success, failed } = await upsertContacts(supabase, records)
          stats.upserted += success
          stats.failed += failed
        }
      }

      // Log progress every 10 pages
      if ((pageCount + 1) % 10 === 0) {
        console.log(
          `[All Contacts Sync] Page ${pageCount + 1}: ${stats.totalFetched} fetched, ` +
          `${stats.upserted} upserted, ${stats.skipped} skipped, ${stats.failed} failed`
        )
      }

      // Check for next page
      if (!response.paging?.next?.after) {
        break
      }

      after = response.paging.next.after
      pageCount++

      // Rate limiting delay
      await sleep(REQUEST_DELAY_MS)
    }

    // Calculate duration
    const duration = formatDuration(Date.now() - startTime)

    // Log final summary with duplicate tracking info
    console.log(
      `[All Contacts Sync] Complete (${effectiveMode}): ${stats.totalFetched} fetched, ` +
      `${stats.upserted} upserted, ${stats.skipped} skipped, ${stats.failed} failed in ${duration}`
    )
    if (duplicatesSkipped > 0) {
      console.log(`[All Contacts Sync] 🔄 Filtered ${duplicatesSkipped} duplicate contact(s) from HubSpot pagination`)
    }
    console.log(`[All Contacts Sync] 📊 Unique contacts processed: ${processedHubSpotIds.size}`)

    // Build result with optional incremental mode data
    const result: AllContactsSyncResult = {
      success: true,
      totalContacts: stats.totalFetched,
      inserted: effectiveMode === 'insert' ? stats.upserted : 0,
      updated: effectiveMode === 'sync' || effectiveMode === 'incremental' ? stats.upserted : 0,
      skipped: stats.skipped,
      errors: stats.failed,
      duration,
      timestamp: new Date().toISOString(),
      mode: effectiveMode,
    }

    // Include detailed contact info for incremental mode
    if (effectiveMode === 'incremental' && syncedContactsInfo.length > 0) {
      result.syncedContacts = syncedContactsInfo
      result.syncSinceTimestamp = syncSinceTimestamp
    }

    return result
  } catch (error: any) {
    const duration = formatDuration(Date.now() - startTime)

    console.error('[All Contacts Sync] Error:', error.message)

    return {
      success: false,
      totalContacts: stats.totalFetched,
      inserted: 0,
      updated: stats.upserted,
      skipped: stats.skipped,
      errors: stats.failed + 1,
      duration,
      timestamp: new Date().toISOString(),
      mode,
      errorMessage: error.message || 'Unknown error occurred',
    }
  }
}

/**
 * Fetch existing contacts from Supabase
 *
 * Returns a Map keyed by hubspot_contact_id for quick existing record lookup.
 * We no longer track PRIMARY KEY IDs since we never set the `id` field ourselves -
 * PostgreSQL auto-generates UUIDs, eliminating any possibility of PRIMARY KEY conflicts.
 *
 * @param fetchFullRecords - If true, fetches full records for merging. If false, just IDs.
 * @returns Map keyed by hubspot_contact_id
 */
async function fetchExistingContacts(
  supabase: SupabaseClient,
  userId: string,
  fetchFullRecords: boolean
): Promise<Map<string, ExistingContactRecord | null>> {
  const contactsByHubspotId = new Map<string, ExistingContactRecord | null>()
  let from = 0
  const batchSize = 1000

  // Select columns based on mode
  const selectColumns = fetchFullRecords ? '*' : 'hubspot_contact_id'

  while (true) {
    const { data, error } = await supabase
      .from('contacts')
      .select(selectColumns)
      .eq('user_id', userId)
      .range(from, from + batchSize - 1)

    if (error) {
      throw new Error(`Failed to fetch existing contacts: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    // Map by hubspot_contact_id for record lookup
    data.forEach((row: any) => {
      if (row.hubspot_contact_id) {
        contactsByHubspotId.set(
          row.hubspot_contact_id,
          fetchFullRecords ? row : null
        )
      }
    })

    from += batchSize

    if (data.length < batchSize) {
      break
    }
  }

  return contactsByHubspotId
}

/**
 * BUILD MERGED RECORD - The heart of the Fetch-Merge-Upsert pattern
 *
 * Takes existing Supabase data (if any) and HubSpot data, merges them:
 * - Start with existing Supabase values (ALL fields preserved)
 * - Overlay HubSpot values ONLY where HubSpot has actual data
 * - Result: Complete record ready for UPSERT
 *
 * IMPORTANT: Actual Supabase schema uses HubSpot naming (no underscores):
 * - firstname, lastname, lifecyclestage (NOT first_name, last_name, lifecycle_stage)
 * - synced_at (NOT last_synced_at)
 * - NO raw_properties column - all HubSpot props are individual columns
 *
 * This ensures:
 * ✅ Supabase-only fields (business_type, hubspot_company_id, etc.) are NEVER lost
 * ✅ HubSpot nulls don't destroy existing Supabase values
 * ✅ Fresh HubSpot data overwrites stale Supabase data
 *
 * PRIMARY KEY STRATEGY (BULLETPROOF):
 * We handle the `id` field carefully to satisfy NOT NULL while avoiding conflicts:
 * - For EXISTING records: keep the existing UUID (updates use same row)
 * - For NEW records: generate fresh UUID via crypto.randomUUID()
 * - UPSERT conflict detection uses (hubspot_contact_id, user_id), NOT `id`
 * - This satisfies NOT NULL constraint and eliminates PRIMARY KEY conflicts
 * - The `id` column is purely internal; business logic uses `hubspot_contact_id`
 */
function buildMergedRecord(
  hubspotContact: HubSpotContact,
  existing: ExistingContactRecord | null,
  userId: string
): Record<string, any> {
  const props = hubspotContact.properties

  // Start with existing Supabase data (or empty object for new contacts)
  const merged: Record<string, any> = existing ? { ...existing } : {}

  // Remove auto-managed timestamp fields - Supabase handles these
  delete merged.created_at // Auto-managed by Supabase trigger
  delete merged.updated_at // Auto-managed by Supabase trigger

  // CRITICAL: Handle `id` field to satisfy NOT NULL constraint while avoiding PRIMARY KEY conflicts
  // - For existing records: keep the existing UUID (ensures UPSERT updates the same row)
  // - For new records: generate a fresh UUID (satisfies NOT NULL constraint)
  // NOTE: UPSERT conflict detection uses (hubspot_contact_id, user_id), NOT `id`
  // The `id` is just the internal PostgreSQL row identifier
  if (existing) {
    merged.id = existing.id  // Keep existing UUID for updates
  } else {
    merged.id = crypto.randomUUID()  // Generate new UUID for inserts
  }

  // Link to HubSpot via hubspot_contact_id (the BUSINESS key, not PRIMARY key)
  merged.hubspot_contact_id = hubspotContact.id
  merged.user_id = userId
  merged.synced_at = new Date().toISOString() // Correct column name (not last_synced_at)

  // CONDITIONAL FIELD UPDATES - Only overlay if HubSpot has actual value
  // If HubSpot is null/blank, existing Supabase value is preserved
  // Using ACTUAL column names (HubSpot naming convention - no underscores)

  // Core identity fields
  if (props.hs_object_id) merged.hs_object_id = props.hs_object_id
  if (props.email) merged.email = props.email
  if (props.firstname) merged.firstname = props.firstname // NOT first_name
  if (props.lastname) merged.lastname = props.lastname // NOT last_name
  if (props.phone) merged.phone = props.phone
  if (props.mobilephone) merged.mobilephone = props.mobilephone
  if (props.company) merged.company = props.company

  // Address fields
  if (props.address) merged.address = props.address
  if (props.city) merged.city = props.city
  if (props.state) merged.state = props.state
  if (props.zip) merged.zip = props.zip
  if (props.country) merged.country = props.country

  // Website fields
  if (props.website) merged.website = props.website

  // HubSpot lifecycle & timestamps
  // IMPORTANT: Translate lifecycle stage to human-readable label BEFORE saving
  // This stores "Customer", "HOT", "DNC", etc. instead of raw HubSpot IDs like "946862144"
  // Makes Supabase data immediately queryable without translation at display time
  if (props.lifecyclestage) merged.lifecyclestage = getLifecycleLabel(props.lifecyclestage)
  if (props.createdate) merged.createdate = props.createdate
  if (props.lastmodifieddate) merged.lastmodifieddate = props.lastmodifieddate

  // For NEW contacts only, set null defaults for required fields
  if (!existing) {
    if (!merged.email) merged.email = null
    if (!merged.firstname) merged.firstname = null
    if (!merged.lastname) merged.lastname = null
    if (!merged.phone) merged.phone = null
    if (!merged.company) merged.company = null
    if (!merged.lifecyclestage) merged.lifecyclestage = null
  }

  // Note: Supabase-only fields like business_type, hubspot_company_id, etc.
  // are automatically preserved because we started with { ...existing }

  return merged
}

/**
 * DETECT FIELD CHANGES - Compare HubSpot data with existing Supabase record
 *
 * Returns an array of FieldChange objects showing what changed.
 * Only compares fields that HubSpot provides (from CONTACT_PROPERTIES).
 *
 * Note: Excludes timestamp fields (createdate, lastmodifieddate) since:
 * - lastmodifieddate is always different for modified contacts (that's how we know they changed)
 * - Both use different string formats (+00:00 vs Z) that are semantically equivalent
 *
 * @param hubspotProps - Properties from HubSpot contact
 * @param existing - Existing record from Supabase (or null for new contacts)
 * @returns Array of field changes (empty for new contacts or no changes)
 */
function detectFieldChanges(
  hubspotProps: Record<string, string | null>,
  existing: ExistingContactRecord | null
): FieldChange[] {
  // For new contacts, no changes to detect
  if (!existing) {
    return []
  }

  const changes: FieldChange[] = []

  // Map of HubSpot property names to Supabase column names
  // Most are identical, but this handles any differences
  // NOTE: Excluded timestamp fields (createdate, lastmodifieddate) - they have format differences
  // that cause false positives (+00:00 vs Z) and lastmodifieddate always changes anyway
  const fieldMappings: Record<string, keyof ExistingContactRecord> = {
    hs_object_id: 'hs_object_id',
    email: 'email',
    firstname: 'firstname',
    lastname: 'lastname',
    phone: 'phone',
    mobilephone: 'mobilephone',
    company: 'company',
    address: 'address',
    city: 'city',
    state: 'state',
    zip: 'zip',
    country: 'country',
    website: 'website',
    lifecyclestage: 'lifecyclestage',
    // Excluded: createdate, lastmodifieddate (timestamp format differences cause false positives)
  }

  // Compare each mapped field
  for (const [hubspotField, supabaseColumn] of Object.entries(fieldMappings)) {
    const newValue = hubspotProps[hubspotField] ?? null
    const oldValue = existing[supabaseColumn] ?? null

    // Normalize values for comparison (handle empty strings vs null)
    const normalizedNew = newValue === '' ? null : newValue
    const normalizedOld = oldValue === '' ? null : (typeof oldValue === 'string' ? oldValue : String(oldValue ?? '')) || null

    // Only record a change if:
    // 1. Values are different
    // 2. HubSpot has a value (we don't track "removed" since HubSpot nulls don't overwrite)
    if (normalizedNew !== normalizedOld && normalizedNew !== null) {
      changes.push({
        field: hubspotField,
        oldValue: normalizedOld,
        newValue: normalizedNew,
      })
    }
  }

  return changes
}

/**
 * Fetch a page of ALL contacts from HubSpot (no lifecycle filter)
 */
async function fetchContactsPage(
  accessToken: string,
  after?: string
): Promise<ContactsResponse> {
  return retryWithBackoff(async () => {
    const url = new URL('https://api.hubapi.com/crm/v3/objects/contacts')
    url.searchParams.set('limit', String(HUBSPOT_BATCH_SIZE))
    url.searchParams.set('properties', CONTACT_PROPERTIES.join(','))
    if (after) {
      url.searchParams.set('after', after)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await sleep(waitTime)
      throw new Error('Rate limited - will retry')
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot API Error ${response.status}: ${errorText}`)
    }

    return await response.json()
  })
}

/**
 * Convert a timestamp to the start of that day (midnight UTC)
 *
 * This provides a safety margin for incremental syncs - by starting from
 * midnight of the last modified day, we ensure no contacts are missed
 * even if they were modified within the same second as our previous sync.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Unix timestamp in milliseconds for 00:00:00.000 UTC of that day
 */
function getStartOfDayUTC(timestamp: number): number {
  const date = new Date(timestamp)
  date.setUTCHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Get the timestamp of the most recently modified contact in Supabase,
 * normalized to the START OF THAT DAY (midnight UTC).
 *
 * This is used to determine which HubSpot contacts need to be synced.
 * Using start-of-day provides:
 * 1. Safety margin - no contacts missed if modified same second as last sync
 * 2. Time zone consistency - UTC midnight is a universal reference point
 * 3. Idempotency - multiple runs on same day start from same point
 *
 * @returns Unix timestamp in milliseconds for 00:00:00 UTC, or null if no contacts exist
 */
async function getLastSyncTimestamp(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  // Query for the maximum lastmodifieddate (HubSpot's modification timestamp)
  const { data, error } = await supabase
    .from('contacts')
    .select('lastmodifieddate')
    .eq('user_id', userId)
    .not('lastmodifieddate', 'is', null)
    .order('lastmodifieddate', { ascending: false })
    .limit(1)
    .single()

  if (error || !data?.lastmodifieddate) {
    return null
  }

  // HubSpot stores timestamps as ISO strings or Unix ms - handle both
  const timestamp = data.lastmodifieddate
  let rawTimestamp: number | null = null

  if (typeof timestamp === 'string') {
    // ISO string format: "2024-11-29T21:00:00.000Z"
    rawTimestamp = new Date(timestamp).getTime()
  } else if (typeof timestamp === 'number') {
    rawTimestamp = timestamp
  }

  if (rawTimestamp === null) {
    return null
  }

  // IMPORTANT: Convert to start of day (midnight UTC) for safety margin
  return getStartOfDayUTC(rawTimestamp)
}

/**
 * Search for contacts modified since a given timestamp using HubSpot Search API
 * This is much faster than fetching all contacts for incremental syncs
 *
 * NOTE: HubSpot Search API has a limit of 10,000 total results.
 * If more contacts were modified, caller should fall back to full sync.
 *
 * @param sinceTimestamp - Unix timestamp in milliseconds
 */
async function searchModifiedContacts(
  accessToken: string,
  sinceTimestamp: number,
  after?: string
): Promise<ContactsResponse> {
  return retryWithBackoff(async () => {
    const searchBody: Record<string, any> = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'lastmodifieddate',
              operator: 'GTE',
              value: sinceTimestamp.toString(),
            },
          ],
        },
      ],
      properties: CONTACT_PROPERTIES,
      limit: HUBSPOT_BATCH_SIZE,
      sorts: [
        {
          propertyName: 'lastmodifieddate',
          direction: 'ASCENDING',
        },
      ],
    }

    // Add pagination cursor if provided
    if (after) {
      searchBody.after = after
    }

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await sleep(waitTime)
      throw new Error('Rate limited - will retry')
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot Search API Error ${response.status}: ${errorText}`)
    }

    return await response.json()
  })
}

/**
 * UPSERT contacts to Supabase
 *
 * Uses onConflict to handle both INSERT (new) and UPDATE (existing) in one operation.
 * REQUIRES: UNIQUE constraint on (hubspot_contact_id, user_id)
 *
 * NOTE: We no longer set the `id` field - PostgreSQL auto-generates UUIDs.
 * This eliminates any possibility of PRIMARY KEY conflicts.
 */
async function upsertContacts(
  supabase: SupabaseClient,
  records: Record<string, any>[]
): Promise<{ success: number; failed: number }> {
  if (records.length === 0) {
    return { success: 0, failed: 0 }
  }

  // Deduplicate records by hubspot_contact_id to prevent duplicate processing
  // (HubSpot cursor pagination can return duplicates if data changes during sync)
  const uniqueRecordsMap = new Map<string, Record<string, any>>()
  for (const record of records) {
    // Keep the latest version (last occurrence wins)
    // Use hubspot_contact_id as the deduplication key (not `id` which we no longer set)
    uniqueRecordsMap.set(record.hubspot_contact_id, record)
  }
  const uniqueRecords = Array.from(uniqueRecordsMap.values())
  const duplicatesRemoved = records.length - uniqueRecords.length
  if (duplicatesRemoved > 0) {
    console.log(`[All Contacts Sync] Removed ${duplicatesRemoved} duplicate records from batch`)
  }

  let successCount = 0
  let failedCount = 0

  // Process in batches
  for (let i = 0; i < uniqueRecords.length; i += SUPABASE_BATCH_SIZE) {
    const batch = uniqueRecords.slice(i, i + SUPABASE_BATCH_SIZE)

    try {
      await retryWithBackoff(async () => {
        const result = await supabase
          .from('contacts')
          .upsert(batch, {
            onConflict: 'hubspot_contact_id,user_id',
            ignoreDuplicates: false, // We want to UPDATE on conflict
          })

        if (result.error) throw result.error
        return result
      })

      successCount += batch.length
    } catch (error: any) {
      // Log the full error details for debugging
      console.error(`[All Contacts Sync] Batch upsert failed:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        // Log first record's keys to debug schema mismatch
        firstRecordKeys: batch[0] ? Object.keys(batch[0]) : [],
      })
      failedCount += batch.length
    }
  }

  return { success: successCount, failed: failedCount }
}

