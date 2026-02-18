/**
 * Refresh Google Business Profile Access Token
 *
 * Uses the stored refresh token to get a new access token.
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GBP_REFRESH_TOKEN!;

async function refreshToken() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔄 Refreshing GBP Access Token');
  console.log('═'.repeat(60));

  if (!REFRESH_TOKEN) {
    console.error('\n❌ GBP_REFRESH_TOKEN not found in .env.local');
    process.exit(1);
  }

  console.log('\n📡 Calling Google OAuth2 token endpoint...\n');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();

  if (tokens.error) {
    console.error('❌ Token refresh failed:', tokens.error_description || tokens.error);
    process.exit(1);
  }

  console.log('✅ New access token received!\n');
  console.log('─'.repeat(60));
  console.log('NEW ACCESS TOKEN (update GBP_ACCESS_TOKEN in .env.local):');
  console.log('─'.repeat(60));
  console.log(tokens.access_token);
  console.log('─'.repeat(60));
  console.log(`\nExpires in: ${tokens.expires_in} seconds (${Math.round(tokens.expires_in / 60)} minutes)`);
  console.log('\n' + '═'.repeat(60) + '\n');

  return tokens.access_token;
}

refreshToken().catch(console.error);
