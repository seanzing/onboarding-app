/**
 * Shared Customer Sync Service
 *
 * Core business logic for syncing HubSpot customers to Supabase.
 * Used by both API endpoints and manual scripts.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SyncResult, HubSpotContact as HubSpotContactType, SupabaseContact } from '@/app/types/sync'
import {
  authenticateSupabase,
  retryWithBackoff,
  sleep,
  formatDuration,
} from './utils'

// Configuration
const HUBSPOT_BATCH_SIZE = 100
const SUPABASE_BATCH_SIZE = 100
const REQUEST_DELAY_MS = 150

// Contact properties to fetch from HubSpot
const CONTACT_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'phone',
  'mobilephone',
  'company',
  'business_type',
  'business_category_type',
  'business_hours',
  'current_website',
  'website',
  'website_status',
  'address',
  'city',
  'state',
  'zip',
  'country',
  'active_customer',
  'gbp_ready',
  'published_status',
  'publishing_fee_paid',
  'completeness_score',
  'lifecyclestage',
  ...Array.from({ length: 50 }, (_, i) => `location_${i + 1}`),
  'createdate',
  'lastmodifieddate',
]

interface ContactsResponse {
  results: HubSpotContactType[]
  paging?: {
    next?: {
      after: string
    }
  }
}

interface SyncStats {
  totalFetched: number
  alreadyExists: number
  newlyInserted: number
  failed: number
  startTime: number
}

/**
 * Fetch company associations for a batch of contacts
 * Uses HubSpot CRM v4 Associations API
 */
async function fetchCompanyAssociations(
  accessToken: string,
  contactIds: string[]
): Promise<Map<string, string>> {
  const companyMap = new Map<string, string>()

  if (contactIds.length === 0) return companyMap

  try {
    // Use batch read for associations (up to 100 at a time)
    const url = 'https://api.hubapi.com/crm/v4/associations/contacts/companies/batch/read'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: contactIds.map(id => ({ id })),
      }),
    })

    if (!response.ok) {
      console.warn('[Sync] Failed to fetch company associations:', response.status)
      return companyMap
    }

    const data = await response.json()

    // Process results - each contact can have multiple company associations
    // We take the first (primary) company
    for (const result of data.results || []) {
      const contactId = result.from?.id
      const companies = result.to || []
      if (contactId && companies.length > 0) {
        // Take the first company as the primary association
        companyMap.set(contactId, companies[0].toObjectId)
      }
    }
  } catch (error) {
    console.warn('[Sync] Error fetching company associations:', error)
  }

  return companyMap
}

/**
 * Main sync function - syncs active customers from HubSpot to Supabase
 */
