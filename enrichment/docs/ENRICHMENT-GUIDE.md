# Business Enrichment Guide

This guide explains how to enrich a HubSpot contact into a complete business profile using Claude Code's MCP tools.

## Why Claude Code?

We use Claude Code interactively instead of automated scripts for enrichment. Here's why:

**Scripts Failed**
- Automated enrichment scripts using Firecrawl MCP ran into "Stream closed" errors
- The MCP connection would drop mid-process, losing work
- Retry logic didn't help because the underlying connection was unstable

**Claude Code Works**
- Claude Code's built-in Firecrawl MCP tools (mcp__firecrawl__*) work reliably
- The connection is managed by Claude Code itself, not our scripts
- Same tools, but executed through Claude Code's stable infrastructure

**Interactive is Better for This**
- Each business is different and needs human judgment
- Some have websites, some don't. Some have the owner's name in HubSpot, not the business name
- Edge cases (like Frana Construction with a Minnesota phone but Florida address) need a human to figure out
- You can verify as you go instead of batch-processing bad data

## How to Use Claude Code for Enrichment

### Starting a Session

1. Open Claude Code in the zing-directory-app project directory
2. Make sure Firecrawl MCP is enabled (check your MCP settings)
3. Give Claude a prompt like one of these:

**Simple prompt:**
```
Enrich HubSpot contact ID 1055. The business is Frana Construction LLC in Florida.
Email is franaconstruction@gmail.com. Find their website, address, phone, and build
a complete enriched JSON file.
```

**Detailed prompt:**
```
I need to enrich a business from HubSpot. Here's what I have:

HubSpot Contact ID: 536151
Name in HubSpot: Kristina Velpel
Email: kvelps74@gmail.com
Phone: (309) 214-1477
State: Illinois

This might be a business owner. Search for businesses associated with this person
in Illinois. Find their website, business name, full address, and create an
enriched JSON file following the schema in enrichment/docs/JSON-SCHEMA.md.

Make sure to document the evidence linking in the notes field.
```

### What Happens Next

Claude will:
1. Use `mcp__firecrawl__firecrawl_search` to find the business online
2. Review results with you and pick the right website/sources
3. Use `mcp__firecrawl__firecrawl_scrape` to extract data from websites
4. Cross-reference multiple sources (Yelp, BBB, state registries, etc.)
5. Build the evidence trail linking HubSpot to the found data
6. Create the enriched JSON file in `enrichment/enriched/`

### Sample Session

Here's what an actual enrichment session looks like:

```
YOU: Enrich HubSpot contact ID 1055. Frana Construction LLC, Florida,
     franaconstruction@gmail.com, phone 507-339-3949.

CLAUDE: Let me search for this business...
        [Uses mcp__firecrawl__firecrawl_search with "Frana Construction Florida"]

        Found several results:
        - BuildZoom profile showing FL license #66140
        - Florida Sunbiz LLC registration
        - Lee County contractor list

        The phone 507-339-3949 is a Minnesota area code, which is unusual
        for a Florida business. Let me scrape BuildZoom for more details...

        [Uses mcp__firecrawl__firecrawl_scrape on BuildZoom URL]

        Found: Owner is Matthew Frana, business address in Fort Myers, FL.
        The MN phone is probably his personal cell from before he moved to Florida.

        I'll create the enriched JSON with evidence linking...

        [Creates enrichment/enriched/16-frana-construction.json]

YOU: Looks good. What sources did you use for the evidence?

CLAUDE: Evidence linking includes:
        1. Email franaconstruction@gmail.com matches BuildZoom profile
        2. Florida license #66140 verified on BuildZoom for Matthew Frana
        3. Florida Sunbiz confirms LLC #L18000284577 formed 2018
        4. Lee County records show same business address
```

### Tips for Good Prompts

- Include the HubSpot contact ID (required for linking)
- Include whatever data HubSpot has (even if sparse)
- Mention if the name looks like a person vs a business
- Ask Claude to document evidence in the notes field
- Ask Claude to check multiple sources, not just the first result

## Prerequisites

- Claude Code with Firecrawl MCP tools enabled
- Access to `enrichment/source/hubspot-contacts-full.csv`
- Understanding of the JSON schema (see [JSON-SCHEMA.md](JSON-SCHEMA.md))

## Step 1: Select a Business

### From the CSV
Open `enrichment/source/hubspot-contacts-full.csv` and look for businesses with:

| Data Quality | Description | Example |
|--------------|-------------|---------|
| **Best** | Has website, phone, full address | Digital Matrix Telecom |
| **Good** | Has phone, email, city/state | Speakeasy Fitness |
| **Challenging** | Only email + state | Frana Construction (just gmail + "Florida") |

### Key Columns
- `hubspot_contact_id` - Unique identifier
- `hubspot_url` - Link to HubSpot record
- `business_name` - May be owner's name, not business
- `phone`, `email`, `website` - Primary contact info
- `street_address`, `city`, `state`, `zip_code` - Location

## Step 2: Search for Business Information

Use the Firecrawl search tool to find the business online:

```
mcp__firecrawl__firecrawl_search
Query: "[Business Name] [City] [State]"
Limit: 5
```

### Example
```json
{
  "query": "Frana Construction Fort Myers Florida",
  "limit": 5
}
```

### What to Look For
1. **Official website** - Primary source
2. **Yelp listing** - Reviews, hours, photos
3. **Facebook page** - Contact info, photos
4. **BBB profile** - Accreditation status
5. **State business registry** - License numbers, owner name
6. **Industry directories** - Angi, HomeAdvisor, BuildZoom

## Step 3: Scrape Website Content

Once you find the website, scrape it:

