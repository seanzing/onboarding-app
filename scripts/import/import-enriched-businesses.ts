/**
 * Import Enriched Businesses to Supabase
 *
 * This script reads the enriched JSON files from data/enriched-hubspot/
 * and imports them into the enriched_businesses table in Supabase.
 *
 * Features:
 * - Reads all *.json files matching the pattern XX-*.json
 * - Converts camelCase JSON fields to snake_case DB columns
 * - Maps BrightLocal category IDs from the lookup table
 * - Upserts data (insert or update on conflict)
 * - Validates data before insertion
 *
 * Usage:
 *   npx tsx scripts/import-enriched-businesses.ts
 *
 * Prerequisites:
 *   - Run the migration: supabase db push
 *   - Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  console.error('');
  console.error('   Make sure these are set in .env.local');
  process.exit(1);
}

console.log('🔌 Supabase URL:', SUPABASE_URL);
console.log('🔑 Service Key:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...');
console.log('');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// BrightLocal Category ID Mapping
// ============================================================================
// These IDs were found by searching the BrightLocal Categories List page

const BRIGHTLOCAL_CATEGORY_MAP: Record<string, number> = {
  // Business Name (EXACT as in JSON) → BrightLocal Category ID
  'The Dog Tutor': 1355,                                    // Dog trainer
  'PipeworX Plumbing, Septic, and Drain Cleaning': 765,     // Plumber
  'Millman & Associates, Inc.': 1095,                       // Real estate appraiser
  'Mountain Asphalt LLC': 1102,                             // Asphalt contractor
  'Decorative Film Crew': 1051,                             // Window tinting service
  'Before and After Skin Care Clinic': 893,                 // Medical spa
  'Highlander Chimney Sweeping & Masonry, LLC': 1064,       // Chimney sweep
  "Rich's Rainbow Renovations": 997,                        // General contractor
  'Accurately Yours Accounting Solutions': 583,             // Accountant
  'Balance Your Books LLC': 585,                            // Bookkeeping service
  'In Design by Kristina': 896,                             // Wedding photographer
};

// ============================================================================
// Type Definitions
// ============================================================================

interface EnrichedBusinessJSON {
  hubspotContactId: string;
  hubspotUrl: string;
  businessName: string;
  businessNameAlternate: string | null;
  phone: string;
  phoneSecondary: string | null;
  email: string;
  website: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  serviceArea: string;
  shortDescription: string;
  longDescription: string;
  categories: string[];
  businessHours: Record<string, string>;
  logo: string;
  images: string[];
  imagesNote: string | null;
  socialMedia: {
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    yelp: string | null;
    tiktok: string | null;
  };
  attributes: {
    languages: string[];
    paymentMethods: string[];
    accessibility: string | null;
    parking: string | null;
    yearsInBusiness: string | null;
    license: string | null;
  };
  services: string[];
  certifications: string[];
  notes: string | null;
  enrichmentDate: string;
  enrichmentSources: string[];
  dataSource: string;
}

interface EnrichedBusinessDB {
  hubspot_contact_id: string;
  hubspot_url: string | null;
  business_name: string;
  business_name_alternate: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  website: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  service_area: string | null;
  short_description: string | null;
  long_description: string | null;
  categories: string[];
  brightlocal_category_id: number | null;
  business_hours: Record<string, string>;
  logo: string | null;
  images: string[];
  images_note: string | null;
  social_media: Record<string, string | null>;
  attributes: Record<string, unknown>;
  services: string[];
  certifications: string[];
  notes: string | null;
  enrichment_date: string | null;
  enrichment_sources: string[];
  data_source: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert JSON data to database format
 */
function convertToDBFormat(json: EnrichedBusinessJSON): EnrichedBusinessDB {
  // Find BrightLocal category ID by business name
  const brightlocalCategoryId = BRIGHTLOCAL_CATEGORY_MAP[json.businessName] ?? null;

  return {
    hubspot_contact_id: json.hubspotContactId,
    hubspot_url: json.hubspotUrl || null,
    business_name: json.businessName,
    business_name_alternate: json.businessNameAlternate,
    phone: json.phone || null,
    phone_secondary: json.phoneSecondary,
    email: json.email || null,
    website: json.website || null,
    street_address: json.streetAddress || null,
    city: json.city || null,
    state: json.state || null,
    zip_code: json.zipCode || null,
    country: json.country || null,
    service_area: json.serviceArea || null,
    short_description: json.shortDescription || null,
    long_description: json.longDescription || null,
    categories: json.categories || [],
    brightlocal_category_id: brightlocalCategoryId,
    business_hours: json.businessHours || {},
    logo: json.logo || null,
    images: json.images || [],
    images_note: json.imagesNote,
    social_media: json.socialMedia || {},
    attributes: json.attributes || {},
    services: json.services || [],
    certifications: json.certifications || [],
    notes: json.notes,
    enrichment_date: json.enrichmentDate || null,
    enrichment_sources: json.enrichmentSources || [],
    data_source: json.dataSource || null,
  };
}

