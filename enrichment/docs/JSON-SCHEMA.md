# Enriched Business JSON Schema

This document defines all fields in the enriched business JSON format used for directory submissions.

## Overview

Each enriched business profile contains **29 top-level keys** organized into logical groups:
- Identity & Source (4 fields)
- Contact Information (4 fields)
- Location (6 fields)
- Business Details (4 fields)
- Media (3 fields)
- Social Media (1 object with 6 properties)
- Attributes (1 object with 5 properties)
- Services & Certifications (2 fields)
- Metadata (4 fields)

---

## Field Definitions

### Identity & Source

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hubspotContactId` | string | ✅ YES | HubSpot CRM contact ID (e.g., "536151"). Used to link all data back to source. |
| `hubspotUrl` | string | ✅ YES | Full URL to HubSpot record. Format: `https://app.hubspot.com/contacts/39784316/record/0-1/{id}` |
| `businessName` | string | ✅ YES | Official business name as it should appear in directories |
| `businessNameAlternate` | string \| null | ❌ NO | DBA, trade name, or abbreviated name (e.g., "In Design by K" for "In Design by Kristina") |

### Contact Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | ✅ YES | Primary business phone. Format: `(XXX) XXX-XXXX` or `+1 (XXX) XXX-XXXX` |
| `phoneSecondary` | string \| null | ❌ NO | Secondary phone (cell, alternate line). Same format as primary. |
| `email` | string | ✅ YES | Primary business email. Prefer business domain over personal (gmail, yahoo, etc.) |
| `website` | string \| null | ❌ NO | Full website URL including `https://`. Set to `null` if business has no website. |

### Location

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `streetAddress` | string \| null | ❌ NO | Street address (e.g., "902 E Marietta Ave", "6381 Auburn Blvd., Ste. C") |
| `city` | string | ✅ YES | City name |
| `state` | string | ✅ YES | **Full state name** (e.g., "Illinois", not "IL"). BrightLocal requires full name. |
| `zipCode` | string \| null | ❌ NO | 5-digit ZIP code (e.g., "61616") |
| `country` | string | ✅ YES | Always "United States" for US businesses |
| `serviceArea` | string \| null | ❌ NO | Geographic service area description. Include city names and radius if applicable. |

**Example serviceArea values:**
- `"Central Illinois - Peoria, Springfield, Bloomington, Champaign, and surrounding areas"`
- `"Henderson, Las Vegas, North Las Vegas, Boulder City, and surrounding Clark County communities. Remote services available nationwide."`

### Business Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shortDescription` | string | ✅ YES | ~150 characters. Used for directory listings and meta descriptions. |
| `longDescription` | string \| null | ❌ NO | Full business description. 500-2000 characters recommended. Include history, services, unique value proposition. |
| `categories` | string[] | ✅ YES | Array of relevant business categories. Primary category first. |
| `businessHours` | object \| null | ❌ NO | Object with days as keys. See Business Hours section below. |

**Category Guidelines:**
- Use standard directory categories (e.g., "Photographer", "Accountant", "Plumber")
- First category should be primary business type
- Include 2-4 categories maximum
- BrightLocal has specific category IDs - see [ENRICHMENT-GUIDE.md](ENRICHMENT-GUIDE.md)

**Example categories:**
```json
["Photographer", "Wedding Photographer", "Graphic Designer", "Portrait Photographer"]
["Bookkeeping Service", "Accountant", "Financial Services", "Tax Preparation"]
```

### Business Hours Object

| Property | Type | Description |
|----------|------|-------------|
| `monday` | string | Hours for Monday (e.g., "9:00 AM - 5:00 PM", "Closed") |
| `tuesday` | string | Hours for Tuesday |
| `wednesday` | string | Hours for Wednesday |
| `thursday` | string | Hours for Thursday |
| `friday` | string | Hours for Friday |
| `saturday` | string | Hours for Saturday |
| `sunday` | string | Hours for Sunday |

