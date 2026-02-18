# Enriched Businesses Workflow

Enrich HubSpot customer data and import to Supabase for directory submissions.

## Data Flow

```
HubSpot Customer → Manual Research → JSON File → Supabase → BrightLocal CSV
```

---

## Step 1: Create JSON File

**Location**: `data/enriched-hubspot/XX-business-name.json`

**Naming**: `01-the-dog-tutor.json`, `02-pipeworx-plumbing.json`, etc.

**Required Schema** (29 keys):

```json
{
  "hubspotContactId": "536151",
  "hubspotUrl": "https://app.hubspot.com/contacts/39784316/record/0-1/536151",
  "businessName": "Company Name",
  "businessNameAlternate": "DBA Name",
  "phone": "(555) 123-4567",
  "phoneSecondary": null,
  "email": "info@company.com",
  "website": "https://company.com",
  "streetAddress": "123 Main St",
  "city": "City",
  "state": "State",
  "zipCode": "12345",
  "country": "United States",
  "serviceArea": "Local area description",
  "shortDescription": "~150 char description",
  "longDescription": "Full business description",
  "categories": ["Category 1", "Category 2"],
  "businessHours": {
    "monday": "9:00 AM - 5:00 PM",
    "tuesday": "9:00 AM - 5:00 PM",
    "wednesday": "9:00 AM - 5:00 PM",
    "thursday": "9:00 AM - 5:00 PM",
    "friday": "9:00 AM - 5:00 PM",
    "saturday": "Closed",
    "sunday": "Closed"
  },
  "logo": "public/images/brightlocal/company/logo.png",
  "images": ["public/images/brightlocal/company/photo1.jpg"],
  "imagesNote": null,
  "socialMedia": {
    "facebook": "https://facebook.com/...",
    "instagram": "https://instagram.com/...",
    "twitter": null,
    "linkedin": null,
    "yelp": "https://yelp.com/...",
    "tiktok": null
  },
  "attributes": {
    "languages": ["English"],
    "paymentMethods": ["Cash", "Visa", "Mastercard"],
    "accessibility": null,
    "parking": null,
    "yearsInBusiness": "10+",
    "license": null
  },
  "services": ["Service 1", "Service 2"],
  "certifications": [],
  "notes": null,
  "enrichmentDate": "2025-11-28",
  "enrichmentSources": ["HubSpot CRM", "Company Website"],
  "dataSource": "hubspot + web enrichment"
}
```

---

## Step 2: Verify Schema

```bash
node scripts/verify-schema.js
```

Expected: `✅✅✅ ALL FILES HAVE IDENTICAL SCHEMAS ✅✅✅`

---

## Step 3: Find BrightLocal Category ID

Use Playwright MCP (see [PLAYWRIGHT-MCP-GUIDE.md](./PLAYWRIGHT-MCP-GUIDE.md)):

1. Navigate to `https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import#categories`
2. Click "Categories List" tab
3. Search for business type
4. Note the category ID

**Current Mappings**:

| Business | Category ID |
|----------|-------------|
| The Dog Tutor | 1355 |
| PipeworX Plumbing | 765 |
| Millman & Associates | 1095 |
| Mountain Asphalt LLC | 1102 |
| Decorative Film Crew | 1051 |
| Before and After Skin Care | 893 |
| Highlander Chimney | 1064 |
| Rich's Rainbow Renovations | 997 |
| Accurately Yours | 583 |
| Balance Your Books LLC | 585 |
| In Design by Kristina | 896 |

---

## Step 4: Import to Supabase

```bash
# Push migration (first time only)
supabase db push

# Import businesses
npx tsx scripts/import-enriched-businesses.ts
```

**To add new category mappings**, edit `scripts/import-enriched-businesses.ts`:

```typescript
const BRIGHTLOCAL_CATEGORY_MAP: Record<string, number> = {
  'The Dog Tutor': 1355,
  'New Business Name': 1234,  // Add here
};
```

---

## Step 5: Generate CSV (Optional)

```sql
SELECT
  business_name as "Business Name",
  street_address as "Address 1",
  city as "City",
  state as "State/Province",
  zip_code as "Postcode",
  country as "Country",
  phone as "Telephone",
  website as "URL",
  email as "Email",
  brightlocal_category_id as "Category",
  short_description as "Short Description"
FROM enriched_businesses;
```

---

## Files

| File | Purpose |
|------|---------|
| `data/enriched-hubspot/*.json` | Enriched business data |
| `scripts/verify-schema.js` | Verify JSON consistency |
| `scripts/import-enriched-businesses.ts` | Import to Supabase |
| `supabase/migrations/20251128000000_create_enriched_businesses.sql` | DB migration |

---

**Related**: [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) | [PLAYWRIGHT-MCP-GUIDE.md](./PLAYWRIGHT-MCP-GUIDE.md)