/**
 * Validate required fields
 */
function validateData(data: EnrichedBusinessDB, filename: string): string[] {
  const errors: string[] = [];

  if (!data.hubspot_contact_id) {
    errors.push(`${filename}: Missing hubspot_contact_id`);
  }
  if (!data.business_name) {
    errors.push(`${filename}: Missing business_name`);
  }

  return errors;
}

// ============================================================================
// Main Import Function
// ============================================================================

async function importEnrichedBusinesses(): Promise<void> {
  console.log('');
  console.log('================================================================================');
  console.log('  IMPORT ENRICHED BUSINESSES TO SUPABASE');
  console.log('================================================================================');
  console.log('');

  const dataDir = path.join(process.cwd(), 'data', 'enriched-hubspot');

  // Check if directory exists
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Directory not found: ${dataDir}`);
    process.exit(1);
  }

  // Find all JSON files matching pattern XX-*.json
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.match(/^\d{2}-.*\.json$/))
    .sort();

  console.log(`📁 Found ${files.length} enriched business files:`);
  files.forEach((f) => console.log(`   - ${f}`));
  console.log('');

  if (files.length === 0) {
    console.error('❌ No files found matching pattern XX-*.json');
    process.exit(1);
  }

  // Process each file
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    console.log(`📄 Processing: ${file}`);

    try {
      // Read and parse JSON
      const content = fs.readFileSync(filePath, 'utf8');
      const json: EnrichedBusinessJSON = JSON.parse(content);

      // Convert to DB format
      const dbData = convertToDBFormat(json);

      // Validate
      const validationErrors = validateData(dbData, file);
      if (validationErrors.length > 0) {
        results.errors.push(...validationErrors);
        results.failed++;
        console.log(`   ❌ Validation failed`);
        continue;
      }

      // Upsert to Supabase (insert or update on conflict)
      const { error } = await supabase
        .from('enriched_businesses')
        .upsert(dbData, {
          onConflict: 'hubspot_contact_id',
          ignoreDuplicates: false,
        });

      if (error) {
        results.errors.push(`${file}: ${error.message}`);
        results.failed++;
        console.log(`   ❌ Database error: ${error.message}`);
      } else {
        results.success++;
        const categoryInfo = dbData.brightlocal_category_id
          ? ` (BrightLocal Category: ${dbData.brightlocal_category_id})`
          : ' (No BrightLocal Category)';
        console.log(`   ✅ Imported: ${dbData.business_name}${categoryInfo}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      results.errors.push(`${file}: ${errorMessage}`);
      results.failed++;
      console.log(`   ❌ Error: ${errorMessage}`);
    }
  }

  // Print summary
  console.log('');
  console.log('================================================================================');
  console.log('  IMPORT SUMMARY');
  console.log('================================================================================');
  console.log('');
  console.log(`  ✅ Successfully imported: ${results.success}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  📊 Total files processed: ${files.length}`);
  console.log('');

  if (results.errors.length > 0) {
    console.log('  Errors:');
    results.errors.forEach((e) => console.log(`    - ${e}`));
    console.log('');
  }

  // Verify import
  console.log('================================================================================');
  console.log('  VERIFICATION');
  console.log('================================================================================');
  console.log('');

  const { data: businesses, error: queryError } = await supabase
    .from('enriched_businesses')
    .select('hubspot_contact_id, business_name, brightlocal_category_id, city, state')
    .order('business_name');

  if (queryError) {
    console.log(`  ❌ Could not verify: ${queryError.message}`);
  } else {
    console.log(`  📊 Total records in enriched_businesses: ${businesses?.length || 0}`);
    console.log('');
    console.log('  Records:');
    businesses?.forEach((b) => {
      const category = b.brightlocal_category_id ? `[Cat: ${b.brightlocal_category_id}]` : '[No Cat]';
      console.log(`    - ${b.business_name} (${b.city}, ${b.state}) ${category}`);
    });
  }

  console.log('');
  console.log('================================================================================');
  console.log('  IMPORT COMPLETE');
  console.log('================================================================================');
  console.log('');
}

// ============================================================================
// Run Import
// ============================================================================

importEnrichedBusinesses().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
