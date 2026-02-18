/**
 * Check Pipedream Project Configuration
 *
 * Inspects:
 * - Connected accounts
 * - App configurations
 * - Available scopes
 */

import { PipedreamClient } from '@pipedream/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkPipedreamConfig() {
  console.log('\n🔍 CHECKING PIPEDREAM PROJECT CONFIGURATION\n');
  console.log('═'.repeat(80));

  const projectId = process.env.PIPEDREAM_PROJECT_ID;
  const clientId = process.env.PIPEDREAM_CLIENT_ID;
  const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET;

  if (!projectId || !clientId || !clientSecret) {
    console.error('❌ Missing Pipedream credentials in .env.local');
    console.error('Required: PIPEDREAM_PROJECT_ID, PIPEDREAM_CLIENT_ID, PIPEDREAM_CLIENT_SECRET');
    process.exit(1);
  }

  console.log('\n📋 Project Details:');
  console.log('  - Project ID:', projectId);
  console.log('  - Client ID:', clientId);
  console.log('  - Client Secret:', clientSecret.substring(0, 20) + '...');

  try {
    // Initialize Pipedream client
    console.log('\n🔧 Initializing Pipedream SDK...');
    const client = new PipedreamClient({
      projectId,
      clientId,
      clientSecret,
    });
    console.log('✅ Client initialized');

    // List all connected accounts
    console.log('\n📊 Fetching connected accounts...');
    try {
      const accountsResponse = await client.accounts.list();

      console.log('\n📄 Raw Response Type:', typeof accountsResponse);
      console.log('📄 Raw Response:', JSON.stringify(accountsResponse, null, 2));

      // Handle different response formats
      let accounts: any[] = [];
      if (Array.isArray(accountsResponse)) {
        accounts = accountsResponse;
      } else if (accountsResponse && typeof accountsResponse === 'object') {
        // Check if it has a data or accounts property
        accounts = (accountsResponse as any).data || (accountsResponse as any).accounts || [];
      }

      console.log(`\n✅ Found ${accounts.length} connected account(s):`);

      if (accounts.length === 0) {
        console.log('  ⚠️  No connected accounts found (as expected after deletion)');
      } else {
        accounts.forEach((account: any, index: number) => {
          console.log(`\n  Account ${index + 1}:`);
          console.log('    - ID:', account.id);
          console.log('    - Name:', account.name || 'N/A');
          console.log('    - Email:', account.email || 'N/A');
          console.log('    - App:', account.app || 'N/A');
          console.log('    - Healthy:', account.healthy);
          console.log('    - Created:', account.created_at || 'N/A');
        });
      }
    } catch (error: any) {
      console.error('❌ Error listing accounts:', error.message);
      if (error.statusCode) {
        console.error('  - Status Code:', error.statusCode);
      }
      if (error.body) {
        console.error('  - Error Body:', JSON.stringify(error.body, null, 2));
      }
    }

    // Check apps configuration
    console.log('\n📱 Checking available apps...');
    try {
      // Try to get app info if the SDK supports it
      console.log('  ℹ️  App configuration must be checked in Pipedream dashboard');
      console.log('  ℹ️  URL: https://pipedream.com/projects/' + projectId);
    } catch (error: any) {
      console.error('❌ Error checking apps:', error.message);
    }

    console.log('\n═'.repeat(80));
    console.log('\n✅ Configuration Check Complete!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Go to: https://pipedream.com/projects/' + projectId);
    console.log('  2. Check "Apps" section for Google My Business configuration');
    console.log('  3. Verify the following scopes are enabled:');
    console.log('     - https://www.googleapis.com/auth/business.manage');
    console.log('     - https://www.googleapis.com/auth/businesscommunications');
    console.log('  4. Reconnect a Google account with the correct scopes');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error);
    if (error.statusCode) {
      console.error('  - Status Code:', error.statusCode);
    }
    if (error.message) {
      console.error('  - Message:', error.message);
    }
    if (error.body) {
      console.error('  - Body:', JSON.stringify(error.body, null, 2));
    }
    console.error('\n');
    process.exit(1);
  }
}

checkPipedreamConfig()
  .then(() => {
    console.log('✅ Check complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
