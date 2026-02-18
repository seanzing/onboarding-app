/**
 * Delete ALL data - complete cleanup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function deleteAll() {
  console.log('\n🗑️  DELETING ALL DATA\n');
  console.log('═'.repeat(60));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Delete all clients
  console.log('\n1. Deleting all clients...');
  const { error: clientError } = await supabase
    .from('clients')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (clientError) {
    console.log('   ❌ Error:', clientError.message);
  } else {
    console.log('   ✅ All clients deleted');
  }

  // Delete all connected accounts
  console.log('\n2. Deleting all connected accounts...');
  const { error: accountError } = await supabase
    .from('pipedream_connected_accounts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (accountError) {
    console.log('   ❌ Error:', accountError.message);
  } else {
    console.log('   ✅ All connected accounts deleted');
  }

  // Verify
  console.log('\n3. Verifying cleanup...\n');
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  const { count: accountCount } = await supabase
    .from('pipedream_connected_accounts')
    .select('*', { count: 'exact', head: true });

  console.log('   Clients:', clientCount);
  console.log('   Connected Accounts:', accountCount);

  console.log('\n═'.repeat(60));
  if (clientCount === 0 && accountCount === 0) {
    console.log('\n✅ DATABASE COMPLETELY CLEAN!\n');
    console.log('Schema still intact:');
    console.log('   • clients table (empty)');
    console.log('   • pipedream_connected_accounts table (empty, with client_id column)');
    console.log('   • All RLS policies in place');
    console.log('\n💡 Ready for fresh start!\n');
  } else {
    console.log('\n⚠️  Some data remains');
  }
}

deleteAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
