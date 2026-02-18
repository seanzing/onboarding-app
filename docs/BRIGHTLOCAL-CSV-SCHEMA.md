# BrightLocal CSV Import Schema - Complete Documentation

**Generated:** 2025-11-09
**Account:** nathan@zing-work.com
**Templates Downloaded From:** https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import

---

## Overview

BrightLocal provides two separate CSV templates for bulk importing data:
1. **Clients CSV** - For creating client records
2. **Locations CSV** - For creating location records (the primary template for managing businesses)

**Key Facts:**
- Even the FREE plan supports unlimited locations
- Trial accounts support up to 50 locations
- CSV templates are provided by BrightLocal
- Separate uploads required for clients vs locations
- Locations can reference clients via `Client Reference` field

---

## 1. Clients CSV Schema

**File:** `clients-bulk-import-template.csv`
**Purpose:** Create client records to organize multiple locations under a single client

### Fields (4 total)

| Column Name | Required | Type | Max Length | Description |
|-------------|----------|------|------------|-------------|
| `Company Name` | **YES** | string | 100 chars | Client's company name |
| `Company URL` | **YES** | string | 150 chars | Client's website (e.g., www.example.com) |
| `Unique Reference` | No | string | 50 chars | Internal reference ID for linking locations to this client |
| `Status` | No | enum | - | Either 'client' or 'lead' (or leave blank) |

### Example Data

```csv
Company Name,Company URL,Unique Reference,Status
Test Company,www.test.com,TEST,lead
Acme Corp,www.acmecorp.com,ACME-001,client
```

---

## 2. Locations CSV Schema

**File:** `locations-bulk-import-template-v2.csv`
**Purpose:** Create location records with comprehensive business information for citations

### Total Fields: **77 fields**

#### Required Fields (14)

| Column Name | Type | Description | Example |
|-------------|------|-------------|---------|
| `Location Name` | string (100) | Unique name for each location per client | "Acme Corp - NYC" |
| `Unique Location Reference` | string (50) | Internal reference ID | "ACME-NYC-001" |
| `Status` | enum | Either 'active' or 'adhoc' | "active" |
| `Website URL` | string (256) | Location's website | "www.acmenyc.com" |
| `Business Category ID` | integer | BrightLocal category ID (see Categories List tab) | 503 |
| `Country` | string (3) | 3-letter ISO code (see Countries List tab) | "USA", "GBR", "CAN" |
| `Address 1` | string (80) | Street address | "123 Main Street" |
| `State/County/Region` | string (100) | Required for USA, CAN, AUS | "NY", "California" |
| `Town/City` | string (100) | Required for most countries | "New York" |
| `Postcode/Zip` | string (80) | Postal/ZIP code (optional for Ireland) | "10003", "SW22 E21" |
| `Telephone` | string (20) | Phone in format: 888-645-0838 | "123-456-7891" |

#### Optional Fields - Core Information (13)

| Column Name | Type | Description |
|-------------|------|-------------|
| `Client Reference` | string (50) | Links to client's Unique Reference |
| `Location ID` | integer | Update existing location (leave blank for new) |
| `Address 2` | string (80) | Additional address line |
| `Contact First Name` | string (20) | Contact person first name |
| `Contact Last Name` | string (20) | Contact person last name |
| `Contact Telephone` | string (20) | Contact person phone |
| `Contact Email Address` | string (254) | Contact person email |
| `Contact Fax Number` | string (20) | Contact fax number |
| `Contact Mobile Number` | string (20) | Contact mobile number |
| `Number of Employees` | integer | Number of employees |
| `Date of Company Formation` | string | Format: MM-YYYY (e.g., "01-2010") |
| `Extra Business Categories` | string | Pipe-separated IDs (e.g., "2029\|4991\|605") |

#### Optional Fields - Business Hours (20 fields)

Split hours supported (e.g., 9am-12pm, 1pm-6pm):
- `Monday Start Time`, `Monday End Time`, `Monday Start Time 2`, `Monday End Time 2`
- `Tuesday Start Time`, `Tuesday End Time`, `Tuesday Start Time 2`, `Tuesday End Time 2`
- `Wednesday Start Time`, `Wednesday End Time`, `Wednesday Start Time 2`, `Wednesday End Time 2`
- `Thursday Start Time`, `Thursday End Time`, `Thursday Start Time 2`, `Thursday End Time 2`
- `Friday Start Time`, `Friday End Time`, `Friday Start Time 2`, `Friday End Time 2`
- `Saturday Start Time`, `Saturday End Time`, `Saturday Start Time 2`, `Saturday End Time 2`
- `Sunday Start Time`, `Sunday End Time`, `Sunday Start Time 2`, `Sunday End Time 2`