**Format examples:**
- Standard: `"9:00 AM - 5:00 PM"`
- Extended: `"9:00 AM - 12:00 AM"` (midnight)
- Closed: `"Closed"`
- 24/7: `"Open 24 Hours"`

### Media

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `logo` | string \| null | ❌ NO | Path to logo file. Format: `public/images/brightlocal/{business-slug}/logo.png` |
| `images` | string[] | ❌ NO | Array of image paths. Business photos, portfolio, location, etc. |
| `imagesNote` | string \| null | ❌ NO | Note about images (e.g., "Certifications badge image showing BBB and QuickBooks ProAdvisor credentials") |

**Image path format:**
```json
"logo": "public/images/brightlocal/in-design-kristina/logo.png",
"images": [
  "public/images/brightlocal/in-design-kristina/wedding-primary1.jpg",
  "public/images/brightlocal/in-design-kristina/wedding-primary2.jpg"
]
```

### Social Media Object

| Property | Type | Description |
|----------|------|-------------|
| `facebook` | string \| null | Full Facebook URL (page or profile) |
| `instagram` | string \| null | Full Instagram URL |
| `twitter` | string \| null | Full Twitter/X URL |
| `linkedin` | string \| null | Full LinkedIn URL (company or personal page) |
| `yelp` | string \| null | Full Yelp business page URL |
| `tiktok` | string \| null | Full TikTok URL |

**Example:**
```json
"socialMedia": {
  "facebook": "https://facebook.com/profile.php?id=61552623096822",
  "instagram": "https://instagram.com/in_design_by_k/",
  "twitter": null,
  "linkedin": null,
  "yelp": "https://yelp.com/biz/in-design-by-kristina-peoria-heights",
  "tiktok": null
}
```

### Attributes Object

| Property | Type | Description |
|----------|------|-------------|
| `languages` | string[] | Languages spoken (e.g., ["English", "Spanish"]) |
| `paymentMethods` | string[] | Accepted payment methods |
| `accessibility` | string \| null | Accessibility features (e.g., "Wheelchair Accessible") |
| `parking` | string \| null | Parking information (e.g., "Off-street parking available") |
| `yearsInBusiness` | string \| null | How long in business (e.g., "6+", "37+ (Founded 1988)") |
| `license` | string \| null | Professional license info (e.g., "IRS Licensed, CTEC Approved") |

**Payment methods examples:**
```json
["Cash", "Visa", "Mastercard", "American Express", "Discover", "PayPal", "Check"]
["Cash", "Credit Card", "Debit Card", "Check", "Invoice"]
```

### Services & Certifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `services` | string[] | ❌ NO | Array of specific services offered |
| `certifications` | string[] | ❌ NO | Professional certifications, licenses, accreditations |

**Example services:**
```json
"services": [
  "Wedding Photography",
  "Engagement Sessions",
  "Family Portraits",
  "Graphic Design",
  "Logo Design"
]
```

**Example certifications:**
```json
"certifications": [
  "QuickBooks ProAdvisor",
  "BBB A+ Rating",
  "IRS Licensed",
  "CTEC Approved"
]
```

### Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | string | ✅ YES | **CRITICAL**: Evidence linking HubSpot to enriched data. See Notes Format below. |
| `enrichmentDate` | string | ✅ YES | Date enrichment performed. Format: `YYYY-MM-DD` |
| `enrichmentSources` | string[] | ✅ YES | List of sources used for enrichment |
| `dataSource` | string | ✅ YES | Always `"hubspot + web enrichment via Claude Code MCP"` |

---

## Notes Field Format

The `notes` field is **critical** for data integrity. It must provide explicit evidence linking the HubSpot contact to the enriched data.

### Standard Format

```
EVIDENCE LINKING: HubSpot contact ID {ID} confirmed via:
(1) {Phone evidence},
(2) {Email evidence},
(3) {Address evidence}.
{Additional discovery notes}.
```

