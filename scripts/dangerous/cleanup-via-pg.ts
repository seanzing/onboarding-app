/**
 * Cleanup Broken Pipedream Accounts via Direct PostgreSQL
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.dtyrwmgoasbnyqrzfxng.supabase.co:5432/postgres`;

async function main() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to PostgreSQL...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // List all tables
    console.log('📋 Tables in public schema:\n');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`));

    // List all connected accounts
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔍 Fetching connected accounts...\n');

    const accountsResult = await client.query(`
      SELECT id, account_email, account_name, pipedream_account_id, app_name, created_at
      FROM pipedream_connected_accounts
      ORDER BY created_at DESC
    `);

    if (accountsResult.rows.length === 0) {
      console.log('No connected accounts found.');
      return;
    }

    console.log(`Found ${accountsResult.rows.length} connected account(s):\n`);

    accountsResult.rows.forEach((account, index) => {
      console.log(`${index + 1}. ${account.account_email || 'No email'}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Pipedream Account ID: ${account.pipedream_account_id}`);
      console.log(`   Account Name: ${account.account_name || 'N/A'}`);
      console.log(`   Created: ${account.created_at}`);
      console.log('');
    });

    // Identify accounts to keep vs delete
    const accountsToKeep = accountsResult.rows.filter(a =>
      a.account_email?.toLowerCase() === 'nclay@r36.com'
    );
    const accountsToDelete = accountsResult.rows.filter(a =>
      a.account_email?.toLowerCase() !== 'nclay@r36.com'
    );

    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ Accounts to KEEP (${accountsToKeep.length}):`);
    accountsToKeep.forEach(a => console.log(`   - ${a.account_email} (${a.pipedream_account_id})`));

    console.log(`\n❌ Accounts to DELETE (${accountsToDelete.length}):`);
    accountsToDelete.forEach(a => console.log(`   - ${a.account_email || 'No email'} (${a.pipedream_account_id})`));

    if (accountsToDelete.length === 0) {
      console.log('\n✅ No accounts to delete. All accounts are valid.');
      return;
    }

    // Delete the accounts
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🗑️  Deleting broken accounts...\n');

    const idsToDelete = accountsToDelete.map(a => a.id);

    const deleteResult = await client.query(`
      DELETE FROM pipedream_connected_accounts
      WHERE id = ANY($1)
      RETURNING id, account_email
    `, [idsToDelete]);

    console.log(`✅ Successfully deleted ${deleteResult.rowCount} broken account(s):`);
    deleteResult.rows.forEach(row => console.log(`   - ${row.account_email || row.id}`));

    console.log('\n   Users can now re-connect with the new OAuth app.\n');

    // Verify remaining accounts
    const remainingResult = await client.query(`
      SELECT account_email, pipedream_account_id
      FROM pipedream_connected_accounts
    `);

    console.log('📋 Remaining accounts:');
    if (remainingResult.rows.length === 0) {
      console.log('   (none)');
    } else {
      remainingResult.rows.forEach(a => console.log(`   - ${a.account_email} (${a.pipedream_account_id})`));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from PostgreSQL.');
  }
}

main().catch(console.error);