**Format:** "9:30 am", "14:45", "2:45 pm", "Closed", "N/A"

#### Optional Fields - Payment Methods (12 fields)

Enter "yes" or "no" for each:
- `Cash`
- `Visa`
- `Mastercard`
- `American Express`
- `Personal Check`
- `Invoice`
- `Insurance`
- `ATM / Debit`
- `Traveler's Checks`
- `Financing Available`
- `PayPal`
- `Discover`

#### Optional Fields - Marketing Content (7 fields)

| Column Name | Type | Max Length | Description |
|-------------|------|------------|-------------|
| `Short Description` | string | 200 chars | Brief business description |
| `Full Description` | string | 750 chars | Detailed business description |
| `Service 1` | string | - | Service/product offered |
| `Service 2` | string | - | Service/product offered |
| `Service 3` | string | - | Service/product offered |
| `Service 4` | string | - | Service/product offered |
| `Service 5` | string | - | Service/product offered |

#### Optional Fields - Advanced (7 fields)

| Column Name | Type | Description |
|-------------|------|-------------|
| `Google Ludocid` | string | Google Maps ID for faster matching |
| `Is Service Area Business` | enum | "yes" or "no" |
| `Language` | string | Required for Canada: "en" or "fr" |
| `Logo URL` | URL | URL ending in .jpg or .jpeg |
| `Photo URL 1` | URL | URL ending in .jpg or .jpeg |
| `Photo URL 2` | URL | URL ending in .jpg or .jpeg |
| `Photo URL 3` | URL | URL ending in .jpg or .jpeg |

#### Optional Fields - Social Media (7 fields)

| Column Name | Example |
|-------------|---------|
| `Facebook URL` | https://en-gb.facebook.com/brightlocal/ |
| `X URL` | https://twitter.com/bright_local |
| `LinkedIn URL` | https://uk.linkedin.com/company/bright-local-seo |
| `Pinterest URL` | https://www.pinterest.co.uk/brightlocal/ |
| `Instagram URL` | https://www.instagram.com/instagram/ |
| `TikTok URL` | https://www.tiktok.com/@brightlocal/ |
| `YouTube URL` | https://www.youtube.com/@BrightLocal/ |

---

## 3. Field Validation Rules

### Character Restrictions

**Website URL / Company URL:**
- Only: digits 0-9, letters, special characters `/`, `:`, `.`
- Must have correct domain ending (.com, .co.uk, .net, etc.)

**Address Fields:**
- Only: digits 0-9, letters, special characters `/`, `,`, `.`, `-`, `&`

**Phone Numbers:**
- Only: digits 0-9, special characters `-`, `(`, `)`
- Valid formats: 888-645-0838, 01224 872 553, 02 7010 1123

**Postcode/Zip:**
- Only: letters, digits 0-9, spaces, dashes `-`

**Photo/Logo URLs:**
- Characters: A-Z, a-z, 0-9, -, ., \_, ~, :, /, ?, #, [, ], @, !, $, &, ', (, ), *, +, ,, ;, =
- Must end with .jpg or .jpeg file extension

### Country-Specific Requirements

**State/County/Region:**
- **Required:** Australia, Canada, United States
- **Optional:** Germany, Hong Kong, Ireland, Macau, Netherlands, New Zealand, Singapore, South Africa, Philippines, Taiwan, United Kingdom

**Town/City:**
- **Required:** Australia, Canada, Germany, Hong Kong, Ireland, Netherlands, New Zealand, South Africa, Philippines, Taiwan, United Kingdom, United States
- **Optional:** Macau, Singapore

**Postcode/Zip:**
- **Optional:** Ireland (all other countries require it)

**Language:**
- **Required for Canada:** "en" (English) or "fr" (French)

---

## 4. Example Location Records

### Example 1: US Location (Full Details)

