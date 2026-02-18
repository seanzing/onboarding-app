/**
 * CLI Script: Sync ALL HubSpot Contacts to Supabase
 *
 * This script is designed for bulk syncing 200K+ contacts without
 * API timeout issues. Run locally via CLI instead of HTTP request.
 *
 * Usage:
 *   npx tsx scripts/sync-all-contacts-cli.ts
 *
 * Features:
 * - No timeout limitations (unlike API routes)
 * - Real-time progress updates in terminal
 * - Handles 300K+ contacts with maxPages=3000
 * - Safe merge pattern (preserves existing Supabase data)
 *
 * Required env vars:
 *   HUBSPOT_ACCESS_TOKEN - HubSpot private app token
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 *   TEST_EMAIL - Supabase auth email
 *   TEST_PASSWORD - Supabase auth password
 */

import 'dotenv/config'
import { syncAllContacts } from '../../lib/sync/all-contacts-sync-service'

async function main() {
  console.log('═'.repeat(70))
  console.log('  📥 HUBSPOT → SUPABASE FULL CONTACT SYNC')
  console.log('  Capacity: Up to 300,000 contacts (maxPages=3000)')
  console.log('═'.repeat(70))
  console.log()

  // Validate environment variables
  const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const TEST_EMAIL = process.env.TEST_EMAIL
  const TEST_PASSWORD = process.env.TEST_PASSWORD

  if (!HUBSPOT_ACCESS_TOKEN) {
    console.error('❌ Missing HUBSPOT_ACCESS_TOKEN')
    process.exit(1)
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('❌ Missing TEST_EMAIL or TEST_PASSWORD')
    process.exit(1)
  }

  console.log('✓ Environment variables validated')
  console.log(`  Supabase URL: ${SUPABASE_URL}`)
  console.log(`  Auth Email: ${TEST_EMAIL}`)
  console.log()

  console.log('🚀 Starting sync (this may take 30+ minutes for 200K+ contacts)...')
  console.log('   Press Ctrl+C to abort')
  console.log()

  const startTime = Date.now()

  try {
    const result = await syncAllContacts(
      HUBSPOT_ACCESS_TOKEN,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      TEST_EMAIL,
      TEST_PASSWORD,
      'sync' // Full sync mode (upserts all contacts)
    )

    console.log()
    console.log('═'.repeat(70))
    if (result.success) {
      console.log('  ✅ SYNC COMPLETED SUCCESSFULLY')
    } else {
      console.log('  ⚠️  SYNC COMPLETED WITH ERRORS')
    }
    console.log('═'.repeat(70))
    console.log()
    console.log('  📊 RESULTS:')
    console.log(`     Total Contacts:    ${result.totalContacts.toLocaleString()}`)
    console.log(`     Updated/Inserted:  ${result.updated.toLocaleString()}`)
    console.log(`     Skipped:           ${result.skipped.toLocaleString()}`)
    console.log(`     Errors:            ${result.errors.toLocaleString()}`)
    console.log(`     Duration:          ${result.duration}`)
    console.log(`     Timestamp:         ${result.timestamp}`)
    console.log()

    if (result.errorMessage) {
      console.log('  ❌ Error Message:', result.errorMessage)
      console.log()
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1)
  } catch (error: any) {
    const duration = Math.floor((Date.now() - startTime) / 1000)
    console.error()
    console.error('═'.repeat(70))
    console.error('  ❌ SYNC FAILED')
    console.error('═'.repeat(70))
    console.error()
    console.error('  Error:', error.message)
    console.error(`  Duration before failure: ${duration}s`)
    console.error()
    process.exit(1)
  }
}

main()
