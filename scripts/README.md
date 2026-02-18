# Scripts Directory

Organized utility scripts for the Zing Directory App.

## Folder Structure

```
scripts/
├── utilities/     # Diagnostic & debugging tools
├── sync/          # Data synchronization scripts
├── export/        # Export & CSV generation
├── import/        # Data import scripts
└── dangerous/     # ⚠️ Destructive operations (use with caution)
```

---

## 📁 utilities/

Diagnostic and debugging tools for testing integrations.

| Script | Purpose |
|--------|---------|
| `test-hubspot-token.ts` | Validate HubSpot API token |
| `test-hubspot-api.ts` | Test HubSpot API connectivity |
| `test-brightlocal-data.ts` | Debug BrightLocal clients/locations |
| `test-pipedream-auth.ts` | Test Pipedream OAuth flow |
| `test-sync-status.ts` | Check sync operation status |
| `check-supabase-connection.ts` | Test Supabase connectivity |
| `check-supabase-tables.ts` | List Supabase tables |
| `check-pipedream-config.ts` | Verify Pipedream config |
| `check-all-tables-for-hubspot-id.ts` | Audit hubspot_contact_id across tables |
| `check-website-coverage.js` | Check website data coverage |
| `verify-brightlocal-platform.ts` | Verify BrightLocal setup |
| `verify-pipedream-config.ts` | Verify Pipedream setup |
| `verify-schema.js` | Validate JSON schema |
| `list-all-gbp-accounts.ts` | List Google Business Profile accounts |
| `refresh-gbp-token.ts` | Refresh GBP OAuth token |

**Usage:**
```bash
npx tsx scripts/utilities/test-hubspot-token.ts
npx tsx scripts/utilities/check-supabase-connection.ts
```

---

## 🔄 sync/

Data synchronization between HubSpot, Supabase, and BrightLocal.

| Script | Purpose |
|--------|---------|
| `sync-all-contacts-cli.ts` | Full sync of all HubSpot contacts |
| `sync-incremental-cli.ts` | Incremental sync (changes only) |
| `sync-brightlocal-locations.ts` | Sync BrightLocal locations to Supabase |
| `sync-brightlocal-campaigns.ts` | Sync BrightLocal campaigns to Supabase |

**Usage:**
```bash
# Full contact sync
npx tsx scripts/sync/sync-all-contacts-cli.ts

# Incremental sync (faster)
npx tsx scripts/sync/sync-incremental-cli.ts

# BrightLocal sync
npx tsx scripts/sync/sync-brightlocal-locations.ts
npx tsx scripts/sync/sync-brightlocal-campaigns.ts
```

---

## 📤 export/

Export data and generate CSV files.

| Script | Purpose |
|--------|---------|
| `export-all-contacts-daily.ts` | Export all contacts to JSON/CSV |
| `create-brightlocal-csv.ts` | Generate BrightLocal bulk import CSV |

**Usage:**
```bash
npx tsx scripts/export/export-all-contacts-daily.ts
npx tsx scripts/export/create-brightlocal-csv.ts
```

---

## 📥 import/

Import data from external sources.

| Script | Purpose |
|--------|---------|
| `import-enriched-businesses.ts` | Import enriched business JSON to Supabase |

**Usage:**
```bash
npx tsx scripts/import/import-enriched-businesses.ts
```

---

## ⚠️ dangerous/

**WARNING: These scripts DELETE data. Use with extreme caution.**

| Script | Purpose |
|--------|---------|
| `delete-all-data.ts` | Delete ALL data from Supabase tables |
| `delete-all-brightlocal.ts` | Delete all BrightLocal locations/clients |
| `cleanup-via-pg.ts` | Direct PostgreSQL cleanup operations |

**Usage (DANGEROUS):**
```bash
# Review script code first!
npx tsx scripts/dangerous/delete-all-data.ts
```

---

## Prerequisites

Install tsx for running TypeScript scripts:

```bash
pnpm add -D tsx
```

## Environment Variables

Scripts require these environment variables in `.env.local`:

```env
# Required
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# For BrightLocal scripts
BRIGHTLOCAL_API_KEY=xxx

# For Pipedream scripts
NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID=xxx
PIPEDREAM_API_KEY=xxx
```

## Troubleshooting

**401 Unauthorized:**
- Check API tokens are valid
- Verify tokens haven't expired
- Check token scopes/permissions

**Connection Errors:**
- Check Supabase URL is correct
- Verify network connectivity
- Check environment variables are loaded

---

*Last updated: December 2025*
