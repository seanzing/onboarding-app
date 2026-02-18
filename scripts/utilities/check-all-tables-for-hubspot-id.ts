/**
 * Check All Tables for HubSpot Company ID Column
 *
 * This script checks which tables exist in Supabase and whether they have
 * a hubspot_company_id column for linking data to HubSpot companies.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

async function checkAllTables() {
  console.log('='.repeat(80));
  console.log('CHECKING ALL TABLES FOR HUBSPOT_COMPANY_ID COLUMN');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get all tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }

    console.log(`Found ${tables?.length || 0} tables in public schema:\n`);

    for (const table of tables || []) {
      const tableName = table.table_name as string;

      // Skip system tables
      if (tableName.startsWith('pg_') || tableName.startsWith('sql_')) {
        continue;
      }

      // Get columns for this table
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (columnsError) {
        console.error(`Error fetching columns for ${tableName}:`, columnsError);
        continue;
      }

      // Check if hubspot_company_id exists
      const hasHubSpotId = columns?.some(
        (col: any) => col.column_name === 'hubspot_company_id'
      );

      const hasClientId = columns?.some(
        (col: any) => col.column_name === 'client_id'
      );

      const status = hasHubSpotId
        ? '✅ HAS hubspot_company_id'
        : hasClientId
        ? '🔗 Has client_id (indirect link)'
        : '❌ NO hubspot_company_id';

      console.log(`${tableName.padEnd(40)} ${status}`);

      if (hasHubSpotId) {
        const col = columns.find((c: any) => c.column_name === 'hubspot_company_id');
        if (col) {
          console.log(`   └─ Type: ${col.data_type}, Nullable: ${col.is_nullable}`);
        }
      } else if (hasClientId) {
        const col = columns.find((c: any) => c.column_name === 'client_id');
        if (col) {
          console.log(`   └─ Type: ${col.data_type}, Nullable: ${col.is_nullable}`);
          console.log(`   └─ Note: Links to clients.id, which has hubspot_company_id`);
        }
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    const integrationTables = tables?.filter((t: any) => {
      const name = t.table_name;
      return !name.startsWith('pg_') &&
             !name.startsWith('sql_') &&
             (name.includes('pipedream') ||
              name.includes('brightlocal') ||
              name.includes('gbp') ||
              name.includes('google') ||
              name.includes('location') ||
              name.includes('campaign') ||
              name.includes('account'));
    });

    console.log(`\nIntegration-related tables found: ${integrationTables?.length || 0}`);
    integrationTables?.forEach((t: any) => console.log(`  - ${t.table_name}`));

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkAllTables();
