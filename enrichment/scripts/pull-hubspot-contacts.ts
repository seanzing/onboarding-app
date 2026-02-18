#!/usr/bin/env npx tsx

/**
 * Pull HubSpot Contacts for Enrichment
 *
 * Fetches all customer contacts from HubSpot with comprehensive fields
 * for business directory enrichment.
 *
 * Usage:
 *   npx tsx scripts/pull-hubspot-contacts.ts
 */

import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const HUBSPOT_API_URL = 'https://api.hubapi.com';
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// All useful properties for enrichment
const PROPERTIES = [
  // Identifiers
  'hs_object_id',

  // Business info
  'company',
  'firstname',
  'lastname',

  // Contact info
  'email',
  'phone',
  'mobilephone',
  'work_email',

  // Website
  'website',
  'current_website',

  // Address
  'address',
  'city',
  'state',
  'zip',
  'country',

  // Business details
  'business_category_type',
  'business_hours',

  // Status
  'lifecyclestage',
].join(',');

interface HubSpotContact {
  id: string;
  properties: Record<string, string | null>;
}

interface CSVRow {
  hubspot_contact_id: string;
  hubspot_url: string;
  business_name: string;
  business_name_alternate: string;
  phone: string;
  phone_secondary: string;
  email: string;
  website: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

async function fetchAllContacts(): Promise<HubSpotContact[]> {
  const allContacts: HubSpotContact[] = [];
  let after: string | null = null;
  let page = 0;

  console.log('Fetching contacts from HubSpot...');

  while (true) {
    page++;
    const url = new URL(`${HUBSPOT_API_URL}/crm/v3/objects/contacts`);
    url.searchParams.set('limit', '100');
    url.searchParams.set('properties', PROPERTIES);

    if (after) {
      url.searchParams.set('after', after);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      break;
    }

    allContacts.push(...data.results);
    console.log(`  Page ${page}: ${data.results.length} contacts (Total: ${allContacts.length})`);

    after = data.paging?.next?.after || null;
    if (!after) break;

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allContacts;
}

function getBusinessName(props: Record<string, string | null>): string {
  // Prefer company name, fall back to first name + last name
  if (props.company && props.company.trim()) {
    return props.company.trim();
  }

  const first = props.firstname?.trim() || '';
  const last = props.lastname?.trim() || '';
  return `${first} ${last}`.trim();
}

function getWebsite(props: Record<string, string | null>): string {
  // Prefer website field, fall back to current_website
  let url = props.website?.trim() || props.current_website?.trim() || '';

  // Ensure it has protocol
  if (url && !url.startsWith('http')) {
    url = 'https://' + url;
  }

  return url;
}

function contactToCSVRow(contact: HubSpotContact): CSVRow {
  const props = contact.properties;

  return {
    hubspot_contact_id: contact.id,
    hubspot_url: `https://app.hubspot.com/contacts/46544827/record/0-1/${contact.id}`,
    business_name: getBusinessName(props),
    business_name_alternate: '', // To be enriched
    phone: props.phone?.trim() || '',
    phone_secondary: props.mobilephone?.trim() || '',
    email: props.email?.trim() || props.work_email?.trim() || '',
    website: getWebsite(props),
    street_address: props.address?.trim() || '',
    city: props.city?.trim() || '',
    state: props.state?.trim() || '',
    zip_code: props.zip?.trim() || '',
    country: props.country?.trim() || 'United States',
  };
}

function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCSV(rows: CSVRow[]): string {
  const headers = Object.keys(rows[0]) as (keyof CSVRow)[];

  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => escapeCSV(row[h])).join(',')
    )
  ];

  return lines.join('\n');
}

async function main() {
  console.log('='.repeat(60));
  console.log('PULL HUBSPOT CONTACTS FOR ENRICHMENT');
  console.log('='.repeat(60));
  console.log('');

  if (!HUBSPOT_ACCESS_TOKEN) {
    console.error('ERROR: HUBSPOT_ACCESS_TOKEN not set');
    process.exit(1);
  }

  // Fetch all contacts
  const contacts = await fetchAllContacts();
  console.log(`\nTotal contacts fetched: ${contacts.length}`);

  // Convert to CSV rows
  const rows = contacts.map(contactToCSVRow);

  // Statistics
  const withWebsite = rows.filter(r => r.website).length;
  const withAddress = rows.filter(r => r.street_address || r.city).length;
  const withPhone = rows.filter(r => r.phone).length;
  const withEmail = rows.filter(r => r.email).length;

  console.log('\n=== DATA QUALITY ===');
  console.log(`Has website:    ${withWebsite} (${(withWebsite/rows.length*100).toFixed(1)}%)`);
  console.log(`Has address:    ${withAddress} (${(withAddress/rows.length*100).toFixed(1)}%)`);
  console.log(`Has phone:      ${withPhone} (${(withPhone/rows.length*100).toFixed(1)}%)`);
  console.log(`Has email:      ${withEmail} (${(withEmail/rows.length*100).toFixed(1)}%)`);

  // Write CSV
  const csv = generateCSV(rows);
  const outputPath = 'data/hubspot-contacts-full.csv';
  fs.writeFileSync(outputPath, csv);
  console.log(`\nSaved to: ${outputPath}`);

  // Sample output
  console.log('\n=== SAMPLE ROWS ===');
  rows.slice(0, 3).forEach((row, i) => {
    console.log(`\n[${i + 1}] ${row.business_name}`);
    console.log(`    Website: ${row.website || '(none)'}`);
    console.log(`    Phone: ${row.phone || '(none)'}`);
    console.log(`    Location: ${row.city || '?'}, ${row.state || '?'}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
