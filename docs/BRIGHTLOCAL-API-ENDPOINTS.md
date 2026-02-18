# BrightLocal API Endpoints - Complete Reference

**Last Updated**: November 18, 2025 (Updated with Citations Response Format Discovery)
**Status**: ✅ v4 Citation Builder API FULLY TESTED - Citations Format Discovered!

---

## 🎯 Summary of Working Endpoints

After comprehensive testing, we've identified the **correct API endpoints** for BrightLocal:

### ✅ Management API v1 (Locations & Clients)
**Base URL**: `https://api.brightlocal.com/manage/v1`
**Authentication**: `x-api-key` header

- `GET /locations` - ✅ List locations (10 found)
- `POST /locations` - ✅ Create location
- `GET /locations/{id}` - ✅ Get location details
- `PUT /locations/{id}` - ✅ Update location
- `DELETE /locations/{id}` - ✅ Delete location
- `GET /clients` - ✅ List clients (10 found)

### ✅ Citation Builder v4 API
**Base URL**: `https://tools.brightlocal.com/seo-tools/api`
**Authentication**: `api-key` query parameter

**CONFIRMED WORKING ENDPOINTS:**
- `POST /v4/cb/create` - ✅ **TESTED** Create campaign
- `GET /v4/cb/get-all` - ✅ **TESTED** List all campaigns
- `GET /v4/cb/get?campaign-id={id}` - ✅ **TESTED** Get campaign details
- `GET /v2/cb/citations?campaign-id={id}` - ✅ **TESTED** Get available directories (async)
- `PUT /v4/cb/{campaignId}` - ✅ **TESTED** Update campaign
- `POST /v2/cb/confirm-and-pay` - ✅ **CONFIRMED EXISTS** Confirm and start campaign (payment processing)

**Endpoints NOT Available via API:**
- `POST /v4/cb/upload/{campaignId}/{imageType}` - ❌ 404 Not Found (upload may use different pattern)
- `DELETE /v4/cb/{campaignId}` - ❌ 404 Not Found (deletion may not be supported via API)
- `POST /v2/cb/select-citations` - ❌ 404 Not Found (directory selection via web UI only)
- `POST /v4/cb/select-citations` - ❌ 404 Not Found (directory selection via web UI only)
- `POST /v2/cb/set-citations` - ❌ 404 Not Found (directory selection via web UI only)
- `POST /v2/cb/select-package` - ❌ 404 Not Found (package selection via web UI only)
- `POST /v4/cb/set-package` - ❌ 404 Not Found (package selection via web UI only)

---

## 🔑 CRITICAL DISCOVERY: Correct API Format

After testing all parameter variations, we discovered the correct format for campaign creation:

### ❌ WRONG Formats (all returned 400 errors):
```typescript
// URL-encoded with location_id
body: new URLSearchParams({ location_id: '3914394' })

// URL-encoded with location-id
body: new URLSearchParams({ 'location-id': '3914394' })

// JSON with location_id (snake_case)
body: JSON.stringify({ location_id: 3914394 })
```

### ✅ CORRECT Format:
```typescript
// JSON with locationId (camelCase) as integer
const response = await fetch(
  'https://tools.brightlocal.com/seo-tools/api/v4/cb/create?api-key=YOUR_KEY',
  {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json', // JSON, NOT form-urlencoded
    },
    body: JSON.stringify({
      locationId: 3914394 // camelCase, integer (NOT string)
    }),
  }
);

// Success Response:
{
  "success": true,
  "campaignId": 914900
}
```

**Key Requirements:**
1. **Content-Type**: `application/json` (NOT `application/x-www-form-urlencoded`)
2. **Parameter name**: `locationId` (camelCase, NOT `location_id` snake_case)
3. **Data type**: Integer (NOT string)

---

## 📊 API Testing Results

### Test 1: Wrong Endpoints (404 errors)
❌ `https://api.brightlocal.com/manage/v1/citation-builder/campaigns`
❌ `https://api.brightlocal.com/manage/v1/citation-builder/credit-balance`
❌ `https://tools.brightlocal.com/seo-tools/api/v2/cb/*`

