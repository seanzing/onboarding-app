/**
 * CLI Script: Incremental Sync - HubSpot Contacts to Supabase
 *
 * FAST incremental sync that only fetches contacts modified since
 * the last sync. Typically completes in 10-30 seconds instead of 15+ minutes.
 *
 * Usage:
 *   npx tsx scripts/sync-incremental-cli.ts
 *
 * How it works:
 * 1. Queries Supabase for MAX(lastmodifieddate) to find last sync point
 * 2. Normalizes to START OF THAT DAY (midnight UTC) for safety margin
 * 3. Uses HubSpot Search API to fetch only contacts modified since then
 * 4. Upserts changed contacts to Supabase
 * 5. Displays detailed log of each synced contact
 *
 * When to use:
 * - Daily/hourly sync jobs (CRON)
 * - Quick manual sync after HubSpot updates
 * - Any time after an initial full sync
 *
 * Limitations:
 * - Requires an initial full sync first (will fall back automatically)
 * - Max 10,000 modified contacts per run (Search API limit)
 * - Does not detect deleted contacts (run full sync periodically)
 *
 * Required env vars:
 *   HUBSPOT_ACCESS_TOKEN - HubSpot private app token
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 *   TEST_EMAIL - Supabase auth email
 *   TEST_PASSWORD - Supabase auth password
 */

import 'dotenv/config'
import { syncAllContacts, SyncedContactInfo, FieldChange, getLifecycleLabel } from '../../lib/sync/all-contacts-sync-service'