```csv
Client Reference,Location Name,Location ID,Unique Location Reference,Status,Website URL,Business Category ID,Country,Address 1,Address 2,State/County/Region,Town/City,Postcode/Zip,Telephone,Contact First Name,Contact Last Name,Contact Telephone,Contact Email Address,Contact Fax Number,Contact Mobile Number,Number of Employees,Date of Company Formation,Extra Business Categories,Monday Start Time,Monday End Time,Monday Start Time 2,Monday End Time 2,...
CLIENT001,Test Location,,TEST-LOC1,active,www.testlocation.com,503,USA,Example street,Example building,NY,New York,10003,123-456-7891,John,Smith,123-456-7891,test@test.com,123-456-7891,123-456-7891,53,11-1999,2029|4991|605,9:30 am,12:00 pm,1:00 pm,6:00 pm,...
```

### Example 2: UK Location (Minimal Required Fields)

```csv
Client Reference,Location Name,Unique Location Reference,Status,Website URL,Business Category ID,Country,Address 1,Town/City,Postcode/Zip,Telephone
,London Office,LON-001,active,www.example.co.uk,905,GBR,10 Downing Street,London,SW1A 2AA,020 1234 5678
```

### Example 3: Canadian Location (with Language)

```csv
Client Reference,Location Name,Unique Location Reference,Status,Website URL,Business Category ID,Country,Address 1,State/County/Region,Town/City,Postcode/Zip,Telephone,Language
,Toronto Office,TOR-001,active,www.example.ca,905,CAN,123 Main St,Ontario,Toronto,M5S 2C6,416-123-4567,en
```

---

## 5. Workflow for 2000 Clients

### Step-by-Step Process

**1. Prepare Client Data (Optional)**
- Create `clients.csv` with company info
- Assign unique reference to each client
- Upload to BrightLocal

**2. Prepare Location Data**
- Export 2000 client records from your CRM/database
- Map fields to BrightLocal schema (see mapping section below)
- Populate required fields minimum
- Add optional fields for better citation quality
- Save as `locations.csv`

**3. Upload to BrightLocal**
- Navigate to: All Locations → Add Location(s)
- Select "Two or more Locations"
- Choose "Upload Location details using a CSV file"
- Upload `locations.csv`
- BrightLocal validates and imports all rows

**4. Review Imported Locations**
- Check "All Locations" dashboard
- Verify all 2000 locations imported successfully
- Fix any validation errors

**5. Create Citation Campaigns**
- For each location, create Citation Builder campaign
- BrightLocal uses CSV data to populate citation forms
- Pay $2 per citation × number of directories needed
- Monitor campaign status in Citation Builder dashboard

---

## 6. Field Mapping from Common Sources

### From HubSpot Companies

| BrightLocal Field | HubSpot Property | Notes |
|-------------------|------------------|-------|
| `Location Name` | `name` | Required |
| `Website URL` | `domain` or `website` | Required |
| `Business Category ID` | Custom mapping required | Use lookup table |
| `Country` | `country` | Convert to 3-letter ISO |
| `Address 1` | `address` | Required |
| `State/County/Region` | `state` | Required for US |
| `Town/City` | `city` | Required |
| `Postcode/Zip` | `zip` | Required |
| `Telephone` | `phone` | Format: 123-456-7890 |
| `Client Reference` | `hs_object_id` or custom | For grouping |
| `Unique Location Reference` | `hs_object_id` | Must be unique |

### From Google Business Profile

| BrightLocal Field | GBP Field | Notes |
|-------------------|-----------|-------|
| `Location Name` | Business Name | Required |
| `Website URL` | Website | Required |
| `Address 1` | Street Address | Required |
| `Town/City` | City | Required |
| `State/County/Region` | State | Required for US |
| `Postcode/Zip` | ZIP/Postal Code | Required |
| `Telephone` | Phone | Required |
| `Google Ludocid` | CID/Ludocid | For faster matching |
| `Business Category ID` | Primary Category | Map to BrightLocal IDs |
| `Extra Business Categories` | Additional Categories | Pipe-separated |

---

## 7. Business Category IDs

**Location:** Available in BrightLocal under "Categories List" tab on bulk import page.

**Common Categories (examples from template):**
- 503: (Example category from US template)
- 905: (Example category from UK/CAN template)
- 2029, 4991, 605: (Extra categories in examples)

**To Get Full List:**
1. Log into BrightLocal
2. Navigate to Bulk Import page
3. Click "Categories List" tab
4. Download or copy the full list

