# Playwright MCP Guide

Browser automation for BrightLocal tasks using Playwright MCP.

## Quick Reference

| Task | URL |
|------|-----|
| Login | `https://tools.brightlocal.com/seo-tools/admin/account/login` |
| Categories | `https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import#categories` |
| Bulk Import | `https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import` |

---

## Category Lookup Workflow

### 1. Navigate & Login

```
mcp__playwright__browser_navigate
url: https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import#categories
```

Take snapshot to see elements:
```
mcp__playwright__browser_snapshot
```

### 2. Click Categories Tab

```
mcp__playwright__browser_click
element: "Categories List"
ref: [from snapshot]
```

### 3. Search Category

```
mcp__playwright__browser_type
element: "Search categories"
ref: [from snapshot]
text: plumber
submit: true
```

### 4. Read Results

```
mcp__playwright__browser_snapshot
```

Results show: `Category ID | Category Name`

---

## Current Category Mappings

| Search Term | ID | Category |
|-------------|-----|----------|
| dog trainer | 1355 | Dog trainer |
| plumber | 765 | Plumber |
| real estate appraiser | 1095 | Real estate appraiser |
| asphalt | 1102 | Asphalt contractor |
| window tinting | 1051 | Window tinting service |
| medical spa | 893 | Medical spa |
| chimney | 1064 | Chimney sweep |
| general contractor | 997 | General contractor |
| accountant | 583 | Accountant |
| bookkeeping | 585 | Bookkeeping service |
| wedding photographer | 896 | Wedding photographer |

---

## CSV Upload Workflow

### 1. Navigate to Import

```
mcp__playwright__browser_navigate
url: https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import
```

### 2. Upload File

```
mcp__playwright__browser_file_upload
paths: ["C:/path/to/brightlocal-import.csv"]
```

### 3. Map Columns & Confirm

Use `browser_snapshot` and `browser_click` to navigate the mapping interface.

---

## CSV Format

```csv
Business Name,Address 1,City,State/Province,Postcode,Country,Telephone,URL,Email,Category,Short Description
"The Dog Tutor","78 Lakeview Dr","Pawling","New York","12564","United States","(845) 554-3000","https://thedogtutor.com","info@thedogtutor.com",1355,"Professional dog training..."
```

---

## Key Commands

| Command | Purpose |
|---------|---------|
| `browser_navigate` | Go to URL |
| `browser_snapshot` | Get page elements with refs |
| `browser_click` | Click element |
| `browser_type` | Type into input |
| `browser_file_upload` | Upload file |
| `browser_wait_for` | Wait for text/element |

---

## Important Notes

1. **References change** — Always take fresh snapshot before interacting
2. **Submit flag** — Use `submit: true` to press Enter after typing
3. **Absolute paths** — Use full file path for uploads
4. **Login may be required** — Check if redirected to login page

---

**Related**: [ENRICHED-BUSINESSES-WORKFLOW.md](./ENRICHED-BUSINESSES-WORKFLOW.md) | [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)
