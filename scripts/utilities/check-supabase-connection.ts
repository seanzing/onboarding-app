/**
 * Check Supabase Connection and List Tables
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key (first 20 chars):', supabaseServiceKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Try to list all tables using raw SQL
  console.log('\n🔍 Attempting to list tables...\n');

  const { data, error } = await supabase.rpc('get_table_list');

  if (error) {
    console.log('RPC not available, trying direct query...\n');

    // Try a simple select on a basic system table
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.log('Auth check result:', authError);
    } else {
      console.log('Auth check result:', authData ? 'OK' : 'No user');
    }

    // Try to query information_schema
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tableError) {
      console.log('Table query error:', tableError);
    } else {
      console.log('Tables found:', tables);
    }
  }

  // Try listing just the specific tables we know about
  console.log('\n📋 Testing specific tables:\n');

  const tablesToTest = [
    'pipedream_connected_accounts',
    'connected_accounts',
    'clients',
    'contacts'
  ];

  for (const table of tablesToTest) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} rows`);
    }
  }
}

main().catch(console.error);
