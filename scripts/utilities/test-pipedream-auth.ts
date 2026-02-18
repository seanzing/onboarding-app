/**
 * Test Pipedream Authentication Methods
 *
 * Tries different auth methods to find what works with the new credentials.
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PIPEDREAM_PROJECT_ID = process.env.PIPEDREAM_PROJECT_ID;
const PIPEDREAM_API_KEY = process.env.PIPEDREAM_API_KEY;
const PIPEDREAM_CLIENT_ID = process.env.PIPEDREAM_CLIENT_ID;
const PIPEDREAM_CLIENT_SECRET = process.env.PIPEDREAM_CLIENT_SECRET;

console.log('🔑 PIPEDREAM CREDENTIALS:\n');
console.log(`  Project ID:    ${PIPEDREAM_PROJECT_ID}`);
console.log(`  API Key:       ${PIPEDREAM_API_KEY?.substring(0, 10)}...`);
console.log(`  Client ID:     ${PIPEDREAM_CLIENT_ID?.substring(0, 20)}...`);
console.log(`  Client Secret: ${PIPEDREAM_CLIENT_SECRET?.substring(0, 10)}...`);

const endpoint = `https://api.pipedream.com/v1/connect/${PIPEDREAM_PROJECT_ID}/accounts`;

async function testAuth(name: string, headers: Record<string, string>) {
  console.log(`\n───────────────────────────────────────────────────────`);
  console.log(`🔐 Testing: ${name}`);
  console.log(`───────────────────────────────────────────────────────`);

  try {
    const response = await fetch(endpoint, { headers });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (response.ok) {
        console.log(`✅ SUCCESS! Found ${json.data?.length || 0} accounts`);
        if (json.data?.length > 0) {
          json.data.forEach((acc: any) => {
            console.log(`   - ${acc.id}: ${acc.name || acc.app}`);
          });
        }
      } else {
        console.log(`❌ FAILED: ${json.error || json.message || text}`);
      }
    } catch {
      console.log(`Response: ${text.substring(0, 200)}`);
    }

    return response.ok;
  } catch (error) {
    console.log(`❌ ERROR: ${error}`);
    return false;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 TESTING PIPEDREAM AUTHENTICATION METHODS');
  console.log('═══════════════════════════════════════════════════════');

  // Method 1: Bearer token with API key
  await testAuth('Bearer Token (API Key)', {
    Authorization: `Bearer ${PIPEDREAM_API_KEY}`,
    'Content-Type': 'application/json',
  });

  // Method 2: Basic auth with client credentials
  const basicAuth = Buffer.from(`${PIPEDREAM_CLIENT_ID}:${PIPEDREAM_CLIENT_SECRET}`).toString('base64');
  await testAuth('Basic Auth (Client ID:Secret)', {
    Authorization: `Basic ${basicAuth}`,
    'Content-Type': 'application/json',
  });

  // Method 3: X-API-Key header
  await testAuth('X-API-Key Header', {
    'X-API-Key': PIPEDREAM_API_KEY!,
    'Content-Type': 'application/json',
  });

  // Method 4: API key as query parameter (different endpoint format)
  console.log(`\n───────────────────────────────────────────────────────`);
  console.log(`🔐 Testing: Query Parameter (api_key)`);
  console.log(`───────────────────────────────────────────────────────`);

  try {
    const response = await fetch(`${endpoint}?api_key=${PIPEDREAM_API_KEY}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 200)}`);
  } catch (error) {
    console.log(`❌ ERROR: ${error}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 TESTING COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
