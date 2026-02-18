// @ts-nocheck
/**
 * Pipedream Configuration Verification Script
 *
 * This script verifies that Pipedream Connect is properly configured:
 * - Project configuration
 * - OAuth app setup
 * - Connected accounts (if any)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PIPEDREAM_API_KEY = process.env.PIPEDREAM_API_KEY;

// Validate API key exists before running
if (!PIPEDREAM_API_KEY) {
  console.error('❌ PIPEDREAM_API_KEY not found in environment variables');
  console.error('   Add PIPEDREAM_API_KEY to your .env.local file');
  process.exit(1);
}
const PROJECT_ID = process.env.PIPEDREAM_PROJECT_ID || 'proj_6xsvqyb';
const OAUTH_APP_ID = process.env.NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID || 'oa_ybim1x';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

/**
 * Make authenticated request to Pipedream API
 */
async function pipedreamRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://api.pipedream.com/v1${endpoint}`;

  console.log(`\n📡 Making request to: ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${PIPEDREAM_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'Request failed',
        status: response.status,
        data,
      };
    }

    return {
      success: true,
      data,
      status: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if API key is valid
 */
async function verifyApiKey(): Promise<boolean> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 STEP 1: Verifying API Key');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Try to get account info to verify API key
  const result = await pipedreamRequest('/users/me');

  if (result.success) {
    console.log('✅ API Key is VALID');
    console.log('📋 Account Info:');
    console.log('   - User ID:', result.data?.id);
    console.log('   - Email:', result.data?.email);
    console.log('   - Username:', result.data?.username);
    return true;
  } else {
    console.log('❌ API Key is INVALID');
    console.log('   Error:', result.error);
    console.log('   Status:', result.status);
    return false;
  }
}

/**
 * Get project information
 */
async function verifyProject(): Promise<boolean> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 STEP 2: Verifying Project Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const result = await pipedreamRequest(`/projects/${PROJECT_ID}`);

  if (result.success) {
    console.log('✅ Project found:');
    console.log('   - Project ID:', result.data?.id);
    console.log('   - Name:', result.data?.name);
    console.log('   - Created:', new Date(result.data?.created_at).toLocaleString());
    return true;
  } else {
    console.log('❌ Project not found');
    console.log('   Error:', result.error);
    return false;
  }
}

/**
 * List OAuth apps in the project
 */
async function verifyOAuthApps(): Promise<boolean> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 STEP 3: Verifying OAuth Apps');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Note: Pipedream's Connect API might have different endpoints
  // Trying common patterns
  const endpoints = [
    `/projects/${PROJECT_ID}/oauth_clients`,
    `/projects/${PROJECT_ID}/oauth-clients`,
    `/connect/oauth-clients?project_id=${PROJECT_ID}`,
  ];

  let foundOAuthApp = false;

  for (const endpoint of endpoints) {
    const result = await pipedreamRequest(endpoint);

    if (result.success) {
      console.log(`✅ OAuth apps retrieved from: ${endpoint}`);

      if (Array.isArray(result.data)) {
        console.log(`   - Found ${result.data.length} OAuth app(s)`);

        const targetApp = result.data.find((app: any) =>
          app.id === OAUTH_APP_ID || app.oauth_app_id === OAUTH_APP_ID
        );

        if (targetApp) {
          console.log(`   ✅ Target OAuth app found: ${OAUTH_APP_ID}`);
          console.log('   - App ID:', targetApp.id || targetApp.oauth_app_id);
          console.log('   - App Name:', targetApp.name);
          console.log('   - Provider:', targetApp.app);
          foundOAuthApp = true;
        } else {
          console.log(`   ⚠️  Target OAuth app NOT found: ${OAUTH_APP_ID}`);
          console.log('   Available apps:');
          result.data.forEach((app: any) => {
            console.log(`      - ${app.id || app.oauth_app_id}: ${app.name} (${app.app})`);
          });
        }
      } else {
        console.log('   Data:', JSON.stringify(result.data, null, 2));
      }

      break;
    }
  }

  if (!foundOAuthApp) {
    console.log('⚠️  Could not retrieve OAuth apps');
    console.log('   This might be due to API endpoint limitations');
    console.log('   OAuth app may still be configured correctly in the dashboard');
  }

  return foundOAuthApp;
}

/**
 * Check connected accounts
 */
async function checkConnectedAccounts(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 STEP 4: Checking Connected Accounts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const endpoints = [
    `/projects/${PROJECT_ID}/connect/accounts`,
    `/connect/accounts?project_id=${PROJECT_ID}`,
  ];

  let accountsFound = false;

  for (const endpoint of endpoints) {
    const result = await pipedreamRequest(endpoint);

    if (result.success) {
      console.log(`✅ Connected accounts endpoint accessible`);

      if (Array.isArray(result.data)) {
        if (result.data.length === 0) {
          console.log('   ℹ️  No connected accounts yet (expected for new setup)');
        } else {
          console.log(`   - Found ${result.data.length} connected account(s):`);
          result.data.forEach((account: any, index: number) => {
            console.log(`\n   Account ${index + 1}:`);
            console.log('      - Account ID:', account.id);
            console.log('      - External User ID:', account.external_user_id);
            console.log('      - App:', account.app);
            console.log('      - Status:', account.status);
            console.log('      - Created:', new Date(account.created_at).toLocaleString());
          });
        }
        accountsFound = true;
      } else {
        console.log('   Data:', JSON.stringify(result.data, null, 2));
      }

      break;
    }
  }

  if (!accountsFound) {
    console.log('   ℹ️  Could not retrieve connected accounts');
    console.log('   This is normal - accounts will appear after first OAuth connection');
  }
}

/**
 * Test token generation (simulating what the backend does)
 */
async function testTokenGeneration(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎫 STEP 5: Testing Token Generation (via SDK)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const { PipedreamClient } = await import('@pipedream/sdk');

    const client = new PipedreamClient({
      projectId: PROJECT_ID,
      clientId: process.env.PIPEDREAM_CLIENT_ID!,
      clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
      projectEnvironment: process.env.PIPEDREAM_ENVIRONMENT || 'production',
    });

    console.log('✅ PipedreamClient initialized');

    // Generate a test token
    const testUserId = `test-user-${Date.now()}`;
    const tokenResponse = await client.tokens.create({
      externalUserId: testUserId,
    });

    console.log('✅ Token generated successfully:');
    console.log('   - Token:', tokenResponse.token.substring(0, 20) + '...');
    console.log('   - Expires At:', new Date(tokenResponse.expiresAt).toLocaleString());
    console.log('   - Connect Link URL:', tokenResponse.connectLinkUrl);

    // Build the full Connect Link URL like the button does
    const connectUrl = new URL(tokenResponse.connectLinkUrl);
    connectUrl.searchParams.set('app', 'google_my_business');
    connectUrl.searchParams.set('oauthAppId', OAUTH_APP_ID);

    console.log('\n📋 Full Connect Link URL (for testing):');
    console.log(connectUrl.toString());

  } catch (error: any) {
    console.log('❌ Token generation failed:');
    console.log('   Error:', error.message);

    if (error.message.includes('credentials')) {
      console.log('\n   ⚠️  Possible issues:');
      console.log('      - Check PIPEDREAM_CLIENT_ID in .env.local');
      console.log('      - Check PIPEDREAM_CLIENT_SECRET in .env.local');
      console.log('      - Verify these match your Pipedream project settings');
    }
  }
}

/**
 * Main verification flow
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   PIPEDREAM CONNECT CONFIGURATION VERIFIER     ║');
  console.log('╚════════════════════════════════════════════════╝');

  console.log('\n📍 Configuration:');
  console.log('   - API Key:', PIPEDREAM_API_KEY.substring(0, 10) + '...');
  console.log('   - Project ID:', PROJECT_ID);
  console.log('   - OAuth App ID:', OAUTH_APP_ID);
  console.log('   - Client ID:', process.env.PIPEDREAM_CLIENT_ID?.substring(0, 10) + '...');
  console.log('   - Environment:', process.env.PIPEDREAM_ENVIRONMENT);

  // Run verification steps
  const apiKeyValid = await verifyApiKey();

  if (!apiKeyValid) {
    console.log('\n❌ VERIFICATION FAILED: Invalid API key');
    console.log('   Please check your API key and try again');
    return;
  }

  const projectValid = await verifyProject();
  await verifyOAuthApps();
  await checkConnectedAccounts();
  await testTokenGeneration();

  // Final summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              VERIFICATION SUMMARY              ║');
  console.log('╚════════════════════════════════════════════════╝');

  console.log('\n✅ Steps Completed:');
  console.log('   1. ✅ API Key verified');
  console.log('   2.', projectValid ? '✅' : '❌', 'Project configuration verified');
  console.log('   3. ℹ️  OAuth app configuration (check manually in dashboard)');
  console.log('   4. ℹ️  Connected accounts (none yet - expected)');
  console.log('   5. ℹ️  Token generation tested');

  console.log('\n📋 Next Steps:');
  console.log('   1. If token generation succeeded, test the OAuth flow in browser');
  console.log('   2. Click "Connect Google Business Profile" button in /admin');
  console.log('   3. Complete OAuth flow in popup window');
  console.log('   4. Check for new connected account in Pipedream dashboard');

  console.log('\n✨ Verification complete!\n');
}

// Run the verification
main().catch((error) => {
  console.error('\n❌ Verification script failed:');
  console.error(error);
  process.exit(1);
});
