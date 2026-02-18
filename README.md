# Zing Local Directory Sync

Manages business profiles across HubSpot CRM, BrightLocal directories, and Google Business Profile. Syncs 133K+ contacts with hourly incremental updates.

## Tech Stack

Next.js 15 | React 19 | TypeScript | Supabase | HubSpot API | BrightLocal API | Tamagui | Vercel

## Quick Start

```bash
pnpm install
cp .env.example .env.local  # Configure environment
pnpm dev
```

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
HUBSPOT_ACCESS_TOKEN=pat-na1-your_token
CRON_SECRET=your-secure-random-string
TEST_EMAIL=your-test@email.com
TEST_PASSWORD=your-test-password
```

## Automated Sync

Hourly CRON syncs modified contacts from HubSpot to Supabase.

**vercel.json**:
```json
{
  "crons": [{
    "path": "/api/sync/all-contacts?mode=incremental",
    "schedule": "0 * * * *"
  }]
}
```

### Sync Modes

| Mode | Speed | Use Case |
|------|-------|----------|
| `incremental` | 10-30 sec | Hourly CRON (default) |
| `sync` | 14+ min | Full sync, data recovery |
| `insert` | Fast | One-time imports |

### Lifecycle Stage Translation

HubSpot numeric IDs are automatically translated:

| ID | Label |
|----|-------|
| 944991848 | HOT |
| 946862144 | DNC |
| 999377175 | Active |
| customer | Customer |
| lead | Lead |

## Key Features

- **HubSpot Sync**: Full + incremental modes, lifecycle translation
- **BrightLocal**: Location management, citation campaigns
- **GBP**: OAuth via Pipedream, multi-location support
- **Dual-Write**: Contact updates save to both HubSpot AND Supabase

## Project Structure

```
app/
├── api/           # 48 API routes (sync, hubspot, brightlocal, gbp, admin)
├── components/    # React components
├── hooks/         # Custom hooks
├── (auth)/        # Login, signup pages
lib/
├── sync/          # all-contacts-sync-service.ts
├── supabase/      # Client config
docs/              # 26 documentation files
scripts/           # CLI utilities
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard |
| `/companies` | Company list |
| `/companies/[id]` | Company detail |
| `/brightlocal` | BrightLocal dashboard |
| `/gbp` | GBP management |
| `/enriched` | Enriched businesses |

## Documentation

| Doc | Purpose |
|-----|---------|
| [API-REFERENCE.md](./docs/API-REFERENCE.md) | All 48 endpoints |
| [HUBSPOT-SYNC-GUIDE.md](./docs/HUBSPOT-SYNC-GUIDE.md) | Sync architecture |
| [DATABASE-SCHEMA.md](./docs/DATABASE-SCHEMA.md) | Database schema |
| [CLAUDE.md](./CLAUDE.md) | Dev context |

## Deployment

Requires **Vercel Pro** for 300-second function timeout.

```bash
pnpm build
# Push to GitHub → Vercel auto-deploys
```

## CLI Scripts

```bash
npx tsx scripts/count-lifecycle-stages.ts      # Distribution stats
npx tsx scripts/sync-all-contacts-cli.ts       # Manual sync
```
