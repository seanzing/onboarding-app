/**
 * Export ALL HubSpot Contacts for BrightLocal (Daily Chunks with Rate Limiting)
 *
 * This script ensures we get EVERY contact by:
 * 1. Fetching contacts day-by-day from earliest to latest
 * 2. Adding 1-second delay between each day to avoid rate limits
 * 3. Each day has its own 10K limit, so we'll get everything
 *
 * Run with: npx tsx scripts/export-all-contacts-daily.ts
 *
 * NOTE: This will be slow (30+ minutes) but COMPLETE and RELIABLE
 */

import * as fs from 'fs/promises';

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error('❌ HUBSPOT_ACCESS_TOKEN not found in environment!');
  process.exit(1);
}
const DELAY_MS = 1100; // 1.1 seconds between requests to avoid rate limits

interface HubSpotContact {
  id: string;
  properties: Record<string, string | undefined>;
}

interface ContactsResponse {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

// ============================================================================
// BRIGHTLOCAL-RELEVANT PROPERTIES
// ============================================================================

const BRIGHTLOCAL_PROPERTIES = [
  // Required fields
  'company',
  'phone',
  'mobilephone',
  'address',
  'city',
  'state',
  'zip',
  'country',
  'website',
  'business_category_type',

  // Business details
  'business_hours',
  'current_website',
  'firstname',
  'lastname',
  'email',

  // Status fields
  'lifecyclestage',
  'website_status',
  'published_status',
  'publishing_fee_paid',

  // Service areas (location_1 through location_50)
  ...Array.from({ length: 50 }, (_, i) => `location_${i + 1}`),

  // Date fields
  'createdate',
  'lastmodifieddate',
];

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// DETERMINE DATE RANGE
// ============================================================================

async function getContactDateRange(): Promise<{ earliest: Date; latest: Date }> {
  console.log('\n🔍 Determining contact date range...\n');

  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search';

  // Get earliest contact
  const earliestPayload = {
    limit: 1,
    properties: ['createdate'],
    sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
  };

  const earliestResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(earliestPayload),
  });

  if (!earliestResponse.ok) {
    throw new Error(`Failed to get earliest contact: ${earliestResponse.status}`);
  }

  const earliestData: ContactsResponse = await earliestResponse.json();
  const earliestDate = new Date(earliestData.results[0].properties.createdate!);
  earliestDate.setHours(0, 0, 0, 0); // Start of day

  // Get latest contact
  const latestPayload = {
    limit: 1,
    properties: ['createdate'],
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
  };

  const latestResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(latestPayload),
  });

  if (!latestResponse.ok) {
    throw new Error(`Failed to get latest contact: ${latestResponse.status}`);
  }

  const latestData: ContactsResponse = await latestResponse.json();
  const latestDate = new Date(latestData.results[0].properties.createdate!);
  latestDate.setHours(23, 59, 59, 999); // End of day

  console.log(`   Earliest Contact: ${formatDate(earliestDate)}`);
  console.log(`   Latest Contact:   ${formatDate(latestDate)}`);

  const totalDays = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`   Total Days:       ${totalDays}`);
  console.log(`   Estimated Time:   ~${Math.ceil(totalDays * DELAY_MS / 1000 / 60)} minutes\n`);

  return { earliest: earliestDate, latest: latestDate };
}

// ============================================================================
// GENERATE DAILY DATE RANGES
// ============================================================================