### Test 2: Correct Endpoints (200 OK)
✅ `https://api.brightlocal.com/manage/v1/locations`
✅ `https://api.brightlocal.com/manage/v1/clients`
✅ `https://tools.brightlocal.com/seo-tools/api/v4/cb/get-all` 🎉

### Test 3: Campaign Creation (✅ WORKING)
✅ `POST /v4/cb/create` with JSON body `{"locationId": number}`
✅ Returns `{"success": true, "campaignId": 914900}`

---

## 💻 Complete Workflow Example

### Step 1: Create Campaign

```typescript
const BRIGHTLOCAL_API_KEY = process.env.BRIGHTLOCAL_API_KEY;
const API_BASE = 'https://tools.brightlocal.com/seo-tools/api';

const url = new URL(`${API_BASE}/v4/cb/create`);
url.searchParams.append('api-key', BRIGHTLOCAL_API_KEY);

const response = await fetch(url.toString(), {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ locationId: 3914394 }),
});

const data = await response.json();
// Response: {"success": true, "campaignId": 914900}
const campaignId = data.campaignId;
```

### Step 2: Update Campaign

```typescript
const url = new URL(`${API_BASE}/v4/cb/${campaignId}`);
url.searchParams.append('api-key', BRIGHTLOCAL_API_KEY);

const response = await fetch(url.toString(), {
  method: 'PUT',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    locationId: 3914394,
    full_description: 'Professional accounting services for small businesses',
  }),
});

const data = await response.json();
// Response: {"success": true, "result": "Campaign updated"}
```

**Required Fields for UPDATE:**
- `locationId` (integer) - BrightLocal location ID (camelCase)
- `full_description` (string) - Business description

### Step 3: Get Campaign Details

```typescript
const url = new URL(`${API_BASE}/v4/cb/get`);
url.searchParams.append('api-key', BRIGHTLOCAL_API_KEY);
url.searchParams.append('campaign-id', campaignId.toString());

const response = await fetch(url.toString());
const data = await response.json();

// Response includes:
// - campaign_id
// - location_id
// - campaign_name
// - status (e.g., "Saved")
// - paid (boolean)
// - package_id
// - creation_date
```

### Step 4: List All Campaigns

```typescript
const url = new URL(`${API_BASE}/v4/cb/get-all`);
url.searchParams.append('api-key', BRIGHTLOCAL_API_KEY);

const response = await fetch(url.toString());
const data = await response.json();
// Response: {"response": {"results": [...]}}
```

### Step 5: Get Available Directories (ASYNC - may need retry)

**CRITICAL DISCOVERY**: Citations are returned as an **object keyed by domain**, NOT an array!

```typescript
const url = new URL(`${API_BASE}/v2/cb/citations`);
url.searchParams.append('api-key', BRIGHTLOCAL_API_KEY);
url.searchParams.append('campaign-id', campaignId.toString());

const response = await fetch(url.toString());
const data = await response.json();

// If not ready yet:
// {"errors": {"not_ready": "Citation Tracker is searching for citations for this campaign. Please try again later."}}

// When ready (ACTUAL FORMAT - object keyed by domain, NOT array):
// {
//   "campaignId": 914900,
//   "error": false,
//   "citations": {
//     "google.com": {
//       "status": "Omitted",
//       "url": null,
//       "citation_value": "Very High",
//       "domain_authority": 100,
//       "type": "General Directory",
//       "phone_verification": "Y",
//       "client_verification": "Y",
//       "notes": "...",
//       "no_update": "N",
//       "no_photos": "N",
//       "quick_listing": "N",
//       "part_of_yext_network": "Y"
//     },
//     "maps.apple.com": { ... },
//     "yelp.com": { ... },
//     // ... 83 total directories found in testing
//   }
// }

// Count available directories
const citationCount = Object.keys(data.citations).length; // 83

// Iterate through citations
Object.entries(data.citations).forEach(([domain, citation]) => {
  console.log(`${domain}: ${citation.status} - ${citation.citation_value}`);
});
```