export async function syncHubSpotCustomers(
  hubspotAccessToken: string,
  supabaseUrl: string,
  supabaseKey: string,
  userEmail: string,
  userPassword: string
): Promise<SyncResult> {
  const startTime = Date.now()
  const stats: SyncStats = {
    totalFetched: 0,
    alreadyExists: 0,
    newlyInserted: 0,
    failed: 0,
    startTime,
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authenticate
    const userId = await authenticateSupabase(supabase, userEmail, userPassword)

    // Fetch existing contact IDs for deduplication
    const existingIds = await fetchExistingContactIds(supabase, userId)

    // Fetch customers from HubSpot and insert new ones
    let after: string | undefined
    let pageCount = 0
    const maxPages = 100 // Safety limit

    while (pageCount < maxPages) {
      // Fetch page of customers
      const response = await fetchCustomerContactsPage(hubspotAccessToken, after)
      const contacts = response.results

      if (!contacts || contacts.length === 0) {
        break
      }

      stats.totalFetched += contacts.length

      // Filter out existing contacts
      const newContacts = contacts.filter((contact) => !existingIds.has(contact.id))
      stats.alreadyExists += contacts.length - newContacts.length

      // Process and insert new contacts
      if (newContacts.length > 0) {
        // Fetch company associations for these contacts (Universal HubSpot ID Strategy)
        const contactIds = newContacts.map(c => c.id)
        const companyAssociations = await fetchCompanyAssociations(hubspotAccessToken, contactIds)

        const supabaseContacts = processContactsForSupabase(newContacts, userId, companyAssociations)
        const { inserted, failed } = await insertNewContacts(supabase, supabaseContacts)

        stats.newlyInserted += inserted
        stats.failed += failed

        // Add newly inserted IDs to the set
        newContacts.forEach((c) => existingIds.add(c.id))
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

    // Log sync to database (customer_sync_logs table)
    await logSync(supabase, {
      sync_type: 'manual',
      status: 'success',
      contacts_synced: stats.newlyInserted,
      contacts_skipped: stats.alreadyExists,
      errors: stats.failed,
      duration_ms: Date.now() - startTime,
      triggered_by: userEmail,
    })

    return {
      success: true,
      synced: stats.newlyInserted,
      skipped: stats.alreadyExists,
      errors: stats.failed,
      duration,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    const duration = formatDuration(Date.now() - startTime)

    return {
      success: false,
      synced: stats.newlyInserted,
      skipped: stats.alreadyExists,
      errors: stats.failed + 1,
      duration,
      timestamp: new Date().toISOString(),
      errorMessage: error.message || 'Unknown error occurred',
    }
  }
}

/**
 * Fetch existing contact IDs from Supabase for deduplication
 */
async function fetchExistingContactIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const existingIds = new Set<string>()
  let from = 0
  const batchSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .range(from, from + batchSize - 1)

    if (error) {
      throw new Error(`Failed to fetch existing IDs: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    data.forEach((row) => existingIds.add(row.id))
    from += batchSize

    if (data.length < batchSize) {
      break
    }
  }

  return existingIds
}

/**
 * Fetch a page of customer contacts from HubSpot
 * Fetches contacts where lifecyclestage is customer, dnc, or active
 */
async function fetchCustomerContactsPage(
  accessToken: string,
  after?: string
): Promise<ContactsResponse> {
  return retryWithBackoff(async () => {
    const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search'

    const payload: any = {
      limit: HUBSPOT_BATCH_SIZE,
      properties: CONTACT_PROPERTIES,
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'lifecyclestage',
              operator: 'IN',
              values: ['customer', 'dnc', 'active'],
            },
          ],
        },
      ],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
    }

    if (after) {
      payload.after = after
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
 * Process contacts for Supabase format
 * Uses contact ID (hs_object_id) as the universal identifier
 * Now includes hubspot_company_id from associations (Universal HubSpot ID Strategy)
 */
function processContactsForSupabase(
  contacts: HubSpotContactType[],
  userId: string,
  companyAssociations?: Map<string, string>
): SupabaseContact[] {
  return contacts.map((contact) => {
    const props = contact.properties

    // Extract location fields
    const locations: Record<string, string> = {}
    for (let i = 1; i <= 50; i++) {
      const locationKey = `location_${i}`
      const locationValue = props[locationKey]
      if (locationValue) {
        locations[locationKey] = locationValue
      }
    }

    const completenessScore = props.completeness_score
      ? parseInt(props.completeness_score, 10)
      : undefined

    // Get associated company ID (Universal HubSpot ID Strategy)
    const hubspotCompanyId = companyAssociations?.get(contact.id) || undefined

    return {
      id: contact.id,
      hs_object_id: contact.id,
      // ✅ CRITICAL: Use contact ID for universal linkage across all integrations
      hubspot_contact_id: contact.id,
      // ✅ Universal HubSpot ID Strategy: Link to company for cross-integration queries
      hubspot_company_id: hubspotCompanyId,
      firstname: props.firstname || undefined,
      lastname: props.lastname || undefined,
      email: props.email || undefined,
      phone: props.phone || undefined,
      mobilephone: props.mobilephone || undefined,
      company: props.company || undefined,
      business_type: props.business_type || undefined,
      business_category_type: props.business_category_type || undefined,
      business_hours: props.business_hours || undefined,
      current_website: props.current_website || undefined,
      website: props.website || undefined,
      website_status: props.website_status || undefined,
      address: props.address || undefined,
      city: props.city || undefined,
      state: props.state || undefined,
      zip: props.zip || undefined,
      country: props.country || undefined,
      locations: Object.keys(locations).length > 0 ? locations : undefined,
      active_customer: props.active_customer || undefined,
      gbp_ready: props.gbp_ready || undefined,
      published_status: props.published_status || undefined,
      publishing_fee_paid: props.publishing_fee_paid || undefined,
      completeness_score: completenessScore,
      lifecyclestage: props.lifecyclestage || undefined,
      createdate: props.createdate || undefined,
      lastmodifieddate: props.lastmodifieddate || undefined,
      synced_at: new Date().toISOString(),
      user_id: userId,
    }
  })
}

/**
 * Insert new contacts to Supabase
 */
async function insertNewContacts(
  supabase: SupabaseClient,
  contacts: SupabaseContact[]
): Promise<{ inserted: number; failed: number }> {
  if (contacts.length === 0) {
    return { inserted: 0, failed: 0 }
  }

  let insertedCount = 0
  let failedCount = 0

  // Process in batches
  for (let i = 0; i < contacts.length; i += SUPABASE_BATCH_SIZE) {
    const batch = contacts.slice(i, i + SUPABASE_BATCH_SIZE)

    try {
      await retryWithBackoff(async () => {
        const result = await supabase.from('contacts').insert(batch)
        if (result.error) throw result.error
        return result
      })

      insertedCount += batch.length
    } catch (error: any) {
      console.error(`Failed to insert batch:`, error.message)
      failedCount += batch.length
    }
  }

  return { inserted: insertedCount, failed: failedCount }
}

/**
 * Log sync to database (customer_sync_logs table)
 */
async function logSync(
  supabase: SupabaseClient,
  logData: {
    sync_type: 'manual' | 'automated'
    status: 'success' | 'error'
    contacts_synced: number
    contacts_skipped: number
    errors: number
    duration_ms: number
    triggered_by: string
    error_message?: string
  }
) {
  try {
    await supabase.from('customer_sync_logs').insert({
      ...logData,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to log sync:', error)
  }
}