### Evidence Types

| Type | Description | Example |
|------|-------------|---------|
| **Phone Match** | HubSpot phone found on website | "Phone (309) 214-1477 in HubSpot matches website contact" |
| **Email Match** | Email domain matches website | "Email domain matches website domain" |
| **Owner Link** | Personal email links to business owner | "HubSpot personal email kvelps74@gmail.com links to owner Kristina Velpel" |
| **Address Verify** | Address confirmed on multiple sources | "Address '902 E Marietta Ave' in HubSpot matches Google Business Profile" |
| **License Verify** | License confirmed with state registry | "Florida contractor license #66140 verified on BuildZoom" |
| **Social Confirm** | Social profiles confirm identity | "Instagram @in_design_by_k and Facebook profile confirm same business" |

### Example Notes

**Simple Match (all data in HubSpot matches website):**
```json
"notes": "EVIDENCE LINKING: HubSpot contact ID 536151 confirmed via: (1) Phone (309) 214-1477 in HubSpot matches website contact, (2) HubSpot personal email kvelps74@gmail.com links to owner Kristina Velpel (surname Velpel matches email), business email indesignbykristina@gmail.com matches domain, (3) Address '902 E Marietta Ave, Peoria Heights, IL 61616' in HubSpot matches Google Business Profile location. Instagram @in_design_by_k and Facebook profile 61552623096822 confirm same business."
```

**Complex Match (owner name in HubSpot, multiple business entities):**
```json
"notes": "EVIDENCE LINKING: HubSpot contact ID 9758596866 is for owner Laurence Streidel (personal name in CRM). Confirmed via: (1) HubSpot phone (301) 807-3389 matches business website contact, (2) HubSpot address '638 Lofstrand Lane, Rockville, MD 20850' matches business address exactly, (3) LinkedIn profile linkedin.com/in/laurence-streidel-2499b954 confirms owner of Decorative Film Crew/Interior Guards. Operates two brands: Decorative Film Crew and Interior Guards Window Tinting, LLC."
```

**Challenging Match (minimal HubSpot data, extensive research required):**
```json
"notes": "EVIDENCE LINKING: HubSpot contact ID 1055 confirmed via: (1) Email franaconstruction@gmail.com matches BuildZoom profile and Lee County records, (2) Florida contractor license #66140 verified on BuildZoom for Matthew Frana, (3) Florida Sunbiz confirms LLC #L18000284577 formed 2018. Phone 507-339-3949 in HubSpot is Minnesota area code - likely owner's personal cell from before relocating to Florida. Primary business phone (239) 823-6503 from Fort Myers area. No website exists."
```

---

## Complete Example

