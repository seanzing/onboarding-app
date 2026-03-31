/**
 * Foursquare Bulk Audit Script
 *
 * READ-ONLY audit that produces a CSV report for review before any bulk push.
 * Does NOT create or modify any Foursquare listings.
 *
 * For each Discover/Boost/Dominate customer:
 *   1. Queries HubSpot for deals matching those names
 *   2. Resolves deal → contact associations
 *   3. Checks data completeness (name, address, phone, etc.)
 *   4. Searches Google Places for a match (gets lat/lng, hours, categories)
 *   5. Searches Foursquare for an existing listing
 *   6. Produces a recommendation: CREATE, LINK, or SKIP
 *
 * Usage:
 *   npx tsx scripts/audit/foursquare-bulk-audit.ts
 *   npx tsx scripts/audit/foursquare-bulk-audit.ts --dry-run    # skip external API calls
 *   npx tsx scripts/audit/foursquare-bulk-audit.ts --limit 5    # only process first N
 *
 * Output:
 *   scripts/audit/foursquare-audit-YYYY-MM-DD.csv
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   HUBSPOT_ACCESS_TOKEN
 *   GOOGLE_PLACES_API_KEY
 *   FOURSQUARE_SERVICE_ACCOUNT_KEY (or FOURSQUARE_API_KEY)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

// ─── Configuration ───────────────────────────────────────────

const DEAL_PATTERNS = ['discover', 'boost', 'dominate']

const GOOGLE_PLACES_BASE = 'https://places.googleapis.com/v1'
const FOURSQUARE_BASE = 'https://places-api.foursquare.com/places'
const FSQ_VERSION = '2025-06-17'

const DELAY_BETWEEN_CONTACTS_MS = 500
const DELAY_BETWEEN_API_CALLS_MS = 200

// HubSpot contact properties to fetch
const CONTACT_PROPERTIES = [
  'firstname', 'lastname', 'company', 'email', 'phone',
  'address', 'city', 'state', 'zip', 'website',
]

// ─── Types ───────────────────────────────────────────────────

interface ContactInfo {
  hubspot_id: string
  firstname: string
  lastname: string
  company: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  website: string
  deal_name: string
}

interface AuditRow extends ContactInfo {
  data_complete: string
  missing_fields: string
  google_match: string
  google_place_id: string
  google_name: string
  google_address: string
  google_has_hours: string
  google_has_coords: string
  google_rating: string
  foursquare_match: string
  foursquare_id: string
  foursquare_name: string
  recommendation: string
  notes: string
}

// ─── Helpers ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getBusinessName(c: ContactInfo): string {
  if (c.company) return c.company
  const name = [c.firstname, c.lastname].filter(Boolean).join(' ')
  return name || c.email || `Contact ${c.hubspot_id}`
}

function isValidWebsite(url: string | null | undefined): boolean {
  if (!url) return false
  const trimmed = url.trim().toLowerCase()
  // Reject obvious junk
  if (trimmed.length < 6) return false
  if (['na', 'n/a', 'none', 'http://na', 'https://na', 'http://n/a'].includes(trimmed)) return false
  // Must look like a URL or domain
  if (trimmed.includes(' ')) return false
  if (!trimmed.includes('.')) return false
  return true
}

function checkCompleteness(c: ContactInfo): { complete: boolean; missing: string[] } {
  const missing: string[] = []
  if (!c.company && !c.firstname) missing.push('name')
  if (!c.address) missing.push('address')
  if (!c.city) missing.push('city')
  if (!c.state) missing.push('state')
  if (!c.phone) missing.push('phone')
  if (!isValidWebsite(c.website)) missing.push('website')
  return { complete: missing.length === 0, missing }
}

function escapeCSV(val: string): string {
  if (!val) return ''
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

// ─── HubSpot: Fetch Deals ────────────────────────────────────

interface DealInfo {
  name: string
  dealType: string
  dudaSiteCode: string
}

async function fetchMatchingDeals(accessToken: string): Promise<Map<string, DealInfo>> {
  // Returns Map<dealId, DealInfo> for deals matching our patterns
  // Uses HubSpot search filters to only fetch matching deals server-side
  const dealMap = new Map<string, DealInfo>()

  console.log('  Fetching deals from HubSpot (filtered by dealtype)...')

  // First, get all dealtype enum values that match our patterns
  const propsRes = await fetch('https://api.hubapi.com/crm/v3/properties/deals/dealtype', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!propsRes.ok) throw new Error(`Failed to fetch dealtype property: ${propsRes.status}`)

  const propsData = await propsRes.json()
  const allOptions: { label: string; value: string }[] = propsData.options || []

  const matchingValues = allOptions
    .filter(o => DEAL_PATTERNS.some(p => o.label.toLowerCase().includes(p)))
    .map(o => o.value)

  console.log(`  Found ${matchingValues.length} matching dealtype values:`)
  for (const v of matchingValues) {
    const label = allOptions.find(o => o.value === v)?.label || v
    console.log(`    - ${label}`)
  }
  console.log()

  if (matchingValues.length === 0) {
    console.log('  No matching dealtype values found.')
    return dealMap
  }

  // HubSpot search allows up to 3 filter groups, each with multiple filters
  // We need one IN filter per batch of values (max ~20 per filter for safety)
  // But HubSpot supports IN via multiple EQ filters in separate filterGroups (OR logic)
  // Simpler: run one search per dealtype value
  for (const dealTypeValue of matchingValues) {
    let after: string | undefined
    let pages = 0

    do {
      pages++
      const payload: any = {
        limit: 100,
        properties: ['dealname', 'dealtype', 'duda_site_code'],
        filterGroups: [{
          filters: [{
            propertyName: 'dealtype',
            operator: 'EQ',
            value: dealTypeValue,
          }],
        }],
      }
      if (after) payload.after = after

      const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000
        console.log(`  Rate limited, waiting ${waitMs / 1000}s...`)
        await sleep(waitMs)
        continue
      }

      if (!response.ok) {
        throw new Error(`HubSpot Deals API ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()

      for (const deal of data.results || []) {
        const dealType = deal.properties?.dealtype || ''
        const dealName = deal.properties?.dealname || ''
        const dudaSiteCode = deal.properties?.duda_site_code || ''
        dealMap.set(deal.id, { name: dealName, dealType, dudaSiteCode })
      }

      after = data.paging?.next?.after
      await sleep(150)
    } while (after && pages < 200)
  }

  process.stdout.write(`\r  Found ${dealMap.size} matching deals total                                    \n`)
  return dealMap
}

// ─── HubSpot: Resolve Deal → Contact Associations ────────────

async function resolveDealContacts(
  accessToken: string,
  dealIds: string[]
): Promise<Map<string, string[]>> {
  // Returns Map<dealId, contactId[]>
  const result = new Map<string, string[]>()

  // Batch in groups of 100 (HubSpot limit)
  for (let i = 0; i < dealIds.length; i += 100) {
    const batch = dealIds.slice(i, i + 100)

    const response = await fetch(
      'https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/read',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: batch.map(id => ({ id })),
        }),
      }
    )

    if (!response.ok) {
      console.error(`  Warning: Failed to fetch associations batch: ${response.status}`)
      continue
    }

    const data = await response.json()
    for (const item of data.results || []) {
      const dealId = item.from?.id
      const contactIds = (item.to || []).map((t: any) => t.toObjectId?.toString())
      if (dealId && contactIds.length > 0) {
        result.set(dealId, contactIds)
      }
    }

    await sleep(150)
  }

  return result
}

// ─── HubSpot: Fetch Contact Details ──────────────────────────

async function fetchContacts(
  accessToken: string,
  contactIds: string[]
): Promise<Map<string, Record<string, string>>> {
  // Returns Map<contactId, properties>
  const result = new Map<string, Record<string, string>>()

  for (let i = 0; i < contactIds.length; i += 100) {
    const batch = contactIds.slice(i, i + 100)

    const response = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/batch/read',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: batch.map(id => ({ id })),
          properties: CONTACT_PROPERTIES,
        }),
      }
    )

    if (!response.ok) {
      console.error(`  Warning: Failed to fetch contacts batch: ${response.status}`)
      continue
    }

    const data = await response.json()
    for (const contact of data.results || []) {
      result.set(contact.id, contact.properties || {})
    }

    await sleep(150)
  }

  return result
}

// ─── Google Places Search ────────────────────────────────────

async function searchGooglePlaces(
  name: string,
  city: string | null,
  state: string | null,
  apiKey: string
): Promise<{
  placeId: string; name: string; address: string
  hasHours: boolean; hasCoords: boolean; rating: string
} | null> {
  const query = [name, city, state].filter(Boolean).join(' ')

  const fieldMask = [
    'places.id', 'places.displayName', 'places.formattedAddress',
    'places.location', 'places.regularOpeningHours',
    'places.rating', 'places.userRatingCount',
  ].join(',')

  const response = await fetch(`${GOOGLE_PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  })

  if (!response.ok) throw new Error(`Google Places ${response.status}`)

  const data = await response.json()
  const place = data.places?.[0]
  if (!place) return null

  return {
    placeId: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    hasHours: !!place.regularOpeningHours,
    hasCoords: !!place.location?.latitude,
    rating: place.rating ? `${place.rating} (${place.userRatingCount || 0})` : '',
  }
}

// ─── Foursquare Search ───────────────────────────────────────

async function searchFoursquare(
  name: string, address: string | null, city: string | null,
  state: string | null, zip: string | null, apiKey: string
): Promise<{ matchType: 'exact' | 'fuzzy' | 'none'; venueId: string; venueName: string }> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'X-Places-Api-Version': FSQ_VERSION,
  }

  // Phase 1: Exact match
  if (address && city) {
    const matchParams = new URLSearchParams({ name, address, city, cc: 'US' })
    if (state) matchParams.set('state', state)
    if (zip) matchParams.set('postalCode', zip)

    try {
      const res = await fetch(`${FOURSQUARE_BASE}/match?${matchParams}`, { headers })
      if (res.ok) {
        const data = await res.json()
        if (data?.place?.fsq_place_id) {
          return { matchType: 'exact', venueId: data.place.fsq_place_id, venueName: data.place.name || name }
        }
      }
    } catch { /* fall through */ }
    await sleep(DELAY_BETWEEN_API_CALLS_MS)
  }

  // Phase 2: Fuzzy search
  const searchParams = new URLSearchParams({ query: name, limit: '3' })
  const near = [city, state].filter(Boolean).join(', ')
  if (near) searchParams.set('near', near)

  const res = await fetch(`${FOURSQUARE_BASE}/search?${searchParams}`, { headers })
  if (!res.ok) throw new Error(`Foursquare ${res.status}`)

  const results = (await res.json())?.results || []
  if (results.length === 0) return { matchType: 'none', venueId: '', venueName: '' }

  const top = results[0]
  const topLower = (top.name || '').toLowerCase()
  const nameLower = name.toLowerCase()
  const isMatch = topLower.includes(nameLower) || nameLower.includes(topLower)

  return isMatch
    ? { matchType: 'fuzzy', venueId: top.fsq_place_id || '', venueName: top.name }
    : { matchType: 'none', venueId: '', venueName: '' }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0

  console.log('='.repeat(70))
  console.log('  FOURSQUARE BULK AUDIT')
  console.log('  Read-only — no listings will be created or modified')
  console.log('='.repeat(70))
  console.log()

  if (dryRun) console.log('  MODE: Dry run (skip Google/Foursquare API calls)\n')
  if (limit) console.log(`  LIMIT: ${limit} contacts\n`)

  // ─── Validate env vars ───────────────────────────────────

  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
  const fsqApiKey = process.env.FOURSQUARE_SERVICE_ACCOUNT_KEY || process.env.FOURSQUARE_API_KEY

  if (!hubspotToken) { console.error('ERROR: Missing HUBSPOT_ACCESS_TOKEN'); process.exit(1) }
  if (!supabaseUrl || !supabaseKey) { console.error('ERROR: Missing Supabase credentials'); process.exit(1) }
  if (!dryRun && !googleApiKey) { console.error('ERROR: Missing GOOGLE_PLACES_API_KEY (use --dry-run to skip)'); process.exit(1) }
  if (!dryRun && !fsqApiKey) { console.error('ERROR: Missing FOURSQUARE_API_KEY (use --dry-run to skip)'); process.exit(1) }

  // ─── Step 1: Get matching deals from HubSpot ─────────────

  const dealMap = await fetchMatchingDeals(hubspotToken)
  if (dealMap.size === 0) {
    console.log('\n  No deals found matching Discover/Boost/Dominate.')
    process.exit(0)
  }

  // ─── Step 2: Resolve deal → contact associations ─────────

  console.log('  Resolving deal-to-contact associations...')
  const dealContactMap = await resolveDealContacts(hubspotToken, [...dealMap.keys()])

  // Build contact → deal info map (one contact may have multiple deals, take first)
  const contactDealMap = new Map<string, string>()
  const contactDudaCodeMap = new Map<string, string>()
  for (const [dealId, contactIds] of dealContactMap) {
    const dealInfo = dealMap.get(dealId)
    const dealName = dealInfo?.name || ''
    const dudaCode = dealInfo?.dudaSiteCode || ''
    for (const contactId of contactIds) {
      if (!contactDealMap.has(contactId)) {
        contactDealMap.set(contactId, `${dealName} [${dealInfo?.dealType || ''}]`)
      }
      if (dudaCode && !contactDudaCodeMap.has(contactId)) {
        contactDudaCodeMap.set(contactId, dudaCode)
      }
    }
  }

  console.log(`  Found ${contactDealMap.size} unique contacts across ${dealMap.size} deals\n`)

  if (contactDealMap.size === 0) {
    console.log('  No contacts associated with matching deals.')
    process.exit(0)
  }

  // ─── Step 3: Fetch contact details from HubSpot ──────────

  let contactIds = [...contactDealMap.keys()]
  if (limit) contactIds = contactIds.slice(0, limit)

  console.log(`  Fetching ${contactIds.length} contact details from HubSpot...`)
  const contactPropsMap = await fetchContacts(hubspotToken, contactIds)

  // Build ContactInfo array
  const contacts: ContactInfo[] = []
  for (const [contactId, props] of contactPropsMap) {
    contacts.push({
      hubspot_id: contactId,
      firstname: props.firstname || '',
      lastname: props.lastname || '',
      company: props.company || '',
      email: props.email || '',
      phone: props.phone || '',
      address: props.address || '',
      city: props.city || '',
      state: props.state || '',
      zip: props.zip || '',
      website: props.website || '',
      deal_name: contactDealMap.get(contactId) || '',
    })
  }

  console.log(`  Loaded ${contacts.length} contacts\n`)

  // ─── Step 4: Check existing service links & resolve websites via Duda ──

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: existingIdentities } = await supabase
    .from('service_identity_map')
    .select('hubspot_contact_id, foursquare_venue_id, google_place_id, duda_site_code')
    .in('hubspot_contact_id', contactIds)

  const identityMap = new Map<string, { fsq: string | null; gp: string | null; duda: string | null }>()
  for (const row of existingIdentities || []) {
    identityMap.set(row.hubspot_contact_id, {
      fsq: row.foursquare_venue_id,
      gp: row.google_place_id,
      duda: row.duda_site_code,
    })
  }

  // Resolve real website URLs from Duda for contacts that have a site code
  // Sources: 1) HubSpot deal's duda_site_code, 2) service_identity_map
  const dudaUser = process.env.DUDA_API_USER
  const dudaPass = process.env.DUDA_API_PASSWORD
  const dudaWebsiteMap = new Map<string, string>()

  if (dudaUser && dudaPass) {
    const dudaAuth = 'Basic ' + Buffer.from(`${dudaUser}:${dudaPass}`).toString('base64')
    const siteCodes = new Set<string>()
    // Collect from HubSpot deals (primary source)
    for (const [contactId, code] of contactDudaCodeMap) {
      siteCodes.add(code)
    }
    // Also collect from identity map (fallback)
    for (const [contactId, identity] of identityMap) {
      if (identity.duda) siteCodes.add(identity.duda)
    }

    if (siteCodes.size > 0) {
      console.log(`  Resolving ${siteCodes.size} website URLs from Duda...`)
      let resolved = 0

      for (const siteCode of siteCodes) {
        try {
          const res = await fetch(`https://api.duda.co/api/sites/multiscreen/${siteCode}`, {
            headers: { Authorization: dudaAuth },
          })
          if (res.ok) {
            const site = await res.json()
            const url = site.canonical_url || (site.site_domain ? `https://${site.site_domain}` : null)
            if (url) {
              dudaWebsiteMap.set(siteCode, url)
              resolved++
            }
          }
          await sleep(100) // Duda rate limiting
        } catch { /* skip */ }
      }

      console.log(`  Resolved ${resolved}/${siteCodes.size} Duda site URLs\n`)
    }
  } else {
    console.log('  Warning: DUDA_API_USER/PASSWORD not set — cannot resolve published website URLs\n')
  }

  // Patch contact website fields with Duda URLs
  // Priority: deal-level duda_site_code > identity map duda_site_code > HubSpot website
  for (const contact of contacts) {
    // Try deal-level code first
    const dealCode = contactDudaCodeMap.get(contact.hubspot_id)
    if (dealCode) {
      const dudaUrl = dudaWebsiteMap.get(dealCode)
      if (dudaUrl) { contact.website = dudaUrl; continue }
    }
    // Fall back to identity map code
    const identity = identityMap.get(contact.hubspot_id)
    if (identity?.duda) {
      const dudaUrl = dudaWebsiteMap.get(identity.duda)
      if (dudaUrl) { contact.website = dudaUrl; continue }
    }
    // Otherwise keep whatever HubSpot had (will be validated by completeness check)
  }

  // ─── Step 5: Audit each contact ──────────────────────────

  const auditRows: AuditRow[] = []
  let processed = 0
  const stats = { create: 0, linkExact: 0, linkFuzzy: 0, skip: 0, review: 0, alreadyLinked: 0 }

  console.log('  Processing contacts:')
  console.log('  ' + '-'.repeat(66))

  for (const contact of contacts) {
    processed++
    const bizName = getBusinessName(contact)
    const progress = `[${processed}/${contacts.length}]`
    process.stdout.write(`  ${progress} ${bizName.substring(0, 38).padEnd(40)} `)

    // Already on Foursquare?
    const existing = identityMap.get(contact.hubspot_id)
    if (existing?.fsq) {
      stats.alreadyLinked++
      console.log('ALREADY LINKED')
      auditRows.push({
        ...contact, business_name: bizName,
        data_complete: 'Yes', missing_fields: '',
        google_match: 'Skipped', google_place_id: existing.gp || '', google_name: '', google_address: '',
        google_has_hours: '', google_has_coords: '', google_rating: '',
        foursquare_match: 'Exact', foursquare_id: existing.fsq, foursquare_name: '',
        recommendation: 'ALREADY_LINKED', notes: 'Already linked to Foursquare',
      })
      continue
    }

    // Data completeness
    const { complete, missing } = checkCompleteness(contact)
    if (!complete && missing.includes('name')) {
      stats.skip++
      console.log('SKIP (no name)')
      auditRows.push({
        ...contact, business_name: bizName,
        data_complete: 'No', missing_fields: missing.join(', '),
        google_match: 'Skipped', google_place_id: '', google_name: '', google_address: '',
        google_has_hours: '', google_has_coords: '', google_rating: '',
        foursquare_match: 'Skipped', foursquare_id: '', foursquare_name: '',
        recommendation: 'SKIP', notes: `Missing: ${missing.join(', ')}`,
      })
      continue
    }

    // Google Places search
    let gResult: Awaited<ReturnType<typeof searchGooglePlaces>> = null
    let gError = ''
    if (!dryRun && googleApiKey) {
      try {
        gResult = await searchGooglePlaces(bizName, contact.city || null, contact.state || null, googleApiKey)
        await sleep(DELAY_BETWEEN_API_CALLS_MS)
      } catch (e: any) { gError = e.message }
    }

    // Foursquare search
    let fResult: Awaited<ReturnType<typeof searchFoursquare>> | null = null
    let fError = ''
    if (!dryRun && fsqApiKey) {
      try {
        fResult = await searchFoursquare(
          bizName, contact.address || null, contact.city || null,
          contact.state || null, contact.zip || null, fsqApiKey
        )
        await sleep(DELAY_BETWEEN_API_CALLS_MS)
      } catch (e: any) { fError = e.message }
    }

    // Recommendation
    let rec: string
    let notes = ''

    if (gError || fError) {
      rec = 'ERROR'; notes = [gError, fError].filter(Boolean).join('; '); stats.skip++
    } else if (dryRun) {
      rec = complete ? 'REVIEW' : 'SKIP'; notes = 'Dry run'; complete ? stats.review++ : stats.skip++
      if (!complete) notes += ` — missing: ${missing.join(', ')}`
    } else if (fResult?.matchType === 'exact') {
      rec = 'LINK_EXACT'; notes = `Exact match: ${fResult.venueName}`; stats.linkExact++
    } else if (fResult?.matchType === 'fuzzy') {
      rec = 'LINK_FUZZY'; notes = `Possible: "${fResult.venueName}" — verify`; stats.linkFuzzy++
    } else if (!complete) {
      rec = 'SKIP'; notes = `Missing: ${missing.join(', ')}`; stats.skip++
    } else if (gResult) {
      rec = 'CREATE'
      notes = gResult.hasCoords && gResult.hasHours
        ? 'Google data complete — ready'
        : `Google partial (coords: ${gResult.hasCoords ? 'Y' : 'N'}, hours: ${gResult.hasHours ? 'Y' : 'N'})`
      stats.create++
    } else {
      rec = 'REVIEW'; notes = 'No Google match — manual lookup needed'; stats.review++
    }

    console.log(rec)

    auditRows.push({
      ...contact, business_name: bizName,
      data_complete: complete ? 'Yes' : 'No', missing_fields: missing.join(', '),
      google_match: gError ? 'Error' : (dryRun ? 'Skipped' : (gResult ? 'Yes' : 'No')),
      google_place_id: gResult?.placeId || '', google_name: gResult?.name || '',
      google_address: gResult?.address || '',
      google_has_hours: gResult ? (gResult.hasHours ? 'Yes' : 'No') : '',
      google_has_coords: gResult ? (gResult.hasCoords ? 'Yes' : 'No') : '',
      google_rating: gResult?.rating || '',
      foursquare_match: fError ? 'Error' : (dryRun ? 'Skipped' : (fResult?.matchType === 'exact' ? 'Exact' : fResult?.matchType === 'fuzzy' ? 'Fuzzy' : 'None')),
      foursquare_id: fResult?.venueId || '', foursquare_name: fResult?.venueName || '',
      recommendation: rec, notes,
    })

    if (!dryRun) await sleep(DELAY_BETWEEN_CONTACTS_MS)
  }

  // ─── Write CSV ───────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0]
  const csvPath = join(__dirname, `foursquare-audit-${today}.csv`)

  const headers = [
    'HubSpot ID', 'Business Name', 'Deal Name', 'Email', 'Phone',
    'Address', 'City', 'State', 'ZIP', 'Website',
    'Data Complete', 'Missing Fields',
    'Google Match', 'Google Place ID', 'Google Name', 'Google Address',
    'Google Has Hours', 'Google Has Coords', 'Google Rating',
    'Foursquare Match', 'Foursquare ID', 'Foursquare Name',
    'Recommendation', 'Notes',
  ]

  const csvLines = [headers.join(',')]
  for (const row of auditRows) {
    csvLines.push([
      row.hubspot_id, row.business_name, row.deal_name, row.email, row.phone,
      row.address, row.city, row.state, row.zip, row.website,
      row.data_complete, row.missing_fields,
      row.google_match, row.google_place_id, row.google_name, row.google_address,
      row.google_has_hours, row.google_has_coords, row.google_rating,
      row.foursquare_match, row.foursquare_id, row.foursquare_name,
      row.recommendation, row.notes,
    ].map(escapeCSV).join(','))
  }

  writeFileSync(csvPath, csvLines.join('\n'), 'utf-8')

  // ─── Summary ─────────────────────────────────────────────

  console.log()
  console.log('='.repeat(70))
  console.log('  AUDIT SUMMARY')
  console.log('='.repeat(70))
  console.log()
  console.log(`  Total contacts:      ${contacts.length}`)
  console.log(`  Already linked:      ${stats.alreadyLinked}`)
  console.log(`  Ready to CREATE:     ${stats.create}`)
  console.log(`  LINK (exact match):  ${stats.linkExact}`)
  console.log(`  LINK (fuzzy — verify): ${stats.linkFuzzy}`)
  console.log(`  Needs REVIEW:        ${stats.review}`)
  console.log(`  SKIP:                ${stats.skip}`)
  console.log()
  console.log(`  CSV report: ${csvPath}`)
  console.log()
  console.log('  Next steps:')
  console.log('  1. Open the CSV and review each row')
  console.log('  2. Verify LINK_FUZZY matches are correct')
  console.log('  3. For REVIEW rows, manually find the Google Maps link')
  console.log('  4. Once satisfied, run the bulk push script with approved rows')
  console.log()
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err)
  process.exit(1)
})
