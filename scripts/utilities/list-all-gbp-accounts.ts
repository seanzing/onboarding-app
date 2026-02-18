import { PipedreamClient } from '@pipedream/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const client = new PipedreamClient({
    projectId: process.env.PIPEDREAM_PROJECT_ID!,
    clientId: process.env.PIPEDREAM_CLIENT_ID!,
    clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     ALL GBP ACCOUNTS IN YOUR PIPEDREAM PROJECT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // List all accounts (not just for one user)
  const accounts = await client.accounts.list({
    app: 'google_my_business'
  });

  console.log(`Found ${accounts.data?.length || 0} GBP account(s):\n`);

  accounts.data?.forEach((acc, i) => {
    const app = (acc as any).app;
    const isCustom = app?.id?.startsWith('oa_');

    console.log(`${i + 1}. Account: ${acc.name}`);
    console.log(`   Account ID: ${acc.id}`);
    console.log(`   External User: ${(acc as any).externalId || 'N/A'}`);
    console.log(`   OAuth App: ${app?.id}`);
    console.log(`   Type: ${isCustom ? '🔧 CUSTOM' : '📦 DEFAULT'}`);
    console.log(`   Healthy: ${acc.healthy ? '✅' : '❌'}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const customCount = accounts.data?.filter(a => (a as any).app?.id?.startsWith('oa_')).length || 0;
  const defaultCount = (accounts.data?.length || 0) - customCount;

  console.log(`Custom OAuth accounts: ${customCount}`);
  console.log(`Default OAuth accounts: ${defaultCount}`);
  console.log('');
  console.log('Both types work identically for API calls!');
}

main().catch(e => console.error('Error:', e.message));
