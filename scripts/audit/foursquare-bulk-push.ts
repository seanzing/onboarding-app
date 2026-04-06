/**
 * Foursquare Bulk Push Script
 *
 * Reads the merged audit CSV and processes CREATE and LINK_EXACT rows:
 *   - CREATE: creates a new Foursquare venue using data from the audit
 *   - LINK_EXACT: links the existing Foursquare venue to the contact
 *
 * For each successful action:
 *   - Updates service_identity_map.foursquare_venue_id
 *   - Updates service_identity_map.google_place_id (if not already set)
 *   - Updates onboarding_status for 'foursquare' service
 *
 * Safety features:
 *   - Dry-run mode (no writes)
 *   - --limit to process only N rows
 *   - --only CREATE|LINK_EXACT to filter by action
 *   - --resume-from <row> to skip already-processed rows
 *   - Logs every action to a timestamped log file
 *   - Skips rows that already have a foursquare_venue_id in Supabase
 *   - Rate limits API calls
 *
 * Usage:
 *   npx tsx scripts/audit/foursquare-bulk-push.ts --dry-run
 *   npx tsx scripts/audit/foursquare-bulk-push.ts --limit 10
 *   npx tsx scripts/audit/foursquare-bulk-push.ts --only LINK_EXACT
 *   npx tsx scripts/audit/foursquare-bulk-push.ts --resume-from 50
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_PLACES_API_KEY (for enriching CREATE rows with lat/lng, hours)
 *   FOURSQUARE_SERVICE_ACCOUNT_KEY (for venue creation)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, appendFileSync } from 'fs'
import { join } from 'path'

// ─── Configuration ───────────────────────────────────────────

const CSV_PATH = 'scripts/audit/foursquare-audit-2026-04-06-merged.csv'

const FSQ_CREATE_URL = 'https://places-api.foursquare.com/places'
const GOOGLE_PLACES_BASE = 'https://places.googleapis.com/v1'
const FSQ_VERSION = '2025-06-17'

const DELAY_BETWEEN_PUSHES_MS = 500
const MAX_RETRIES = 3

// ─── Types ───────────────────────────────────────────────────

interface AuditRow {
  'HubSpot ID': string
  'Business Name': string
  'Deal Name': string
  'Email': string
  'Phone': string
  'Address': string
  'City': string
  'State': string
  'ZIP': string
  'Website': string
  'Data Complete': string
  'Missing Fields': string
  'Google Match': string
  'Google Place ID': string
  'Google Name': string
  'Google Address': string
  'Google Has Hours': string
  'Google Has Coords': string
  'Google Rating': string
  'Foursquare Match': string
  'Foursquare ID': string
  'Foursquare Name': string
  'Recommendation': string
  'Notes': string
}

interface PushResult {
  hubspot_id: string
  business_name: string
  action: 'CREATE' | 'LINK_EXACT'
  status: 'success' | 'skipped' | 'failed'
  foursquare_venue_id?: string
  google_place_id?: string
  error?: string
  details?: string
}

// ─── CSV Parsing ─────────────────────────────────────────────

function parseCSV(path: string): AuditRow[] {
  const content = readFileSync(path, 'utf-8')
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  // Properly handle quoted fields that may contain newlines
  for (const char of content) {
    if (char === '"') {
      inQuotes = !inQuotes
      current += char
    } else if (char === '\n' && !inQuotes) {
      lines.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) lines.push(current)

  if (lines.length < 2) return []

  const parseLine = (line: string): string[] => {
    const fields: string[] = []
    let field = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = !quoted
        }
      } else if (char === ',' && !quoted) {
        fields.push(field)
        field = ''
      } else {
        field += char
      }
    }
    fields.push(field)
    return fields
  }

  const headers = parseLine(lines[0])
  const rows: AuditRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: any = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || ''
    }
    rows.push(row as AuditRow)
  }

  return rows
}

// ─── Helpers ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function sanitizeWebsite(url: string): string {
  if (!url) return ''
  let u = url.trim()
  if (u.startsWith('https://https://')) u = u.slice('https://'.length)
  if (u.startsWith('http://http://')) u = u.slice('http://'.length)
  if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u
  return u
}

function sanitizePhone(phone: string): string {
  if (!phone) return ''
  // Keep digits and leading +
  const cleaned = phone.replace(/[^\d+]/g, '')
  return cleaned
}

// ─── Google Places: fetch rich details for CREATE ─────────────

async function fetchGooglePlaceDetails(placeId: string, apiKey: string) {
  const fields = [
    'id', 'displayName', 'formattedAddress', 'addressComponents',
    'location', 'websiteUri', 'nationalPhoneNumber',
    'regularOpeningHours', 'types', 'primaryType', 'primaryTypeDisplayName',
  ].join(',')

  const res = await fetch(`${GOOGLE_PLACES_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fields,
    },
  })

  if (!res.ok) {
    throw new Error(`Google Places details ${res.status}: ${await res.text()}`)
  }

  return res.json()
}

// ─── Foursquare: create new venue ────────────────────────────

async function createFoursquareVenue(
  payload: Record<string, unknown>,
  apiKey: string
): Promise<{ venueId: string; raw: any }> {
  const res = await fetch(FSQ_CREATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Places-Api-Version': FSQ_VERSION,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Foursquare create ${res.status}: ${errText}`)
  }

  const venue = await res.json()
  const venueId = venue.fsq_place_id || venue.fsq_id || venue.id
  if (!venueId) {
    throw new Error(`Foursquare returned no venue ID: ${JSON.stringify(venue)}`)
  }

  return { venueId, raw: venue }
}

// ─── Supabase: update identity map & status ──────────────────

async function updateSupabase(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  venueId: string,
  venueName: string,
  googlePlaceId: string | null,
  action: 'CREATE' | 'LINK_EXACT'
): Promise<void> {
  // Upsert service_identity_map
  const identityPayload: Record<string, any> = {
    hubspot_contact_id: contactId,
    foursquare_venue_id: venueId,
  }
  if (googlePlaceId) identityPayload.google_place_id = googlePlaceId

  const { error: identityError } = await supabase
    .from('service_identity_map')
    .upsert(identityPayload, { onConflict: 'hubspot_contact_id' })

  if (identityError) {
    throw new Error(`Supabase identity upsert: ${identityError.message}`)
  }

  // Upsert onboarding_status
  const { error: statusError } = await supabase
    .from('onboarding_status')
    .upsert({
      hubspot_contact_id: contactId,
      service: 'foursquare',
      status: 'active',
      provisioned_at: new Date().toISOString(),
      metadata: {
        venue_id: venueId,
        venue_name: venueName,
        bulk_push: true,
        action,
      },
    }, { onConflict: 'hubspot_contact_id,service' })

  if (statusError) {
    throw new Error(`Supabase status upsert: ${statusError.message}`)
  }
}

// ─── Process a single row ────────────────────────────────────

async function processRow(
  row: AuditRow,
  supabase: ReturnType<typeof createClient>,
  existingVenueIds: Set<string>,
  dryRun: boolean,
  googleApiKey: string,
  fsqApiKey: string
): Promise<PushResult> {
  const hubspotId = row['HubSpot ID'].trim()
  const businessName = row['Business Name'].trim()
  const action = row['Recommendation'] as 'CREATE' | 'LINK_EXACT'

  // Skip if already linked in Supabase
  if (existingVenueIds.has(hubspotId)) {
    return {
      hubspot_id: hubspotId,
      business_name: businessName,
      action,
      status: 'skipped',
      details: 'Already has foursquare_venue_id in Supabase',
    }
  }

  // ─── LINK_EXACT: just link the existing venue ──────────
  if (action === 'LINK_EXACT') {
    const venueId = row['Foursquare ID'].trim()
    const venueName = row['Foursquare Name'].trim() || businessName

    if (!venueId) {
      return {
        hubspot_id: hubspotId,
        business_name: businessName,
        action,
        status: 'failed',
        error: 'LINK_EXACT row missing Foursquare ID',
      }
    }

    if (dryRun) {
      return {
        hubspot_id: hubspotId,
        business_name: businessName,
        action,
        status: 'success',
        foursquare_venue_id: venueId,
        google_place_id: row['Google Place ID'].trim() || undefined,
        details: '[DRY RUN] Would link',
      }
    }

    try {
      await updateSupabase(
        supabase,
        hubspotId,
        venueId,
        venueName,
        row['Google Place ID'].trim() || null,
        action
      )
      return {
        hubspot_id: hubspotId,
        business_name: businessName,
        action,
        status: 'success',
        foursquare_venue_id: venueId,
        google_place_id: row['Google Place ID'].trim() || undefined,
        details: `Linked to "${venueName}"`,
      }
    } catch (err: any) {
      return {
        hubspot_id: hubspotId,
        business_name: businessName,
        action,
        status: 'failed',
        error: err.message,
      }
    }
  }

  // ─── CREATE: build payload and create new venue ────────
  if (action !== 'CREATE') {
    return {
      hubspot_id: hubspotId,
      business_name: businessName,
      action,
      status: 'skipped',
      details: `Unsupported action: ${action}`,
    }
  }

  const googlePlaceId = row['Google Place ID'].trim()
  if (!googlePlaceId) {
    return {
      hubspot_id: hubspotId,
      business_name: businessName,
      action,
      status: 'failed',
      error: 'CREATE row missing Google Place ID',
    }
  }

  // Fetch rich Google Place details for accurate data
  let googlePlace: any
  try {
    googlePlace = await fetchGooglePlaceDetails(googlePlaceId, googleApiKey)
  } catch (err: any) {
    return {
      hubspot_id: hubspotId,
      business_name: businessName,
      action,
      status: 'failed',
      error: `Google Places fetch: ${err.message}`,
    }
  }

  // Extract address components from Google (authoritative source)
  const addrComp: Record<string, string> = {}
  for (const comp of googlePlace.addressComponents || []) {
    if (comp.types.includes('street_number')) addrComp.streetNumber = comp.longText
    if (comp.types.includes('route')) addrComp.street = comp.longText
    if (comp.types.includes('locality')) addrComp.city = comp.longText
    if (comp.types.includes('administrative_area_level_1')) addrComp.state = comp.shortText
    if (comp.types.includes('postal_code')) addrComp.zipCode = comp.longText
  }

  // Build Foursquare payload — Google data takes precedence where available
  const street = addrComp.streetNumber && addrComp.street
    ? `${addrComp.streetNumber} ${addrComp.street}`
    : row['Address'].trim()

  const payload: Record<string, unknown> = {
    name: businessName, // Use our canonical name, not Google's (may include junk)
  }
  if (street) payload.address = street
  if (addrComp.city || row['City'].trim()) payload.city = addrComp.city || row['City'].trim()
  if (addrComp.state || row['State'].trim()) payload.state = addrComp.state || row['State'].trim()
  if (addrComp.zipCode || row['ZIP'].trim()) payload.zip = addrComp.zipCode || row['ZIP'].trim()

  // Lat/lng from Google
  if (googlePlace.location?.latitude && googlePlace.location?.longitude) {
    payload.ll = `${googlePlace.location.latitude},${googlePlace.location.longitude}`
  }

  // Phone — prefer our website (Zing-deployed), fall back to Google's
  const website = sanitizeWebsite(row['Website'].trim()) || googlePlace.websiteUri
  if (website) payload.url = website

  const phone = sanitizePhone(row['Phone'].trim()) || googlePlace.nationalPhoneNumber
  if (phone) payload.tel = phone

  if (dryRun) {
    return {
      hubspot_id: hubspotId,
      business_name: businessName,
      action,
      status: 'success',
      google_place_id: googlePlaceId,
      details: `[DRY RUN] Would create with: ${JSON.stringify(payload).slice(0, 200)}`,
    }
  }

  // Create the venue
  try {
    const { venueId } = await createFoursquareVenue(payload, fsqApiKey)
    await updateSupabase(supabase, hubspotId, venueId, businessName, googlePlaceId, action)
    return {
      hubspot_id: hubspotId,
      business_name: businessName,
      action,
      status: 'success',
      foursquare_venue_id: venueId,
      google_place_id: googlePlaceId,
      details: `Created venue ${venueId}`,
    }
  } catch (err: any) {
    return {
      hubspot_id: hubspotId,
      business_name: businessName,
      action,
      status: 'failed',
      error: err.message,
    }
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0
  const onlyIdx = args.indexOf('--only')
  const only = onlyIdx >= 0 ? args[onlyIdx + 1] : ''
  const resumeIdx = args.indexOf('--resume-from')
  const resumeFrom = resumeIdx >= 0 ? parseInt(args[resumeIdx + 1], 10) : 0

  console.log('='.repeat(70))
  console.log('  FOURSQUARE BULK PUSH')
  console.log('='.repeat(70))
  console.log()
  if (dryRun) console.log('  MODE: DRY RUN (no Foursquare or Supabase writes)')
  if (limit) console.log(`  LIMIT: ${limit} rows`)
  if (only) console.log(`  FILTER: Only ${only} rows`)
  if (resumeFrom) console.log(`  RESUME FROM: row ${resumeFrom}`)
  console.log()

  // ─── Validate env vars ───────────────────────────────────

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
  const fsqApiKey = process.env.FOURSQUARE_SERVICE_ACCOUNT_KEY || process.env.FOURSQUARE_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing Supabase credentials'); process.exit(1)
  }
  if (!dryRun && !googleApiKey) {
    console.error('ERROR: Missing GOOGLE_PLACES_API_KEY'); process.exit(1)
  }
  if (!dryRun && !fsqApiKey) {
    console.error('ERROR: Missing FOURSQUARE_SERVICE_ACCOUNT_KEY'); process.exit(1)
  }

  // ─── Load CSV ────────────────────────────────────────────

  const absCsvPath = join(process.cwd(), CSV_PATH)
  console.log(`  Loading: ${absCsvPath}`)
  const allRows = parseCSV(absCsvPath)
  console.log(`  Total rows: ${allRows.length}`)

  // Filter to actionable rows
  let actionable = allRows.filter(r => {
    const rec = r['Recommendation']
    return rec === 'CREATE' || rec === 'LINK_EXACT'
  })

  if (only) {
    actionable = actionable.filter(r => r['Recommendation'] === only)
  }

  if (resumeFrom > 0) {
    actionable = actionable.slice(resumeFrom)
  }

  if (limit > 0) {
    actionable = actionable.slice(0, limit)
  }

  const createCount = actionable.filter(r => r['Recommendation'] === 'CREATE').length
  const linkCount = actionable.filter(r => r['Recommendation'] === 'LINK_EXACT').length

  console.log(`  Actionable: ${actionable.length} (${createCount} CREATE + ${linkCount} LINK_EXACT)`)
  console.log()

  // ─── Connect to Supabase ─────────────────────────────────

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check existing venue IDs (don't re-process)
  const contactIds = actionable.map(r => r['HubSpot ID'].trim())
  const existingVenueIds = new Set<string>()

  if (!dryRun) {
    const { data: existing } = await supabase
      .from('service_identity_map')
      .select('hubspot_contact_id, foursquare_venue_id')
      .in('hubspot_contact_id', contactIds)
      .not('foursquare_venue_id', 'is', null)

    for (const row of existing || []) {
      existingVenueIds.add(row.hubspot_contact_id)
    }

    if (existingVenueIds.size > 0) {
      console.log(`  Skipping ${existingVenueIds.size} rows that already have a Foursquare venue linked`)
      console.log()
    }
  }

  // ─── Set up log file ─────────────────────────────────────

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const logPath = join(process.cwd(), 'scripts/audit', `foursquare-push-${timestamp}.log`)
  const resultsPath = join(process.cwd(), 'scripts/audit', `foursquare-push-results-${timestamp}.csv`)

  writeFileSync(logPath, `Foursquare Bulk Push Log — ${new Date().toISOString()}\n${dryRun ? 'DRY RUN\n' : ''}${'='.repeat(70)}\n\n`, 'utf-8')
  writeFileSync(resultsPath, 'row,hubspot_id,business_name,action,status,foursquare_venue_id,google_place_id,details,error\n', 'utf-8')

  const log = (msg: string) => {
    console.log(msg)
    appendFileSync(logPath, msg + '\n', 'utf-8')
  }

  const writeResult = (row: number, result: PushResult) => {
    const csv = [
      row,
      result.hubspot_id,
      `"${result.business_name.replace(/"/g, '""')}"`,
      result.action,
      result.status,
      result.foursquare_venue_id || '',
      result.google_place_id || '',
      `"${(result.details || '').replace(/"/g, '""')}"`,
      `"${(result.error || '').replace(/"/g, '""')}"`,
    ].join(',')
    appendFileSync(resultsPath, csv + '\n', 'utf-8')
  }

  // ─── Process each row ────────────────────────────────────

  const stats = { success: 0, skipped: 0, failed: 0 }

  log('  Processing:')
  log('  ' + '-'.repeat(66))

  for (let i = 0; i < actionable.length; i++) {
    const row = actionable[i]
    const rowNum = resumeFrom + i + 1
    const bizName = row['Business Name'].substring(0, 38).padEnd(40)
    const action = row['Recommendation'].padEnd(11)

    process.stdout.write(`  [${String(rowNum).padStart(4)}/${actionable.length + resumeFrom}] ${bizName} ${action} `)

    let result: PushResult
    try {
      result = await processRow(row, supabase, existingVenueIds, dryRun, googleApiKey || '', fsqApiKey || '')
    } catch (err: any) {
      result = {
        hubspot_id: row['HubSpot ID'],
        business_name: row['Business Name'],
        action: row['Recommendation'] as any,
        status: 'failed',
        error: `Unexpected error: ${err.message}`,
      }
    }

    stats[result.status]++

    const icon = {
      success: 'OK',
      skipped: 'SKIP',
      failed: 'FAIL',
    }[result.status]

    console.log(icon)
    if (result.error) {
      appendFileSync(logPath, `  [${rowNum}] FAIL: ${result.business_name} — ${result.error}\n`, 'utf-8')
    }
    if (result.details && (result.status === 'skipped' || result.status === 'failed')) {
      appendFileSync(logPath, `  [${rowNum}] ${result.status.toUpperCase()}: ${result.business_name} — ${result.details}\n`, 'utf-8')
    }

    writeResult(rowNum, result)

    if (!dryRun && result.status === 'success') {
      await sleep(DELAY_BETWEEN_PUSHES_MS)
    }
  }

  // ─── Summary ─────────────────────────────────────────────

  console.log()
  console.log('='.repeat(70))
  console.log('  PUSH SUMMARY')
  console.log('='.repeat(70))
  console.log()
  console.log(`  Total processed: ${actionable.length}`)
  console.log(`  Success:         ${stats.success}`)
  console.log(`  Skipped:         ${stats.skipped}`)
  console.log(`  Failed:          ${stats.failed}`)
  console.log()
  console.log(`  Log:     ${logPath}`)
  console.log(`  Results: ${resultsPath}`)
  console.log()

  if (stats.failed > 0) {
    console.log(`  ${stats.failed} failures — check the log file for details.`)
    console.log(`  Use --resume-from to pick up where you left off after fixes.`)
    console.log()
  }
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err)
  process.exit(1)
})
