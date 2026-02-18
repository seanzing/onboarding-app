# Business Data Enrichment

This folder contains all data and tooling related to enriching HubSpot contact data with web-sourced business information for directory submissions.

## Overview

The enrichment process transforms sparse HubSpot contact records (often just name, email, and state) into comprehensive business profiles with 29+ fields suitable for BrightLocal Citation Builder and other directory services.

## Folder Structure

```
enrichment/
├── README.md                    # This file
├── docs/
│   ├── ENRICHMENT-GUIDE.md      # Step-by-step enrichment instructions
│   ├── JSON-SCHEMA.md           # Field definitions and requirements
│   ├── FINAL-VERIFIED-DATA-SUMMARY.md  # Verified data summary
│   ├── LOGO-URLS.md             # Logo URLs reference
│   ├── SUMMARY.md               # Brief data summary
│   └── logos/                   # Downloaded logo files
├── source/                      # Raw HubSpot data
│   ├── hubspot-contacts-full.csv      # All 136,699 contacts
│   ├── hubspot-customers.csv          # Customers subset
│   └── hubspot-10-contacts-complete.json  # Sample data
├── enriched/                    # Enriched business profiles
│   ├── 01-the-dog-tutor.json
│   ├── 02-pipeworx-plumbing-septic-and-drain-cleaning.json
│   ├── ...
│   ├── 16-frana-construction.json
│   └── all-businesses-enriched.json   # Aggregated file
├── exports/
│   ├── brightlocal/             # BrightLocal-formatted exports
│   │   ├── *.json               # Individual business exports
│   │   └── *.md                 # Markdown documentation
│   ├── brightlocal-all-businesses.csv  # Bulk import CSV
│   └── in-design-kristina-images/      # Sample images folder
└── scripts/
    ├── pull-hubspot-contacts.ts       # Fetch all contacts from HubSpot
    └── pull-hubspot-customers.ts      # Fetch customers from HubSpot
```

## Quick Start

### 1. Pull Fresh HubSpot Data (if needed)
```bash
npx tsx enrichment/scripts/pull-hubspot-contacts.ts
npx tsx enrichment/scripts/pull-hubspot-customers.ts
```

### 2. Select a Business to Enrich
Open `enrichment/source/hubspot-contacts-full.csv` and find a business with:
- Valid phone number
- Email address (even personal like gmail)
- At least city/state location

### 3. Open Claude Code and Ask It to Enrich

This is the key part. We do enrichment interactively through Claude Code, not through automated scripts. (Scripts failed with connection errors. Claude Code's MCP tools work reliably.)

Open Claude Code in the project directory and give it a prompt like:

```
Enrich HubSpot contact ID 1055. The business is Frana Construction LLC in Florida.
Email is franaconstruction@gmail.com, phone 507-339-3949. Find their website,
address, and build a complete enriched JSON file.
```

Claude will:
1. Search for the business using Firecrawl
2. Scrape their website and other sources
3. Cross-reference the data
4. Build evidence linking HubSpot to the found data
5. Create the enriched JSON file

See [docs/ENRICHMENT-GUIDE.md](docs/ENRICHMENT-GUIDE.md) for detailed instructions, sample prompts, and a walkthrough of a full session.

### 4. Review and Save
Claude creates the JSON file in `enrichment/enriched/`. Review it to make sure:
- Evidence linking is documented in the notes field
- All required fields are present
- Data looks accurate

## Key Principles

### Evidence-Based Linking
Every enriched file **MUST** include a `notes` field with explicit evidence linking the HubSpot contact to the enriched data:

```json
"notes": "EVIDENCE LINKING: HubSpot contact ID XXXX confirmed via:
(1) Phone XXX-XXX-XXXX in HubSpot matches website contact,
(2) Email xxx@xxx.com matches owner shown on website,
(3) Address 'XXX' in HubSpot matches business location on [source]."
```

### Data Sources
The enrichment process uses multiple sources:
- **Primary**: Company website (found via Firecrawl search)
- **Verification**: Yelp, Facebook, LinkedIn, BBB, Google Business Profile
- **Government**: State business registries, contractor license boards
- **Industry**: Angi, HomeAdvisor, industry directories

### Quality Standards
- Never fabricate data - only use verified information
- Include enrichmentSources array listing all sources used
- Note any discrepancies (e.g., "HubSpot said NO website but found...")
- Mark enrichmentDate for data freshness tracking

## Files Summary

| Count | Location | Description |
|-------|----------|-------------|
| 17 | enriched/*.json | Individual enriched business profiles |
| 21 | exports/brightlocal/ | BrightLocal-formatted exports (11 JSON + 10 MD) |
| 3 | source/*.csv, *.json | Raw HubSpot data |
| 2 | scripts/*.ts | Data fetching scripts |

## Current Status (December 2025)

- **16 businesses enriched** with full 29-field profiles
- **11 businesses** ready for BrightLocal Citation Builder
- All files include EVIDENCE LINKING notes
- Enrichment done via Claude Code (interactive, not automated scripts)
- Scripts were tried but failed with MCP connection errors
- Claude Code's Firecrawl MCP tools work reliably for this

## Related Documentation

- [ENRICHMENT-GUIDE.md](docs/ENRICHMENT-GUIDE.md) - How to enrich a new business
- [JSON-SCHEMA.md](docs/JSON-SCHEMA.md) - Complete field definitions
- [CLAUDE.md](../CLAUDE.md) - Main project documentation

---

**Last Updated**: December 7, 2025