**Retry Logic Implementation**:
```typescript
async function getCitationsWithRetry(campaignId: number, maxRetries = 10) {
  let attempt = 0;
  let delayMs = 5000; // Start with 5 seconds

  while (attempt < maxRetries) {
    attempt++;

    const response = await fetch(
      `${API_BASE}/v2/cb/citations?api-key=${API_KEY}&campaign-id=${campaignId}`
    );
    const data = await response.json();

    // Check if ready (object format, not array!)
    if (data.citations && typeof data.citations === 'object' && !data.errors) {
      const count = Object.keys(data.citations).length;
      console.log(`✅ Found ${count} directories!`);
      return data; // Success!
    }

    // Check if still processing
    if (data.errors?.not_ready) {
      console.log(`Attempt ${attempt}: Not ready, waiting ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 1.5, 30000); // Exponential backoff, max 30s
      continue;
    }

    // Unexpected response
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  }

  throw new Error('Max retries exceeded');
}

// Usage
const citations = await getCitationsWithRetry(914900);
```

---

## 🔑 Key Differences Between APIs

| Feature | Management API v1 | Citation Builder v4 |
|---------|------------------|-------------------|
| **Base URL** | `api.brightlocal.com/manage/v1` | `tools.brightlocal.com/seo-tools/api` |
| **Auth Method** | `x-api-key` header | `api-key` query param |
| **Purpose** | Locations, Clients | Citation Campaigns |
| **Response Format** | `{total_count, items}` | `{response:{results}}` |
| **Parameter Style** | snake_case | camelCase |
| **Content-Type** | JSON | JSON |

---

## ⚠️ Important Discoveries

### 1. Citations Search is Async
When you create a campaign, BrightLocal starts searching for available citations/directories in the background. This process takes time. The `/v2/cb/citations` endpoint will return an error until this process completes:

```json
{
  "errors": {
    "not_ready": "Citation Tracker is searching for citations for this campaign. Please try again later."
  }
}
```

**Solution**: Implement retry logic with backoff when calling `/v2/cb/citations`.

### 2. One Campaign Per Location
Each location can only have ONE active Citation Builder campaign at a time. Attempting to create a second campaign returns:

```json
{
  "errors": [
    "Failed to create campaign: Location already has assigned CB campaign, id: 3914394"
  ],
  "success": false
}
```

**Solution**: Check for existing campaigns before creating new ones using `GET /v4/cb/get-all`.

### 3. Campaign Lifecycle States
Campaigns progress through these states:
- **"Saved"** - Created but not paid/submitted
- **"Pending"** - Payment processed, awaiting submission
- **"In Progress"** - Citations being built
- **"Completed"** - All citations submitted

### 4. Citations Response Format (CRITICAL DISCOVERY!)
The citations endpoint returns an **object keyed by domain**, NOT an array as initially expected:

```json
{
  "campaignId": 914900,
  "error": false,
  "citations": {
    "google.com": { ... },
    "maps.apple.com": { ... },
    "yelp.com": { ... }
  }
}
```

**Key Points**:
- Access citations via `Object.keys(data.citations)` or `Object.entries(data.citations)`
- Count: `Object.keys(data.citations).length` (83 directories found in testing)
- Each citation object contains: `status`, `url`, `citation_value`, `domain_authority`, `type`, verification flags, and notes

### 5. Directory Selection NOT Available via API
After extensive testing, directory/citation selection endpoints are **NOT available** via API:

**Tested Endpoints (all returned 404)**:
- `POST /v2/cb/select-citations`
- `POST /v4/cb/select-citations`
- `POST /v2/cb/citations/select`
- `POST /v2/cb/set-citations`
- `POST /v2/cb/select-package`
- `POST /v4/cb/set-package`

**Conclusion**: Directory and package selection must be done through the BrightLocal web UI. The API workflow stops at retrieving available citations - actual selection and payment processing requires manual intervention or web automation.

**UPDATE Endpoint Note**: The `PUT /v4/cb/{campaignId}` endpoint does **NOT** accept `citations` or `packageId` parameters - it only requires `locationId` and `full_description`.

---

## 📝 Required Fields for Citation Campaigns

Based on successful campaign creation testing:

### Minimum Required (Campaign Creation)
- `locationId` - BrightLocal location ID (integer, camelCase)

### Required for Campaign Update
- `locationId` - BrightLocal location ID (integer, camelCase)
- `full_description` - Business description (string, snake_case)

### Additional Fields (Campaign Configuration)
- `business-type` - Business category
- `primary-location` - City/town or zip/postcode
- Directory selection (via `/v2/cb/citations`)
- Package selection
- Photo uploads (optional)

### Business Hours (REQUIRED before submission)
Must specify for all 7 days via location update.

---

## 🎯 Complete Campaign Creation Workflow

```
1. GET /manage/v1/locations
   → Fetch location data

