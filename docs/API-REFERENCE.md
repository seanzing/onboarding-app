# API Reference

## Authentication

- **Session**: Cookie-based auth via Supabase login
- **CRON**: `Authorization: Bearer <CRON_SECRET>` header

---

## Sync APIs

All sync endpoints require `Authorization: Bearer YOUR_CRON_SECRET` header.

### POST /api/sync/all-contacts

Syncs contacts from HubSpot to Supabase. Configured with `maxDuration = 300` for Pro plans.

| Mode | Description | Speed |
|------|-------------|-------|
| `incremental` | Only modified contacts since last sync | 10-30 sec |
| `sync` | Full sync of all 133K+ contacts | 14+ min |
| `insert` | Only new contacts, skips existing | Fast |

**Schedule**: Hourly (0 * * * *)

```bash
curl -X POST "https://domain.vercel.app/api/sync/all-contacts?mode=incremental" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### POST /api/sync/gbp-reviews

Syncs Google Business Profile reviews to Supabase.

**Schedule**: Daily at 6:00 AM UTC (0 6 * * *)

```bash
curl -X POST "https://domain.vercel.app/api/sync/gbp-reviews" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "jobType": "gbp_reviews",
  "recordsFetched": 15,
  "recordsCreated": 5,
  "recordsUpdated": 10,
  "duration": "1.2s"
}
```

---

### POST /api/sync/gbp-analytics

Syncs Google Business Profile search keywords to weekly snapshots.

**Schedule**: Weekly on Sundays at 7:00 AM UTC (0 7 * * 0)

```bash
curl -X POST "https://domain.vercel.app/api/sync/gbp-analytics" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "jobType": "gbp_analytics",
  "recordsFetched": 2,
  "recordsCreated": 1,
  "analytics": {
    "totalKeywords": 2,
    "totalImpressions": 70,
    "topKeywords": [{"keyword": "route36", "impressions": 70}]
  }
}
```

---

### POST /api/sync/brightlocal

Syncs BrightLocal locations and campaigns to Supabase.

**Schedule**: Weekly on Sundays at 8:00 AM UTC (0 8 * * 0)

```bash
curl -X POST "https://domain.vercel.app/api/sync/brightlocal" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "jobType": "brightlocal",
  "locations": {"fetched": 10, "updated": 10, "skipped": 0},
  "campaigns": {"fetched": 5, "created": 2, "updated": 3},
  "duration": "3.3s"
}
```

---

### POST /api/sync/gbp-posts

Syncs Google Business Profile posts to Supabase.

**Schedule**: Weekly on Sundays at 9:00 AM UTC (0 9 * * 0)

```bash
curl -X POST "https://domain.vercel.app/api/sync/gbp-posts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "jobType": "gbp_posts",
  "recordsFetched": 5,
  "recordsCreated": 5,
  "recordsUpdated": 0,
  "duration": "1.5s"
}
```

---

### POST /api/sync/gbp-media

Syncs Google Business Profile photos and videos to Supabase.

**Schedule**: Weekly on Sundays at 10:00 AM UTC (0 10 * * 0)

```bash
curl -X POST "https://domain.vercel.app/api/sync/gbp-media" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "jobType": "gbp_media",
  "recordsFetched": 12,
  "recordsCreated": 12,
  "duration": "2.1s"
}
```

---

### POST /api/sync/gbp-locations

Syncs Google Business Profile location data to Supabase.

**Schedule**: Weekly on Sundays at 11:00 AM UTC (0 11 * * 0)

```bash
curl -X POST "https://domain.vercel.app/api/sync/gbp-locations" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "jobType": "gbp_locations",
  "recordsFetched": 1,
  "recordsCreated": 0,
  "recordsUpdated": 1,
  "duration": "1.8s"
}
```

---

## HubSpot APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hubspot/companies` | GET | List all companies |
| `/api/hubspot/contacts` | GET | List contacts |
| `/api/hubspot/contacts/[id]` | GET | Get single contact |
| `/api/hubspot/contacts/[id]` | PATCH | Update contact (dual-write to HubSpot + Supabase) |
| `/api/hubspot/contacts/[id]/sync` | POST | Force sync single contact |
| `/api/hubspot/analytics` | GET | Analytics data |
| `/api/hubspot/analytics-cached` | GET | Cached analytics |