```json
{
  "hubspotContactId": "536151",
  "hubspotUrl": "https://app.hubspot.com/contacts/39784316/record/0-1/536151",

  "businessName": "In Design by Kristina",
  "businessNameAlternate": "In Design by K",

  "phone": "(309) 214-1477",
  "phoneSecondary": null,
  "email": "indesignbykristina@gmail.com",
  "website": "https://www.indesignbykristina.com/",

  "streetAddress": "902 E Marietta Ave",
  "city": "Peoria Heights",
  "state": "Illinois",
  "zipCode": "61616",
  "country": "United States",
  "serviceArea": "Central Illinois - Peoria, Springfield, Bloomington, Champaign, and surrounding areas",

  "shortDescription": "Creative photography & design studio specializing in weddings, engagements, family portraits, and graphic design. 6+ years experience. Serving Central Illinois.",
  "longDescription": "In Design by Kristina is a creative studio founded by Kristina Velpel...",
  "categories": ["Photographer", "Wedding Photographer", "Graphic Designer", "Portrait Photographer"],

  "businessHours": {
    "monday": "9:00 AM - 12:00 AM",
    "tuesday": "9:00 AM - 12:00 AM",
    "wednesday": "9:00 AM - 12:00 AM",
    "thursday": "9:00 AM - 12:00 AM",
    "friday": "9:00 AM - 12:00 AM",
    "saturday": "9:00 AM - 12:00 AM",
    "sunday": "9:00 AM - 12:00 AM"
  },

  "logo": "public/images/brightlocal/in-design-kristina/logo.png",
  "images": [
    "public/images/brightlocal/in-design-kristina/wedding-primary1.jpg",
    "public/images/brightlocal/in-design-kristina/wedding-primary2.jpg",
    "public/images/brightlocal/in-design-kristina/kristina-primary3.jpg"
  ],
  "imagesNote": null,

  "socialMedia": {
    "facebook": "https://facebook.com/profile.php?id=61552623096822",
    "instagram": "https://instagram.com/in_design_by_k/",
    "twitter": null,
    "linkedin": null,
    "yelp": "https://yelp.com/biz/in-design-by-kristina-peoria-heights",
    "tiktok": null
  },

  "attributes": {
    "languages": ["English"],
    "paymentMethods": ["Cash", "Visa", "Mastercard", "American Express", "Discover", "PayPal", "Check"],
    "accessibility": null,
    "parking": null,
    "yearsInBusiness": "6+",
    "license": null
  },

  "services": [
    "Wedding Photography",
    "Engagement Sessions",
    "Couple Sessions",
    "Family Portraits",
    "Individual/Portrait Sessions",
    "Senior Photos",
    "Graphic Design",
    "Logo Design"
  ],

  "certifications": [],
  "notes": "EVIDENCE LINKING: HubSpot contact ID 536151 confirmed via: (1) Phone (309) 214-1477 in HubSpot matches website contact, (2) HubSpot personal email kvelps74@gmail.com links to owner Kristina Velpel (surname Velpel matches email), business email indesignbykristina@gmail.com matches domain, (3) Address '902 E Marietta Ave, Peoria Heights, IL 61616' in HubSpot matches Google Business Profile location. Instagram @in_design_by_k and Facebook profile 61552623096822 confirm same business. Yelp listing at 'in-design-by-kristina-peoria-heights' matches all details.",

  "enrichmentDate": "2025-11-28",
  "enrichmentSources": ["HubSpot CRM", "indesignbykristina.com", "Google Business Profile", "Facebook", "Instagram", "Yelp", "BrightLocal"],
  "dataSource": "hubspot + web enrichment via Claude Code MCP"
}
```

---

## Validation Checklist

Before saving an enriched file:

- [ ] `hubspotContactId` - Valid HubSpot contact ID
- [ ] `hubspotUrl` - Full URL to HubSpot record
- [ ] `businessName` - Official business name
- [ ] `phone` - Formatted correctly: `(XXX) XXX-XXXX`
- [ ] `email` - Valid business email
- [ ] `city` - City name present
- [ ] `state` - **Full state name** (not abbreviation)
- [ ] `country` - "United States"
- [ ] `shortDescription` - ~150 characters
- [ ] `categories` - At least one category
- [ ] `notes` - Contains "EVIDENCE LINKING:" with explicit proof
- [ ] `enrichmentDate` - Today's date in `YYYY-MM-DD` format
- [ ] `enrichmentSources` - Lists all sources used
- [ ] `dataSource` - Set to standard value
- [ ] `website` - Includes `https://` if present (or `null` if no website)

---

## File Naming Convention

Files are saved to `enrichment/enriched/` with the following format:

```
NN-business-name-slug.json
```

Where:
- `NN` = Two-digit sequence number (01, 02, ... 17)
- `business-name-slug` = Lowercase, hyphenated business name

**Examples:**
- `01-the-dog-tutor.json`
- `09-accurately-yours-accounting-solutions.json`
- `11-in-design-by-kristina.json`
- `16-frana-construction.json`

---

**See Also**: [ENRICHMENT-GUIDE.md](ENRICHMENT-GUIDE.md) for step-by-step enrichment instructions
