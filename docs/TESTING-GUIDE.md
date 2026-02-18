# Pipedream OAuth Testing Guide

**Date**: November 16, 2025
**Purpose**: Test OAuth flow without repeatedly connecting real Google accounts

---

## Overview

This guide explains how to test the Pipedream Connect OAuth integration without needing to go through the full OAuth flow every time. We provide **two testing approaches**:

1. **🧪 Test Mode Button** - UI component that simulates OAuth in browser
2. **🔧 Simulation Script** - Command-line tool for automated testing

---

## 🧪 Method 1: Test Mode Button (Recommended for UI/UX Testing)

### Setup

Add this to your `.env.local`:

```env
NEXT_PUBLIC_ENABLE_OAUTH_TEST_MODE=true
```

### Usage in Components

Replace `ConnectGBPButton` with `ConnectGBPButtonTest`:

```tsx
// Before (real OAuth):
import { ConnectGBPButton } from '@/app/components/ConnectGBPButton';

<ConnectGBPButton
  onSuccess={(accountId) => console.log('Connected:', accountId)}
/>

// After (test mode):
import { ConnectGBPButtonTest } from '@/app/components/ConnectGBPButtonTest';

<ConnectGBPButtonTest
  onSuccess={(accountId) => console.log('Test account:', accountId)}
/>
```

**Or use the auto-switching component**:

```tsx
import { ConnectGBPButtonAuto } from '@/app/components/ConnectGBPButtonTest';

// Automatically uses test mode if NEXT_PUBLIC_ENABLE_OAUTH_TEST_MODE=true
<ConnectGBPButtonAuto
  onSuccess={(accountId) => console.log('Account:', accountId)}
/>
```

### How It Works

When you click the test button:

1. **Verifies authentication** - Checks user is signed in
2. **Shows loading state** - Displays "Connecting (TEST)..." for 2 seconds
3. **Generates test data**:
   - Account ID: `apn_test_1763312779851_g06xa`
   - Name: `Test Account 228`
   - Email: `test517@example.com`
4. **Saves to database** - Calls `/api/pipedream/save-account` like real flow
5. **Updates UI** - Shows "Connected (TEST)" success state
6. **Triggers callback** - Calls `onSuccess` with test account ID

### Visual Differences

Test mode buttons are **orange** instead of purple:
- Real OAuth button: Purple (`$zingPurple`)
- Test mode button: Orange (`$orange10`)
- Icon: Flask icon (🧪) instead of Building2

### Benefits

✅ **Fast** - No popup windows or OAuth redirects
✅ **Reliable** - No network dependencies
✅ **Repeatable** - Can test connect/disconnect flows
✅ **Real data** - Saves to actual database
✅ **Same UI** - Tests loading/success states

---

## 🔧 Method 2: Simulation Script (For Database & API Testing)

### Running the Script

```bash
npx tsx test-oauth-simulation.ts
```

### What It Tests

The script performs a complete simulation:

1. **User Lookup** - Finds test user in Supabase (`nathan@zing-work.com`)
2. **Test Data Generation** - Creates random account data
3. **Database Insert** - Saves account directly to `pipedream_connected_accounts`
4. **Verification** - Queries database to confirm save
5. **Summary** - Shows all created accounts

### Expected Output

```
╔════════════════════════════════════════════════╗
║   OAUTH FLOW SIMULATION TEST                   ║
╚════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  GETTING TEST USER ID FROM SUPABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Found test user: nathan@zing-work.com
   User ID: d4b9846c-c1eb-4b82-8245-b679858189df

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣  GENERATING TEST ACCOUNT DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated Test Account:
  Account ID: apn_test_1763312874019_5a8cd
  Name: Test Account 592
  Email: test72@example.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣  SAVING ACCOUNT DIRECTLY TO DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Bypassing API (requires auth) - inserting directly
✅ Account saved successfully!
   Database ID: ac4c5abb-eda9-438a-9b4c-f28e3beac9c0
   Pipedream Account ID: apn_test_1763312874019_5a8cd
   Name: Test Account 592
   Email: test72@example.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣  VERIFYING ACCOUNT IN DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Found 1 connected account(s) for user:

Account 1:
  ID: ac4c5abb-eda9-438a-9b4c-f28e3beac9c0
  Pipedream Account ID: apn_test_1763312874019_5a8cd
  Name: Test Account 592
  Email: test72@example.com
  App: google_my_business
  Healthy: ✅
  Created: 11/16/2025, 10:07:54 AM
```

### Benefits