async function main() {
  console.log('═'.repeat(70))
  console.log('  ⚡ HUBSPOT → SUPABASE INCREMENTAL SYNC')
  console.log('  Only syncs contacts modified since last sync (midnight UTC)')
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

  console.log('🚀 Starting incremental sync...')
  console.log('   (Will fall back to full sync if no previous sync found)')
  console.log()

  const startTime = Date.now()

  try {
    const result = await syncAllContacts(
      HUBSPOT_ACCESS_TOKEN,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      TEST_EMAIL,
      TEST_PASSWORD,
      'incremental' // Incremental sync mode
    )

    console.log()
    console.log('═'.repeat(70))
    if (result.success) {
      console.log('  ✅ INCREMENTAL SYNC COMPLETED SUCCESSFULLY')
    } else {
      console.log('  ⚠️  SYNC COMPLETED WITH ERRORS')
    }
    console.log('═'.repeat(70))
    console.log()

    // Show sync cutoff timestamp
    if (result.syncSinceTimestamp) {
      console.log('  📅 SYNC CUTOFF:')
      console.log(`     Since:             ${result.syncSinceTimestamp}`)
      console.log('     (Start of day, midnight UTC for safety margin)')
      console.log()
    }

    console.log('  📊 RESULTS:')
    console.log(`     Mode:              ${result.mode}`)
    console.log(`     Total Contacts:    ${result.totalContacts.toLocaleString()}`)
    console.log(`     Updated/Inserted:  ${result.updated.toLocaleString()}`)
    console.log(`     Skipped:           ${result.skipped.toLocaleString()}`)
    console.log(`     Errors:            ${result.errors.toLocaleString()}`)
    console.log(`     Duration:          ${result.duration}`)
    console.log(`     Timestamp:         ${result.timestamp}`)
    console.log()

    // Display detailed synced contacts summary if available
    if (result.syncedContacts && result.syncedContacts.length > 0) {
      const newCount = result.syncedContacts.filter(c => c.isNew).length
      const updatedCount = result.syncedContacts.filter(c => !c.isNew).length

      console.log('  📋 SYNCED CONTACTS SUMMARY:')
      console.log(`     🆕 New contacts:     ${newCount}`)
      console.log(`     🔄 Updated contacts: ${updatedCount}`)
      console.log()

      // Group by lifecycle stage (using human-readable labels)
      const byStage = result.syncedContacts.reduce((acc, c) => {
        const stage = c.lifecycleLabel || '(none)'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('  📈 BY LIFECYCLE STAGE:')
      Object.entries(byStage)
        .sort((a, b) => b[1] - a[1])
        .forEach(([stage, count]) => {
          console.log(`     ${stage}: ${count}`)
        })
      console.log()

      // Show table of synced contacts (limit to 50 for readability)
      const displayLimit = 50
      const displayContacts = result.syncedContacts.slice(0, displayLimit)

      console.log('  📝 SYNCED CONTACTS DETAIL:')
      console.log('  ┌─────────────┬───────────────────────────────┬───────────────────────────────┬────────────┐')
      console.log('  │ Status      │ Name                          │ Company                       │ Stage      │')
      console.log('  ├─────────────┼───────────────────────────────┼───────────────────────────────┼────────────┤')

      displayContacts.forEach(contact => {
        const status = contact.isNew ? '🆕 NEW' : '🔄 UPD'
        const name = (contact.name || 'Unknown').substring(0, 28).padEnd(28)
        const company = (contact.company || '-').substring(0, 28).padEnd(28)
        // Use human-readable lifecycle label (translates "958707767" to "No Show", etc.)
        const stage = (contact.lifecycleLabel || '-').substring(0, 10).padEnd(10)
        console.log(`  │ ${status.padEnd(10)} │ ${name} │ ${company} │ ${stage} │`)
      })

      console.log('  └─────────────┴───────────────────────────────┴───────────────────────────────┴────────────┘')

      if (result.syncedContacts.length > displayLimit) {
        console.log(`  ... and ${result.syncedContacts.length - displayLimit} more contacts`)
      }
      console.log()

      // === FIELD CHANGES SUMMARY ===
      // Show detailed field changes for updated contacts (not new ones)
      const contactsWithChanges = result.syncedContacts.filter(c => !c.isNew && c.changedFields.length > 0)

      if (contactsWithChanges.length > 0) {
        // Count total field changes
        const totalFieldChanges = contactsWithChanges.reduce((sum, c) => sum + c.changedFields.length, 0)

        // Group changes by field name
        const changesByField: Record<string, number> = {}
        contactsWithChanges.forEach(c => {
          c.changedFields.forEach(change => {
            changesByField[change.field] = (changesByField[change.field] || 0) + 1
          })
        })

        console.log('  📝 FIELD CHANGES SUMMARY:')
        console.log(`     Total field changes:    ${totalFieldChanges}`)
        console.log(`     Contacts with changes:  ${contactsWithChanges.length}`)
        console.log()
        console.log('  📊 CHANGES BY FIELD:')
        Object.entries(changesByField)
          .sort((a, b) => b[1] - a[1])
          .forEach(([field, count]) => {
            console.log(`     ${field}: ${count} change(s)`)
          })
        console.log()

        // Show detailed changes for first few contacts (limit to 10)
        const detailLimit = Math.min(10, contactsWithChanges.length)
        console.log(`  🔍 DETAILED CHANGES (first ${detailLimit} of ${contactsWithChanges.length}):`)
        console.log()

        contactsWithChanges.slice(0, detailLimit).forEach((contact, index) => {
          console.log(`     ${index + 1}. ${contact.name} (ID: ${contact.hubspotId})`)
          contact.changedFields.forEach(change => {
            // Special handling for lifecyclestage - translate numeric IDs to labels
            let oldVal = change.oldValue || '(empty)'
            let newVal = change.newValue || '(empty)'
            if (change.field === 'lifecyclestage') {
              oldVal = oldVal === '(empty)' ? oldVal : `${getLifecycleLabel(change.oldValue)} [${oldVal}]`
              newVal = newVal === '(empty)' ? newVal : `${getLifecycleLabel(change.newValue)} [${newVal}]`
            }
            // Truncate long values
            const oldDisplay = oldVal.length > 50 ? oldVal.substring(0, 47) + '...' : oldVal
            const newDisplay = newVal.length > 50 ? newVal.substring(0, 47) + '...' : newVal
            console.log(`        • ${change.field}:`)
            console.log(`            OLD: "${oldDisplay}"`)
            console.log(`            NEW: "${newDisplay}"`)
          })
          console.log()
        })

        if (contactsWithChanges.length > detailLimit) {
          console.log(`     ... and ${contactsWithChanges.length - detailLimit} more contacts with field changes`)
          console.log()
        }
      } else if (updatedCount > 0) {
        console.log('  📝 FIELD CHANGES: None detected (contacts re-synced but data unchanged)')
        console.log()
      }
    }

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
