# Database Schema

Supabase PostgreSQL database for Zing Local Directory Sync.

## Universal Identifier

**All tables link via `hubspot_contact_id`** (HubSpot contact's `hs_object_id`).

```
hubspot_contact_id
    ├── contacts
    ├── enriched_businesses
    ├── brightlocal_locations → brightlocal_campaigns
    └── pipedream_connected_accounts (Google OAuth)
```

---

## Core Tables

### `contacts`
HubSpot customers synced from CRM.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| hubspot_contact_id | TEXT | Universal ID |
| email, first_name, last_name | TEXT | Contact info |
| phone, company | TEXT | Business info |
| lifecycle_stage | TEXT | customer, lead, etc. |
| raw_properties | JSONB | All HubSpot properties |

### `enriched_businesses`
**Master records** for directory submissions.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| hubspot_contact_id | TEXT | Universal ID (UNIQUE) |
| business_name | TEXT | Required |
| business_name_alternate | TEXT | DBA name |
| phone, phone_secondary | TEXT | Phone numbers |
| email, website | TEXT | Contact |
| street_address, city, state, zip_code, country | TEXT | Address |
| service_area | TEXT | Geographic description |
| short_description | TEXT | ~150 chars |
| long_description | TEXT | Full description |
| categories | TEXT[] | Business categories |
| brightlocal_category_id | INTEGER | BrightLocal's category ID |
| business_hours | JSONB | `{"monday": "9-5", ...}` |
| logo | TEXT | File path |
| images | TEXT[] | File paths |
| social_media | JSONB | `{"facebook": "...", ...}` |
| attributes | JSONB | `{"languages": [...], ...}` |
| services | TEXT[] | Services offered |
| certifications | TEXT[] | Certifications |
| enrichment_date | DATE | When enriched |
| enrichment_sources | TEXT[] | Data sources |

### `brightlocal_locations`
Synced from BrightLocal API.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| brightlocal_location_id | TEXT | BrightLocal's ID |
| hubspot_contact_id | TEXT | Universal ID |
| business_name | TEXT | |
| address_line_1, city, state_province, postal_code | TEXT | Address |
| phone, website_url | TEXT | Contact |
| business_categories | TEXT[] | Categories |
| primary_category | TEXT | Main category |

### `brightlocal_campaigns`
Citation builder campaigns.

| Column | Type | Notes |
|--------|------|-------|
| brightlocal_campaign_id | TEXT | BrightLocal's ID |
| hubspot_contact_id | TEXT | Universal ID |
| campaign_status | TEXT | active, paused, completed |
| citations_built, citations_live | INTEGER | Metrics |

### `pipedream_connected_accounts`
Google OAuth connections via Pipedream Connect.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| pipedream_account_id | TEXT | Pipedream's account ID |
| external_id | TEXT | User identifier |
| account_name | TEXT | Google account email |
| app_slug | TEXT | `google_business_profile` |
| healthy | BOOLEAN | Connection health status |
| hubspot_contact_id | TEXT | Universal ID (nullable) |

**Note:** GBP location data is fetched live from Google API, not stored locally.

---

## JSONB Structures

### business_hours
```json
{"monday": "9:00 AM - 5:00 PM", "saturday": "Closed", ...}
```

### social_media
```json
{"facebook": "https://...", "instagram": "https://...", "twitter": null, ...}
```

### attributes
```json
{"languages": ["English"], "paymentMethods": ["Cash", "Visa"], "yearsInBusiness": "10+"}
```

---

## Common Queries

```sql
-- All data for a contact
SELECT c.email, eb.business_name, bl.brightlocal_location_id
FROM contacts c
LEFT JOIN enriched_businesses eb ON eb.hubspot_contact_id = c.hubspot_contact_id
LEFT JOIN brightlocal_locations bl ON bl.hubspot_contact_id = c.hubspot_contact_id
WHERE c.hubspot_contact_id = '536151';

-- Enriched businesses with categories
SELECT business_name, city, state, brightlocal_category_id
FROM enriched_businesses ORDER BY business_name;

-- Extract JSONB
SELECT business_name, business_hours->>'monday' as monday_hours
FROM enriched_businesses;
```

---

## User-Friendly Views (NEW!)

Created November 30, 2025 to simplify natural language database queries.

| View | Description | Use Instead Of |
|------|-------------|----------------|
| `crm_contacts` | HubSpot CRM contacts | `contacts` |
| `customers` | Only Customer lifecycle contacts | `contacts WHERE lifecycle_stage='Customer'` |
| `google_accounts` | Google OAuth connections | `pipedream_connected_accounts` |
| `managed_businesses` | Businesses we manage | `clients` + `enriched_businesses` |
| `citation_locations` | BrightLocal locations | `brightlocal_locations` |
| `citation_campaigns` | Citation campaigns | `brightlocal_campaigns` |
| `sync_history` | Sync operation logs | `customer_sync_logs` |

**Example Queries:**
```sql
-- "How many customers?"
SELECT COUNT(*) FROM customers;

-- "Show businesses we manage"
SELECT * FROM managed_businesses;

-- "What Google accounts are connected?"
SELECT * FROM google_accounts;
```

---

## Migrations

| Migration | Description |
|-----------|-------------|
| `20251118060000` | Renamed hubspot_company_id → hubspot_contact_id |
| `20251128000000` | Created enriched_businesses table |
| `20251130000000` | Deleted 9 empty ghost tables |
| `20251130010000` | Created user-friendly views and comments |

Run migrations: `supabase db push`

---

**Related**: [ENRICHED-BUSINESSES-WORKFLOW.md](./ENRICHED-BUSINESSES-WORKFLOW.md) | [PLAYWRIGHT-MCP-GUIDE.md](./PLAYWRIGHT-MCP-GUIDE.md) | [DATABASE-CLEANUP-PROPOSAL.md](./DATABASE-CLEANUP-PROPOSAL.md)
