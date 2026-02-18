/**
 * Supabase Database Tables Checker
 *
 * Queries the Supabase database to list all tables and their columns.
 * Run with: npx tsx check-supabase-tables.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔍 Supabase Database Tables Checker');
console.log('=====================================\n');
console.log(`📡 Connecting to: ${SUPABASE_URL}`);
console.log(`🔑 Using anon key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  try {
    console.log('📊 Querying database schema...\n');

    // Query the information_schema to get all tables in the public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.log('⚠️  Direct schema query failed (this is normal with RLS)');
      console.log(`   Error: ${tablesError.message}\n`);
      console.log('🔄 Trying alternative approach: querying known auth tables...\n');

      // Try to check auth-related tables
      await checkAuthTables();
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('📭 No tables found in the public schema.');
      console.log('   This might mean:');
      console.log('   1. No tables have been created yet');
      console.log('   2. Row Level Security (RLS) is blocking access');
      console.log('   3. Tables are in a different schema\n');

      console.log('🔄 Checking auth tables...\n');
      await checkAuthTables();
      return;
    }

    console.log(`✅ Found ${tables.length} tables in public schema:\n`);

    for (const table of tables) {
      console.log(`📋 Table: ${table.table_name}`);

      // Try to get column information
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name)
        .order('ordinal_position');

      if (!columnsError && columns) {
        console.log(`   Columns (${columns.length}):`);
        columns.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
          console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`);
        });
      }

      // Try to count rows
      const { count, error: countError } = await supabase
        .from(table.table_name)
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`   Rows: ${count ?? 0}`);
      }

      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Error checking tables:', error.message);
  }
}

async function checkAuthTables() {
  console.log('🔐 Checking Supabase Auth System:\n');

  // Check if we can access auth.users (using Supabase auth API)
  const { data: session, error: sessionError } = await supabase.auth.getSession();

  console.log('📧 Current Auth Session:');
  if (session?.session) {
    console.log(`   ✅ Logged in as: ${session.session.user.email}`);
    console.log(`   User ID: ${session.session.user.id}`);
    console.log(`   Access Token: ${session.session.access_token.substring(0, 20)}...`);
  } else {
    console.log('   ℹ️  No active session (not logged in)');
  }
  console.log('');

  // Try to check if there are any users
  console.log('👥 Checking for registered users:');
  console.log('   Note: User data is only accessible via auth API, not direct queries\n');

  // List common Supabase tables that might exist
  const commonTables = [
    'profiles',
    'users',
    'companies',
    'contacts',
    'organizations',
    'workspaces',
    'projects',
  ];

  console.log('🔍 Checking for common application tables:\n');

  for (const tableName of commonTables) {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`✅ ${tableName} - Found (${count ?? 0} rows)`);
    } else if (error.code === '42P01') {
      // Table doesn't exist
      console.log(`❌ ${tableName} - Does not exist`);
    } else if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
      console.log(`🔒 ${tableName} - Exists but RLS blocking access (${count ?? 0} rows)`);
    } else {
      console.log(`⚠️  ${tableName} - Error: ${error.message}`);
    }
  }

  console.log('\n📝 Summary:');
  console.log('   - Tables marked with ✅ exist and are accessible');
  console.log('   - Tables marked with 🔒 exist but require authentication');
  console.log('   - Tables marked with ❌ do not exist yet');
}

async function checkStorageBuckets() {
  console.log('\n\n🪣 Checking Storage Buckets:\n');

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.log(`⚠️  Cannot list buckets: ${error.message}`);
    return;
  }

  if (!buckets || buckets.length === 0) {
    console.log('📭 No storage buckets found');
    return;
  }

  console.log(`✅ Found ${buckets.length} storage buckets:\n`);
  for (const bucket of buckets) {
    console.log(`🪣 ${bucket.name}`);
    console.log(`   ID: ${bucket.id}`);
    console.log(`   Public: ${bucket.public ? 'Yes' : 'No'}`);
    console.log(`   Created: ${bucket.created_at}`);
    console.log('');
  }
}

// Run all checks
async function runAllChecks() {
  await checkTables();
  await checkStorageBuckets();

  console.log('\n✅ Database check complete!');
  console.log('\n💡 Tip: To view the full database schema, use the Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${process.env.SUPABASE_PROJECT_ID}`);
}

runAllChecks();