```
mcp__firecrawl__firecrawl_scrape
URL: "https://businesswebsite.com"
Formats: ["markdown"]
OnlyMainContent: true
```

### Key Pages to Scrape
1. **Home page** - Business description, tagline
2. **About page** - History, team, certifications
3. **Services page** - Detailed service list
4. **Contact page** - Phone, email, hours, address

## Step 4: Cross-Reference Multiple Sources

For verification, scrape additional sources:

| Source | What to Extract |
|--------|-----------------|
| Yelp | Hours, reviews, photos, categories |
| Facebook | Secondary contact, description, events |
| LinkedIn | Owner profile, company page |
| BBB | Accreditation, complaints, rating |
| State Registry | License number, formation date, registered agent |
| Google Maps | Hours, photos, reviews |

## Step 5: Build Evidence Trail

As you gather data, document the evidence linking HubSpot to web sources:

### Evidence Types

| Type | Description | Example |
|------|-------------|---------|
| **Phone Match** | HubSpot phone found on website | "(555) 123-4567 matches website footer" |
| **Email Domain** | Email domain matches website | "@company.com matches company.com website" |
| **Address Verify** | Address confirmed on multiple sources | "123 Main St verified on Yelp and BBB" |
| **Owner Link** | Personal email links to business owner | "jsmith@gmail.com → John Smith on LinkedIn → Owner on website" |
| **License Verify** | Business license confirmed with state | "FL License #12345 verified on myfloridalicense.com" |

## Step 6: Create Enriched JSON

Create a new file: `enrichment/enriched/NN-business-name.json`

### Naming Convention
- NN = Two-digit sequence number (01, 02, ... 17)
- business-name = Lowercase, hyphenated business name
- Example: `16-frana-construction.json`

### Required Fields
```json
{
  "hubspotContactId": "REQUIRED - From HubSpot",
  "hubspotUrl": "REQUIRED - Link to HubSpot record",
  "businessName": "REQUIRED - Official business name",
  "phone": "REQUIRED - Primary phone",
  "email": "REQUIRED - Business email",
  "city": "REQUIRED - City",
  "state": "REQUIRED - State",
  "shortDescription": "REQUIRED - ~150 chars",
  "categories": ["REQUIRED - At least one category"],
  "notes": "REQUIRED - Evidence linking (see below)",
  "enrichmentDate": "REQUIRED - YYYY-MM-DD",
  "enrichmentSources": ["REQUIRED - List of sources used"],
  "dataSource": "hubspot + web enrichment via Claude Code MCP"
}
```

### Notes Field Format
```json
"notes": "EVIDENCE LINKING: HubSpot contact ID XXXXX confirmed via: (1) Phone XXX-XXX-XXXX in HubSpot matches [source], (2) Email xxx@xxx.com in HubSpot matches [owner/website], (3) Address 'XXX' in HubSpot matches [source]. [Additional discovery notes]."
```

## Step 7: Validate the Data

Before finalizing, verify:

- [ ] All required fields present
- [ ] Phone number formatted correctly: (XXX) XXX-XXXX or +1 XXX-XXX-XXXX
- [ ] State uses full name, not abbreviation
- [ ] Website URL includes https://
- [ ] Categories are relevant to business type
- [ ] Notes include explicit evidence linking
- [ ] enrichmentDate is today's date

## Example: Frana Construction Enrichment

### Starting HubSpot Data
```csv
hubspot_contact_id: 1055
business_name: Frana Construction LLC
phone: 507-339-3949
email: franaconstruction@gmail.com
website: (empty)
city: (empty)
state: Florida
```

### Enrichment Process

1. **Search**: "Frana Construction Florida contractor"
2. **Found**: BuildZoom profile with license #66140
3. **Found**: Florida Sunbiz LLC registration
4. **Found**: Lee County contractor list
5. **Discovered**: Fort Myers address, owner Matthew Frana
6. **Discovered**: Primary phone (239) 823-6503 is FL area code

### Resulting Notes
```json
"notes": "EVIDENCE LINKING: HubSpot contact ID 1055 confirmed via: (1) Email franaconstruction@gmail.com matches BuildZoom profile and Lee County records, (2) Florida contractor license #66140 verified on BuildZoom for Matthew Frana, (3) Florida Sunbiz confirms LLC #L18000284577 formed 2018. Phone 507-339-3949 in HubSpot is Minnesota area code - likely owner's personal cell from before relocating to Florida. Primary business phone (239) 823-6503 from Fort Myers area. No website exists. Background check and fingerprinting completed per 2007 Florida DBPR requirements."
```

## Common Challenges

### No Website
- Search: "[Business Name] [Owner Name if known] [City State]"
- Check: Yelp, Facebook, Nextdoor, Angi, industry directories
- Use: State business registry for owner name and address

### Different Phone Numbers
- HubSpot may have personal cell, website has business line
- Include both: `phone` (business) and `phoneSecondary` (personal)
- Note the discrepancy in `notes` field

### Owner Name vs Business Name
- HubSpot contact may be person's name
- Business may operate under DBA
- Include both: `businessName` and `businessNameAlternate`

### Conflicting Information
- Always prefer official sources (state registry, website)
- Note conflicts in `notes` field
- Example: "HubSpot said NO website but business has example.com"

## Tips for Efficient Enrichment

1. **Start with search** - Don't scrape blindly
2. **Verify with multiple sources** - Cross-reference everything
3. **Save scrape results** - Copy important data immediately
4. **Document as you go** - Build notes field incrementally
5. **Check state registries** - Gold mine for license/owner info
6. **Use LinkedIn** - Owner profiles often reveal business details

---

**See Also**: [JSON-SCHEMA.md](JSON-SCHEMA.md) for complete field definitions