**Note:** Must use BrightLocal's category IDs (not Google/other platforms' categories)

---

## 8. Country Codes (ISO 3166-1 alpha-3)

**Location:** Available in BrightLocal under "Countries List" tab on bulk import page.

**Common Codes (from template examples):**
- `USA` - United States
- `GBR` - United Kingdom
- `CAN` - Canada
- `AUS` - Australia
- `DEU` - Germany
- `FRA` - France
- `IRL` - Ireland
- `NLD` - Netherlands
- `NZL` - New Zealand
- `SGP` - Singapore
- `ZAF` - South Africa

**To Get Full List:**
1. Log into BrightLocal
2. Navigate to Bulk Import page
3. Click "Countries List" tab
4. See all supported countries

---

## 9. CSV Upload Rules

**From BrightLocal Documentation:**

1. CSV file must follow the exact structure with all columns & column names as shown in template
2. Clients & Locations require separate CSV files (cannot be combined)
3. Required data must be present in each row for file to upload successfully
4. On-screen validation shows which rows failed and why
5. Client CSV must be uploaded BEFORE locations (if using client references)
6. Unique references must be truly unique (no duplicates)
7. Location names must be unique per client
8. Website URLs must have valid domain endings
9. Phone numbers must be in correct format
10. Business Category IDs must exist in BrightLocal's database

---

## 10. Cost Calculation for 2000 Clients

### BrightLocal Pricing

**Plan Options:**
- **Free "Simply Listings"**: $0/month + pay-per-citation
- **Track Plan**: $29/month + pay-per-citation
- **Manage Plan**: $36/month + pay-per-citation

**Citation Costs:**
- $2.00 per citation (standard rate)
- Bulk discounts may be available (contact enterprise)

### Example: 2000 Clients with 15 Citations Each

**One-Time Citation Building:**
- 2000 clients × 15 citations = 30,000 citations
- 30,000 × $2.00 = **$60,000 one-time**

**Monthly Platform Costs:**
- Free plan: **$0/month**
- Track plan: **$29/month**
- Manage plan: **$36/month**

**Total First Year:**
- Free plan: $60,000 (one-time) + $0 = **$60,000**
- Track plan: $60,000 + ($29 × 12) = **$60,348**
- Manage plan: $60,000 + ($36 × 12) = **$60,432**

**Year 2+ (no new citations):**
- Free plan: **$0**
- Track plan: **$348/year**
- Manage plan: **$432/year**

### Comparison vs Subscription Services

**Synup (Subscription Model):**
- $35/month per location × 2000 = $70,000/month = **$840,000/year**

**Yext (Subscription Model):**
- $250-499/year per location × 2000 = **$500,000-$998,000/year**

**Moz Local (Subscription Model):**
- $14-33/month per location × 2000 = $28,000-66,000/month = **$336,000-$792,000/year**

**BrightLocal Savings:**
- vs Synup: Save $780,000/year (93% cheaper)
- vs Yext: Save $440,000-$938,000/year (88-94% cheaper)
- vs Moz: Save $276,000-$732,000/year (82-92% cheaper)

---

## 11. Additional Resources

**Downloaded Templates:**
- `clients-bulk-import-template.csv` - In project root
- `locations-bulk-import-template-v2.csv` - In project root

**BrightLocal Documentation:**
- Help Center: https://brightlocal.zendesk.com/hc/en-us/categories/200199753-CitationBurst-FAQs
- Bulk Import Page: https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import
- Contact Support: http://www.brightlocal.com/about-us/#contact-us

**Account Information:**
- Email: nathan@zing-work.com
- Trial Status: 8 tasks remaining, 14 days left
- Current Locations: 1/50 active

---

## 12. Next Steps

1. **Download Templates** ✅ (Already in project root)
2. **Map Your Data** - Create mapping from HubSpot to BrightLocal schema
3. **Test with 5-10 Locations** - Upload small test batch to verify mapping
4. **Prepare Full Dataset** - Export and format all 2000 locations
5. **Bulk Upload** - Import all locations via CSV
6. **Create Citation Campaigns** - Configure and purchase citations
7. **Monitor Progress** - Track citation building in dashboard

---

**Last Updated:** 2025-11-09
**Template Version:** locations-bulk-import-template-v2.csv
**BrightLocal Account:** nathan@zing-work.com