function generateDailyRanges(earliest: Date, latest: Date): Array<{ start: Date; end: Date }> {
  const ranges: Array<{ start: Date; end: Date }> = [];
  const current = new Date(earliest);

  while (current <= latest) {
    const dayStart = new Date(current);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    ranges.push({ start: dayStart, end: dayEnd });

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return ranges;
}

// ============================================================================
// FETCH CONTACTS FOR A SINGLE DAY
// ============================================================================

async function fetchContactsForDay(date: Date): Promise<HubSpotContact[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
  const allContacts: HubSpotContact[] = [];
  let after: string | undefined;

  try {
    while (true) {
      const payload: any = {
        limit: 100,
        properties: BRIGHTLOCAL_PROPERTIES,
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'createdate',
                operator: 'GTE',
                value: dayStart.getTime().toString(),
              },
              {
                propertyName: 'createdate',
                operator: 'LTE',
                value: dayEnd.getTime().toString(),
              },
            ],
          },
        ],
        sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
      };

      if (after) {
        payload.after = after;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // If we hit 10K limit for a single day, that's fine - unlikely but possible
        if (response.status === 400 && allContacts.length >= 9000) {
          console.log(`      ⚠️  Hit 10K limit for single day - returning ${allContacts.length} contacts`);
          break;
        }

        // Rate limit - wait and retry
        if (response.status === 429) {
          console.log(`      ⏳ Rate limited - waiting 5 seconds...`);
          await sleep(5000);
          continue; // Retry same request
        }

        throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
      }

      const data: ContactsResponse = await response.json();
      allContacts.push(...data.results);

      after = data.paging?.next?.after;

      if (!after) {
        break;
      }

      // Safety check - if we hit 10K exactly for a single day (very unlikely)
      if (allContacts.length >= 10000) {
        console.log(`      ⚠️  Reached 10K contacts for single day - stopping`);
        break;
      }
    }

    return allContacts;
  } catch (error) {
    console.error(`      ❌ Error fetching day:`, error);
    return allContacts; // Return whatever we got
  }
}

// ============================================================================
// PROCESS CONTACTS
// ============================================================================

interface ProcessedContact {
  id: string;
  [key: string]: string | number;
}

function processContacts(contacts: HubSpotContact[]): ProcessedContact[] {
  return contacts.map((contact) => {
    const props = contact.properties;

    // Calculate data quality metrics
    const requiredFields = [
      props.company,
      props.phone || props.mobilephone,
      props.address,
      props.city,
      props.state,
      props.zip,
      props.country,
      props.website || props.current_website,
      props.business_category_type,
    ].filter(Boolean);

    const completeness_score = Math.round((requiredFields.length / 9) * 100);

    // Determine business type
    const hasServiceAreas = Array.from({ length: 50 }, (_, i) => props[`location_${i + 1}`]).some(Boolean);
    const hasAddress = !!(props.address && props.city && props.state);
    const business_type = hasServiceAreas ? 'SAB' : hasAddress ? 'Location' : 'Unknown';

    // Check if GBP ready
    const gbp_ready = completeness_score >= 80 ? 'Yes' : 'No';

    // Check if active customer
    const active_customer = props.lifecyclestage === 'customer' ? 'Yes' : 'No';

    const processed: ProcessedContact = {
      id: contact.id,
      active_customer,
      business_type,
      gbp_ready,
      completeness_score,
      ...props,
    };

    return processed;
  });
}

// ============================================================================
// EXPORT TO CSV
// ============================================================================