✅ **Automated** - Run from command line
✅ **Database testing** - Validates schema and constraints
✅ **No browser** - Can run in CI/CD
✅ **Verification** - Confirms data is saved correctly

---

## 🧹 Cleaning Up Test Data

### Remove Test Accounts from Database

```bash
# Option 1: Use Supabase CLI
supabase db remote --linked
```

Then run SQL:
```sql
DELETE FROM pipedream_connected_accounts
WHERE pipedream_account_id LIKE 'apn_test_%';
```

### Option 2: Delete via Script

```bash
# Create cleanup script
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const result = await supabase
  .from('pipedream_connected_accounts')
  .delete()
  .like('pipedream_account_id', 'apn_test_%');

console.log('Deleted', result.count, 'test accounts');
"
```

---

## 📊 Comparison: Test Mode vs Real OAuth

| Feature | Test Mode | Real OAuth |
|---------|-----------|------------|
| **Speed** | 2 seconds | 10-30 seconds |
| **Requires Google account** | ❌ No | ✅ Yes |
| **Tests OAuth popup** | ❌ No | ✅ Yes |
| **Tests database save** | ✅ Yes | ✅ Yes |
| **Tests UI states** | ✅ Yes | ✅ Yes |
| **Tests Pipedream integration** | ❌ No | ✅ Yes |
| **Generates real tokens** | ❌ No | ✅ Yes |
| **Can use for API calls** | ❌ No | ✅ Yes |
| **Repeatable** | ✅ Yes | ⚠️ Limited |
| **Works offline** | ✅ Yes | ❌ No |

---

## 🎯 When to Use Each Method

### Use Test Mode Button When:
- Testing UI/UX changes
- Developing new features
- Rapid iteration on frontend
- Testing loading/success states
- No internet connection

### Use Real OAuth When:
- Testing end-to-end integration
- Verifying Pipedream connectivity
- Testing actual Google API calls
- QA/staging environments
- Pre-production testing

### Use Simulation Script When:
- Testing database schema
- Automated testing (CI/CD)
- Bulk data generation
- Performance testing
- Backend API testing

---

## 🚨 Common Issues

### Issue: Test accounts not showing in UI

**Cause**: Using real `ConnectGBPButton` instead of `ConnectGBPButtonTest`

**Solution**: Switch to test component or enable `NEXT_PUBLIC_ENABLE_OAUTH_TEST_MODE`

---

### Issue: "User not authenticated"

**Cause**: Tried to connect without signing in

**Solution**: Sign in first at `/login`:
```
Email: nathan@zing-work.com
Password: ZingAdmin2025!
```

---

### Issue: Simulation script can't find user

**Cause**: User hasn't signed in at least once

**Solution**: Sign in via browser first to create user in Supabase

---

### Issue: Database insert fails

**Cause**: Missing migration or RLS policies

**Solution**: Run migration:
```bash
supabase db push
```

---

## ✅ Best Practices

1. **Use test mode for development**: Set `NEXT_PUBLIC_ENABLE_OAUTH_TEST_MODE=true` in local environment
2. **Clean up test data**: Regularly delete test accounts to avoid clutter
3. **Test real OAuth before deployment**: Always verify real flow works before pushing to production
4. **Document test accounts**: Add comments when creating test data
5. **Use descriptive names**: Test accounts should be clearly labeled as tests

---

## 📚 Related Files

- `app/components/ConnectGBPButtonTest.tsx` - Test mode button component
- `test-oauth-simulation.ts` - Simulation script
- `app/api/pipedream/save-account/route.ts` - Save account API endpoint
- `supabase/migrations/20251116164533_add_pipedream_connected_accounts.sql` - Database schema

---

## 🎓 Example Testing Workflow

```bash
# 1. Enable test mode
echo "NEXT_PUBLIC_ENABLE_OAUTH_TEST_MODE=true" >> .env.local

# 2. Start dev server
npm run dev

# 3. Sign in at http://localhost:3333/login
# Email: nathan@zing-work.com
# Password: ZingAdmin2025!

# 4. Navigate to admin page
# http://localhost:3333/admin

# 5. Click "Connect GBP (TEST MODE)"
# Should see orange button with flask icon

# 6. Verify in database
npx tsx test-oauth-simulation.ts

# 7. Clean up test data when done
# Delete accounts with pipedream_account_id LIKE 'apn_test_%'
```

---

**Last Updated**: November 16, 2025
**Maintained by**: Claude Code + Development Team
**Questions**: See PIPEDREAM-IMPLEMENTATION-GUIDE.md
