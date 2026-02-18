# HubSpot to Supabase Sync Guide

Syncs 133K+ contacts from HubSpot CRM to Supabase with hourly incremental updates.

## Sync Architecture

**Fetch-Merge-Upsert Pattern** (never loses data):

```
HubSpot → Sync Service → Supabase
           (Merge)
```

1. **FETCH**: Get existing Supabase record by `hubspot_contact_id`
2. **MERGE**: Overlay HubSpot values only where HubSpot has data (nulls don't overwrite)
3. **UPSERT**: Insert or update the merged record

**Guarantees**: Supabase-only fields preserved, no null overwrites, idempotent operations.

## Sync Modes

| Mode | Speed | Use Case |
|------|-------|----------|
| `incremental` | 10-30 sec | **Hourly CRON** (default) |
| `sync` | 14+ min | Full sync, data recovery |
| `insert` | Fast | One-time imports only |

### Incremental Mode

Uses HubSpot Search API with `lastmodifieddate >= midnight UTC` for safety margin.

### Full Sync Mode

Fetches all 133K+ contacts with cursor pagination, rate limiting (150ms delay), and deduplication.

## Lifecycle Stage Translation

HubSpot numeric IDs → human-readable labels:

| ID | Label |
|----|-------|
| 944991848 | HOT |
| 999377175 | Active |
| 946862144 | DNC |
| 958707767 | No Show |
| 81722417 | Zing Employee |
| 1000822942 | Reengage |
| 1009016957 | VC |
| customer | Customer |
| lead | Lead |

**Distribution**: Lead (81%), DNC (4.4%), Reengage (2.9%), Customer (2.1%), Active (2.1%), HOT (1.1%)

## CRON Configuration

**vercel.json**:
```json
{
  "crons": [{
    "path": "/api/sync/all-contacts?mode=incremental",
    "schedule": "0 * * * *"
  }]
}
```

**Function timeout**: `maxDuration = 300` (Vercel Pro required)

**Authentication**: `Authorization: Bearer <CRON_SECRET>` header

## API Usage

```bash
# Incremental (recommended)
curl -X POST "https://domain.vercel.app/api/sync/all-contacts?mode=incremental" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Full sync
curl -X POST "https://domain.vercel.app/api/sync/all-contacts?mode=sync" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "totalContacts": 150,
  "updated": 150,
  "duration": "12s",
  "mode": "incremental"
}
```

## CLI Scripts

```bash
npx tsx scripts/sync-all-contacts-cli.ts           # Manual sync
npx tsx scripts/count-lifecycle-stages.ts          # Distribution stats
```

## Properties Synced (29 fields)

**Core**: firstname, lastname, email, phone, company
**Address**: address, city, state, zip, country
**HubSpot**: lifecyclestage, hs_lead_status, hs_object_id, createdate, lastmodifieddate
**Analytics**: hs_email_domain, hs_analytics_source, page_views, visits

## Database Schema

```sql
-- Key columns
hubspot_contact_id    -- HubSpot ID (unique)
user_id               -- Supabase user (for RLS)
lifecyclestage        -- Translated label
synced_at             -- Last sync timestamp

-- Supabase-only (preserved during sync)
business_type, locations, active_customer, gbp_ready
```

**Unique constraint**: `(hubspot_contact_id, user_id)`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Timeout | Use `incremental` mode, verify `maxDuration = 300` |
| Rate limiting | Automatic: 150ms delay + exponential backoff |
| Missing labels | Add ID to `LIFECYCLE_STAGE_LABELS` in sync service |
| Auth errors | Verify `CRON_SECRET` env var and header format |