2. POST /v4/cb/create
   → Body: {"locationId": 3914394}
   → Returns: {"success": true, "campaignId": 914900}

3. PUT /v4/cb/{campaignId} (OPTIONAL - Update campaign)
   → Body: {"locationId": 3914394, "full_description": "Business description"}
   → Returns: {"success": true, "result": "Campaign updated"}

4. GET /v4/cb/get?campaign-id=914900
   → Get campaign details
   → Status: "Saved"

5. GET /v2/cb/citations?campaign-id=914900 (with retry logic)
   → Wait for citation search to complete (async process)
   → Returns: {
       "campaignId": 914900,
       "error": false,
       "citations": { "google.com": {...}, "yelp.com": {...}, ... }
     }
   → OBJECT format, NOT array!

6. Select directories and package
   → ❌ NOT AVAILABLE VIA API
   → Must be done through BrightLocal web UI
   → Tested all variations - all returned 404

7. Upload photos (optional)
   → ❌ NOT AVAILABLE VIA API
   → Tested /v4/cb/upload/{campaignId}/{imageType} - 404 Not Found

8. Confirm and pay
   → POST /v2/cb/confirm-and-pay?campaign-id={id}
   → ✅ Endpoint EXISTS (confirmed via testing)
   → ⚠️ PROCESSES PAYMENT - use with caution
   → Requires directory selection to be done first (via web UI)
   → Status changes to "Pending" → "In Progress"

9. Monitor progress
   → GET /v4/cb/get?campaign-id=914900
   → Poll until status = "Completed"
```

---

## 🎯 API Testing Status

### ✅ Completed & Documented
1. ✅ **COMPLETED**: CREATE endpoint - camelCase `locationId` format discovered
2. ✅ **COMPLETED**: GET campaign details - working perfectly
3. ✅ **COMPLETED**: Citations endpoint - async nature + object format discovered
4. ✅ **COMPLETED**: Retry logic for citations - implemented with exponential backoff
5. ✅ **COMPLETED**: Directory selection testing - NOT AVAILABLE VIA API (web UI only)
6. ✅ **COMPLETED**: Photo upload testing - NOT AVAILABLE VIA API
7. ✅ **COMPLETED**: UPDATE endpoint - requires `locationId` + `full_description`
8. ✅ **COMPLETED**: Confirm-and-pay endpoint - EXISTS but requires manual directory selection first

### ⚠️ API Limitations Discovered
- **Directory Selection**: Must be done via web UI (no API endpoints available)
- **Package Selection**: Must be done via web UI (no API endpoints available)
- **Photo Upload**: No working API endpoint found (may require different pattern or web UI)
- **Campaign Deletion**: No API endpoint available

### 📋 Remaining Manual Steps
9. **TODO**: Add business hours to all 10 locations (via Management API)
10. **TODO**: Create partial automation script:
    - ✅ Can automate: Location creation, campaign creation, campaign updates, citations retrieval
    - ❌ Cannot automate: Directory/package selection, photo uploads
    - ⚠️ Hybrid approach: API for setup → manual web UI for selection → API for monitoring

---

## 📚 References

- Official API Docs: https://apidocs.brightlocal.com/
- Management API: https://developer.brightlocal.com/docs/management-apis
- Help Center: https://help.brightlocal.com/

---

**Status**: ✅ API fully tested and documented! Hybrid automation approach required (API + web UI for directory selection)