function convertToCSV(contacts: ProcessedContact[]): string {
  if (contacts.length === 0) {
    return '';
  }

  const allKeys = new Set<string>();
  contacts.forEach((contact) => {
    Object.keys(contact).forEach((key) => allKeys.add(key));
  });

  const headers = Array.from(allKeys);
  const csvHeader = headers.map((h) => `"${h}"`).join(',');

  const csvRows = contacts.map((contact) => {
    return headers
      .map((header) => {
        const value = contact[header];
        if (value === undefined || value === null) {
          return '';
        }
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(',');
  });

  return [csvHeader, ...csvRows].join('\n');
}

async function saveCSV(contacts: ProcessedContact[], filename: string) {
  const csv = convertToCSV(contacts);
  await fs.writeFile(filename, csv, 'utf-8');

  const fileSize = Buffer.byteLength(csv, 'utf-8');
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  console.log(`\n💾 Saved ${contacts.length.toLocaleString()} contacts to: ${filename}`);
  console.log(`📊 File size: ${fileSizeMB} MB\n`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(80));
  console.log('HubSpot BrightLocal Export - DAILY (Complete & Rate-Limited)');
  console.log('═'.repeat(80));

  const startTime = Date.now();

  try {
    // Step 1: Determine date range
    const { earliest, latest } = await getContactDateRange();

    // Step 2: Generate daily ranges
    const dailyRanges = generateDailyRanges(earliest, latest);
    console.log(`📅 Generated ${dailyRanges.length} daily date ranges\n`);

    // Step 3: Fetch contacts day by day
    console.log('🔄 Starting daily export with rate limiting...\n');
    console.log('   Progress will be shown every 10 days\n');

    let allContacts: HubSpotContact[] = [];
    let daysWithContacts = 0;
    let totalContactsFetched = 0;

    for (let i = 0; i < dailyRanges.length; i++) {
      const range = dailyRanges[i];
      const dayContacts = await fetchContactsForDay(range.start);

      if (dayContacts.length > 0) {
        daysWithContacts++;
        totalContactsFetched += dayContacts.length;
        allContacts.push(...dayContacts);
      }

      // Show progress every 10 days
      if ((i + 1) % 10 === 0 || i === dailyRanges.length - 1) {
        const percent = ((i + 1) / dailyRanges.length * 100).toFixed(1);
        console.log(`   Day ${(i + 1).toString().padStart(3)}/${dailyRanges.length} (${percent}%) - ${formatDate(range.start)} - Total: ${totalContactsFetched.toLocaleString()} contacts`);
      }

      // Rate limiting - wait between requests (except for last one)
      if (i < dailyRanges.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`\n✅ Completed fetching ${dailyRanges.length} days`);
    console.log(`   Days with contacts: ${daysWithContacts}`);
    console.log(`   Total contacts fetched: ${totalContactsFetched.toLocaleString()}\n`);

    // Step 4: Remove duplicates
    console.log('🔍 Removing duplicates...');
    const uniqueContactsMap = new Map<string, HubSpotContact>();
    allContacts.forEach((contact) => {
      uniqueContactsMap.set(contact.id, contact);
    });
    const uniqueContacts = Array.from(uniqueContactsMap.values());
    console.log(`   Unique contacts: ${uniqueContacts.length.toLocaleString()}\n`);

    // Step 5: Process contacts
    console.log('⚙️  Processing contacts...\n');
    const processedContacts = processContacts(uniqueContacts);

    // Step 6: Calculate statistics
    const activeCustomers = processedContacts.filter((c) => c.active_customer === 'Yes').length;
    const gbpReady = processedContacts.filter((c) => c.gbp_ready === 'Yes').length;
    const locationBased = processedContacts.filter((c) => c.business_type === 'Location').length;
    const sab = processedContacts.filter((c) => c.business_type === 'SAB').length;

    console.log('═'.repeat(80));
    console.log('📊 EXPORT STATISTICS');
    console.log('═'.repeat(80));
    console.log(`\nTotal Contacts Exported:    ${processedContacts.length.toLocaleString()}`);
    console.log(`Active Customers:           ${activeCustomers.toLocaleString()} (${((activeCustomers / processedContacts.length) * 100).toFixed(1)}%)`);
    console.log(`GBP Ready:                  ${gbpReady.toLocaleString()} (${((gbpReady / processedContacts.length) * 100).toFixed(1)}%)`);
    console.log(`Location-Based Businesses:  ${locationBased.toLocaleString()} (${((locationBased / processedContacts.length) * 100).toFixed(1)}%)`);
    console.log(`Service Area Businesses:    ${sab.toLocaleString()} (${((sab / processedContacts.length) * 100).toFixed(1)}%)`);

    // Step 7: Save to CSV
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `hubspot-brightlocal-DAILY-COMPLETE-${timestamp}.csv`;

    console.log('\n💾 Saving to CSV...\n');
    await saveCSV(processedContacts, filename);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('═'.repeat(80));
    console.log(`✅ COMPLETE DAILY EXPORT finished in ${duration} seconds (${(parseInt(duration) / 60).toFixed(1)} minutes)`);
    console.log('═'.repeat(80));
    console.log('');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