---

## Supabase APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/supabase/contacts` | GET | Contacts from Supabase |
| `/api/supabase/companies` | GET | Companies from Supabase |
| `/api/supabase/business-profile` | GET | Business profile |
| `/api/supabase/brightlocal` | GET | BrightLocal data |
| `/api/supabase/enriched-businesses` | GET | Enriched business data |

---

## BrightLocal APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/brightlocal/locations` | GET | List locations |
| `/api/brightlocal/locations` | POST | Create location |
| `/api/brightlocal/locations/[id]` | GET | Get location |
| `/api/brightlocal/clients` | GET | List clients |
| `/api/brightlocal/campaigns` | GET | List campaigns |

---

## GBP APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gbp/health` | GET | Health check |
| `/api/gbp/auth/connect` | POST | Start OAuth |
| `/api/gbp/auth/callback` | GET | OAuth callback |
| `/api/gbp/[accountId]/locations` | GET | Account locations |
| `/api/gbp/[accountId]/locations/[id]` | GET | Single location |
| `/api/gbp/reviews` | GET | Reviews |
| `/api/gbp/posts` | GET | Posts |
| `/api/gbp/media` | GET | Media |
| `/api/gbp/analytics` | GET | Analytics |

---

## Admin APIs

All require authenticated session.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/hubspot-status` | GET | HubSpot integration status |
| `/api/admin/supabase-status` | GET | Supabase status |
| `/api/admin/brightlocal-status` | GET | BrightLocal status |
| `/api/admin/sync-integrations` | POST | Trigger all syncs |
| `/api/admin/quick-client` | POST | Create client |

---

## Public APIs (No auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/connect-token` | POST | Generate OAuth token |
| `/api/public/client/[clientId]` | GET | Client info |
| `/api/public/save-connection` | POST | Save connection |
| `/api/places/search` | GET | Search places |
| `/api/places/[placeId]` | GET | Place details |

---

## CRON Configuration

**vercel.json**:
```json
{
  "crons": [
    { "path": "/api/sync/all-contacts?mode=incremental", "schedule": "0 * * * *" },
    { "path": "/api/sync/gbp-reviews", "schedule": "0 6 * * *" },
    { "path": "/api/sync/gbp-analytics", "schedule": "0 7 * * 0" },
    { "path": "/api/sync/brightlocal", "schedule": "0 8 * * 0" },
    { "path": "/api/sync/gbp-posts", "schedule": "0 9 * * 0" },
    { "path": "/api/sync/gbp-media", "schedule": "0 10 * * 0" },
    { "path": "/api/sync/gbp-locations", "schedule": "0 11 * * 0" }
  ]
}
```

### Schedule Summary

| Sync Job | Frequency | Schedule | Time (UTC) |
|----------|-----------|----------|------------|
| HubSpot Contacts | **Hourly** | `0 * * * *` | Every hour at :00 |
| GBP Reviews | **Daily** | `0 6 * * *` | 6:00 AM daily |
| GBP Analytics | **Weekly** | `0 7 * * 0` | 7:00 AM Sundays |
| BrightLocal | **Weekly** | `0 8 * * 0` | 8:00 AM Sundays |
| GBP Posts | **Weekly** | `0 9 * * 0` | 9:00 AM Sundays |
| GBP Media | **Weekly** | `0 10 * * 0` | 10:00 AM Sundays |
| GBP Locations | **Weekly** | `0 11 * * 0` | 11:00 AM Sundays |

Requires Vercel Pro for 300s timeout.
