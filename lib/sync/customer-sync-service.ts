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
  dealBasedFetched: number
  dealBasedInserted: number
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

// ============================================================
// DEAL-BASED SYNC FUNCTIONS
// ============================================================

interface DealsResponse {
  results: Array<{ id: string; properties: Record<string, string> }>
  paging?: {
    next?: {
      after: string
    }
  }
}

/**
 * Fetch a page of ALL deals from HubSpot search API
 * Filters out deals where the name contains "Publishing Fee" (case-insensitive)
 */
async function fetchAllDealsPage(
  accessToken: string,
  after?: string
): Promise<DealsResponse> {
  return retryWithBackoff(async () => {
    const url = 'https://api.hubapi.com/crm/v3/objects/deals/search'

    const payload: any = {
      limit: HUBSPOT_BATCH_SIZE,
      properties: ['dealname'],
      filterGroups: [],
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

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000
      await sleep(waitTime)
      throw new Error('Rate limited - will retry')
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot Deals API Error ${response.status}: ${errorText}`)
    }

    const data: DealsResponse = await response.json()

    // Filter out "Publishing Fee" deals
    data.results = data.results.filter((deal) => {
      const name = deal.properties?.dealname || ''
      return !name.toLowerCase().includes('publishing fee')
    })

    return data
  })
}

/**
 * Batch fetch deal→contact associations using CRM v4 Associations API
 * Returns a map of dealId → contactId[]
 */
async function fetchDealContactAssociationsBatch(
  accessToken: string,
  dealIds: string[]
): Promise<Map<string, string[]>> {
  const dealContactMap = new Map<string, string[]>()

  if (dealIds.length === 0) return dealContactMap

  // Process in batches of 100 (API limit)
  for (let i = 0; i < dealIds.length; i += HUBSPOT_BATCH_SIZE) {
    const batch = dealIds.slice(i, i + HUBSPOT_BATCH_SIZE)

    try {
      const url = 'https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/read'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: batch.map(id => ({ id })),
        }),
      })

      if (!response.ok) {
        console.warn('[Sync] Failed to fetch deal→contact associations:', response.status)
        continue
      }

      const data = await response.json()

      for (const result of data.results || []) {
        const dealId = result.from?.id
        const contacts = result.to || []
        if (dealId && contacts.length > 0) {
          dealContactMap.set(
            dealId,
            contacts.map((c: any) => c.toObjectId)
          )
        }
      }
    } catch (error) {
      console.warn('[Sync] Error fetching deal→contact associations batch:', error)
    }

    // Rate limiting between batches
    if (i + HUBSPOT_BATCH_SIZE < dealIds.length) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  return dealContactMap
}

/**
 * Batch fetch full contact details by IDs using HubSpot batch read API
 */
async function fetchContactsBatch(
  accessToken: string,
  contactIds: string[]
): Promise<HubSpotContactType[]> {
  const allContacts: HubSpotContactType[] = []

  if (contactIds.length === 0) return allContacts

  // Process in batches of 100 (API limit)
  for (let i = 0; i < contactIds.length; i += HUBSPOT_BATCH_SIZE) {
    const batch = contactIds.slice(i, i + HUBSPOT_BATCH_SIZE)

    try {
      const result = await retryWithBackoff(async () => {
        const url = 'https://api.hubapi.com/crm/v3/objects/contacts/batch/read'

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: batch.map(id => ({ id })),
            properties: CONTACT_PROPERTIES,
          }),
        })

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000
          await sleep(waitTime)
          throw new Error('Rate limited - will retry')
        }

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HubSpot Batch Read Error ${response.status}: ${errorText}`)
        }

        return await response.json()
      })

      if (result.results) {
        allContacts.push(...result.results)
      }
    } catch (error) {
      console.error('[Sync] Error fetching contacts batch:', error)
    }

    // Rate limiting between batches
    if (i + HUBSPOT_BATCH_SIZE < contactIds.length) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  return allContacts
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
    dealBasedFetched: 0,
    dealBasedInserted: 0,
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

    // ============================================================
    // PASS 2: Deal-based sync — catch contacts with deals but wrong lifecycle stage
    // ============================================================
    console.log('[Sync] Starting deal-based sync pass...')

    let dealAfter: string | undefined
    let dealPageCount = 0
    // Store deal id + name for building contactId→dealName map
    const allDeals: Array<{ id: string; dealname: string }> = []

    // Step 1: Fetch all deals (paginated), keep deal names
    while (dealPageCount < maxPages) {
      const dealsResponse = await fetchAllDealsPage(hubspotAccessToken, dealAfter)
      const deals = dealsResponse.results

      if (!deals || deals.length === 0) break

      for (const d of deals) {
        allDeals.push({ id: d.id, dealname: d.properties?.dealname || '' })
      }

      if (!dealsResponse.paging?.next?.after) break
      dealAfter = dealsResponse.paging.next.after
      dealPageCount++
      await sleep(REQUEST_DELAY_MS)
    }

    console.log(`[Sync] Fetched ${allDeals.length} deals (excluding Publishing Fee)`)

    if (allDeals.length > 0) {
      const allDealIds = allDeals.map(d => d.id)
      // Build dealId→dealName lookup
      const dealNameMap = new Map<string, string>()
      for (const d of allDeals) {
        if (d.dealname) dealNameMap.set(d.id, d.dealname)
      }

      // Step 2: Batch-fetch deal→contact associations
      const dealContactMap = await fetchDealContactAssociationsBatch(hubspotAccessToken, allDealIds)

      // Step 3: Build contactId→dealName map (use first deal name found per contact)
      const contactDealNameMap = new Map<string, string>()
      for (const [dealId, contactIds] of Array.from(dealContactMap.entries())) {
        const dname = dealNameMap.get(dealId)
        if (!dname) continue
        for (const cid of contactIds) {
          if (!contactDealNameMap.has(cid)) {
            contactDealNameMap.set(cid, dname)
          }
        }
      }

      console.log(`[Sync] Mapped ${contactDealNameMap.size} contacts to deal names`)

      // Step 4: Collect new contact IDs not already in Supabase
      const newContactIdsFromDeals = new Set<string>()
      for (const contactIds of Array.from(dealContactMap.values())) {
        for (const cid of contactIds) {
          if (!existingIds.has(cid)) {
            newContactIdsFromDeals.add(cid)
          }
        }
      }

      stats.dealBasedFetched = newContactIdsFromDeals.size
      console.log(`[Sync] Found ${newContactIdsFromDeals.size} new contacts via deals`)

      // Step 5: Insert new contacts with deal names
      if (newContactIdsFromDeals.size > 0) {
        const contactIdArray = Array.from(newContactIdsFromDeals)
        const dealContacts = await fetchContactsBatch(hubspotAccessToken, contactIdArray)

        for (let i = 0; i < dealContacts.length; i += HUBSPOT_BATCH_SIZE) {
          const batch = dealContacts.slice(i, i + HUBSPOT_BATCH_SIZE)
          const batchIds = batch.map(c => c.id)
          const companyAssociations = await fetchCompanyAssociations(hubspotAccessToken, batchIds)
          const supabaseContacts = processContactsForSupabase(batch, userId, companyAssociations)

          // Attach deal names to new contacts
          for (const sc of supabaseContacts) {
            const dname = contactDealNameMap.get(sc.id)
            if (dname) sc.dealname = dname
          }

          const { inserted, failed } = await insertNewContacts(supabase, supabaseContacts)
          stats.dealBasedInserted += inserted
          stats.failed += failed
          batch.forEach(c => existingIds.add(c.id))
        }
      }

      // Step 6: Update existing contacts with deal names (batch update)
      const existingContactsToUpdate = Array.from(contactDealNameMap.entries())
        .filter(([cid]) => existingIds.has(cid))
      if (existingContactsToUpdate.length > 0) {
        console.log(`[Sync] Updating ${existingContactsToUpdate.length} existing contacts with deal names`)
        for (let i = 0; i < existingContactsToUpdate.length; i += SUPABASE_BATCH_SIZE) {
          const batch = existingContactsToUpdate.slice(i, i + SUPABASE_BATCH_SIZE)
          for (const [contactId, dealname] of batch) {
            try {
              await supabase
                .from('contacts')
                .update({ dealname })
                .eq('id', contactId)
            } catch (error) {
              console.warn(`[Sync] Failed to update dealname for contact ${contactId}:`, error)
            }
          }
        }
      }
    }

    console.log(`[Sync] Deal-based sync complete: ${stats.dealBasedInserted} new contacts inserted`)

    // Calculate duration
    const duration = formatDuration(Date.now() - startTime)

    const totalSynced = stats.newlyInserted + stats.dealBasedInserted

    // Log sync to database (customer_sync_logs table)
    await logSync(supabase, {
      sync_type: 'manual',
      status: 'success',
      contacts_synced: totalSynced,
      contacts_skipped: stats.alreadyExists,
      errors: stats.failed,
      duration_ms: Date.now() - startTime,
      triggered_by: userEmail,
    })

    console.log(`[Sync] Summary — lifecycle: ${stats.newlyInserted}, deal-based: ${stats.dealBasedInserted}, skipped: ${stats.alreadyExists}, errors: ${stats.failed}`)

    return {
      success: true,
      synced: totalSynced,
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
              values: ['customer', '946862144', '999377175'], // customer, DNC, Active
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

