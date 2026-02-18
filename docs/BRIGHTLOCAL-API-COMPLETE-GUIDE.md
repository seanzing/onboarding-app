# BrightLocal API & MCP Server Complete Guide

**Last Updated**: November 15, 2025
**API Key**: `[REDACTED - see .env.local]`
**Account**: Route36 (1 location in Boulder, CO)

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Rate Limits](#rate-limits)
4. [Management APIs](#management-apis)
   - [Locations API](#locations-api)
   - [Clients API](#clients-api)
   - [Citation Builder API](#citation-builder-api)
   - [Business Categories API](#business-categories-api)
5. [MCP Server](#mcp-server)
6. [Examples](#examples)
7. [Resources](#resources)

---

## API Overview

BrightLocal offers two main API categories:

### 1. **Management APIs** (Free within account limits)
- **Base URL**: `https://api.brightlocal.com/manage/v1`
- **Purpose**: Control locations, Citation Builder campaigns, and reports
- **Use Cases**:
  - Location management (create, read, update, delete)
  - Report generation and retrieval
  - White-label integration
  - External application integration (store finders, mobile apps)

### 2. **Data APIs** (Charged per request)
- **Purpose**: Direct access to business data independent of account locations
- **Use Cases**:
  - Rankings data retrieval
  - Listing data aggregation
  - Review analysis

---

## Authentication

All API requests require an **API key** passed via the `x-api-key` header:

```bash
curl --request GET \
  --url https://api.brightlocal.com/manage/v1/locations \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Accept: application/json'
```

**Getting Your API Key**:
1. Log into BrightLocal: https://tools.brightlocal.com
2. Navigate to: Settings → API
3. Copy your API key
4. Store in `.env.local` as `BRIGHTLOCAL_API_KEY`

---

## Rate Limits

### Management APIs
| Method | Requests per Minute |
|--------|-------------------|
| GET | 300 |
| POST | 100 |
| PUT | 100 |
| DELETE | 100 |

### Data APIs
| Method | Requests per Minute |
|--------|-------------------|
| GET | 600 |
| POST | 500 |

---

## Management APIs

### Locations API

#### **Find Locations** (GET)
The primary endpoint for retrieving locations from your account.

**Endpoint**: `GET https://api.brightlocal.com/manage/v1/locations`

**Query Parameters** (all optional):
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `query` | string | Location name, city, zip, or reference | - |
| `business_category_id` | string | Category IDs (comma-separated) | - |
| `client_id` | string | Client IDs (comma-separated) | - |
| `country` | string | 3-letter country code (USA, CAN, GBR) | - |
| `near` | string | City, postal code, address, or "lat:40.7128,lng:74.0060" | - |
| `num_per_page` | integer | Results per page (10-50) | 10 |
| `page` | integer | Page number | 1 |

**Response Format**:
```json
{
  "total_count": 1,
  "items": [
    {
      "distance": 0,
      "location": {
        "location_id": 3910987,
        "name": "Route36",
        "location_reference": "main",
        "business_name": "Route36",
        "client_id": 273397,
        "address": {
          "address1": "Boulder",
          "address2": "",
          "city": "Boulder",
          "region": "Colorado",
          "region_code": "CO",
          "postcode": "80301"
        },
        "country": "USA",
        "telephone": "3039990228",
        "urls": {
          "website_url": "http://r36.com",
          "menu_url": "",
          "reservation_url": "",
          "order_url": "",
          "gallery_url": "",
          "event_url": ""
        },
        "contact": {
          "first_name": "",
          "last_name": "",
          "mobile": "",
          "telephone": "3039990228",
          "email": "",
          "fax": ""
        },
        "business_category_id": 528,
        "geo_location": {
          "latitude": 40.0189728,
          "longitude": -105.2747406
        },
        "opening_hours": {
          "regular": {
            "apply_to_all": false,
            "monday": { "status": "not_supplied", "hours": [] },
            "tuesday": { "status": "not_supplied", "hours": [] },
            "wednesday": { "status": "not_supplied", "hours": [] },
            "thursday": { "status": "not_supplied", "hours": [] },
            "friday": { "status": "not_supplied", "hours": [] },
            "saturday": { "status": "not_supplied", "hours": [] },
            "sunday": { "status": "not_supplied", "hours": [] }
          },
          "special": { "days": [] },
          "reopen_date": ""
        },
        "social_profiles": {
          "facebook_url": "",
          "linkedin_url": "",
          "x_url": "",
          "instagram_url": "",
          "pinterest_url": "",
          "tiktok_url": "",
          "youtube_url": ""
        },
        "status": "active"
      }
    }
  ]
}
```

**Example Request**:
```bash
# Get all locations
curl --request GET \
  --url "https://api.brightlocal.com/manage/v1/locations" \
  --header "x-api-key: 83af4826826400b0a5e1164c85519c6ce570691f" \
  --header "Accept: application/json"

# Search by name
curl --request GET \
  --url "https://api.brightlocal.com/manage/v1/locations?query=Route36" \
  --header "x-api-key: 83af4826826400b0a5e1164c85519c6ce570691f" \
  --header "Accept: application/json"

# Filter by country and category
curl --request GET \
  --url "https://api.brightlocal.com/manage/v1/locations?country=USA&business_category_id=528" \
  --header "x-api-key: 83af4826826400b0a5e1164c85519c6ce570691f" \
  --header "Accept: application/json"
```

**TypeScript Example**:
```typescript
interface Location {
  location_id: number;
  name: string;
  business_name: string;
  address: {
    address1: string;
    city: string;
    region: string;
    postcode: string;
  };
  telephone: string;
  urls: {
    website_url: string;
  };
  status: 'active' | 'inactive';
}

interface FindLocationsResponse {
  total_count: number;
  items: Array<{
    distance: number;
    location: Location;
  }>;
}

async function findLocations(query?: {
  search?: string;
  country?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}): Promise<FindLocationsResponse> {
  const params = new URLSearchParams();
  if (query?.search) params.append('query', query.search);
  if (query?.country) params.append('country', query.country);
  if (query?.categoryId) params.append('business_category_id', query.categoryId);
  if (query?.page) params.append('page', query.page.toString());
  if (query?.perPage) params.append('num_per_page', query.perPage.toString());

  const response = await fetch(
    `https://api.brightlocal.com/manage/v1/locations?${params}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': process.env.BRIGHTLOCAL_API_KEY!,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`BrightLocal API error: ${response.status}`);
  }

  return response.json();
}
```

#### **Other Location Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/manage/v1/locations/{id}` | GET | Get single location by ID |
| `/manage/v1/locations/{id}` | PUT | Update location |
| `/manage/v1/locations/{id}` | DELETE | Delete location |
| `/manage/v1/locations` | POST | Create new location |
| `/manage/v1/locations/{id}/logo` | POST | Upload logo image |
| `/manage/v1/locations/{id}/logo` | DELETE | Delete logo |
| `/manage/v1/locations/{id}/photos` | POST | Upload photo |
| `/manage/v1/locations/{id}/photos/{photoId}` | DELETE | Delete photo |

---

### Clients API

Manage client accounts and groupings.

**Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/manage/v1/clients` | GET | Find clients (with pagination) |
| `/manage/v1/clients/{id}` | GET | Get single client |
| `/manage/v1/clients/{id}` | PUT | Update client |
| `/manage/v1/clients/{id}` | DELETE | Delete client |
| `/manage/v1/clients` | POST | Create new client |

**Use Case**: Group multiple locations under a single client for organization and reporting.

---

### Citation Builder API

Manage citation building campaigns to improve local SEO presence across directories.

**Key Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/manage/v1/citation-builder/campaigns` | GET | Find campaigns |
| `/manage/v1/citation-builder/campaigns/{id}` | GET | Get campaign details |
| `/manage/v1/citation-builder/campaigns` | POST | Create new campaign |
| `/manage/v1/citation-builder/campaigns/{id}` | PUT | Update campaign |
| `/manage/v1/citation-builder/campaigns/{id}` | DELETE | Delete campaign |
| `/manage/v1/citation-builder/campaigns/{id}/confirm` | PUT | Confirm campaign (start building) |
| `/manage/v1/citation-builder/campaigns/{id}/lookup` | GET | Get lookup results |
| `/manage/v1/citation-builder/credit-balance` | GET | Check available credits |

**Citation Builder Workflow**:
1. **Create Campaign**: POST to `/campaigns` with location_id and selected directories
2. **Review Lookup**: GET `/campaigns/{id}/lookup` to see where citations will be built
3. **Confirm Campaign**: PUT `/campaigns/{id}/confirm` to start building citations
4. **Monitor Progress**: GET `/campaigns/{id}` to check status

**Example - Create Citation Campaign**:
```typescript
interface CreateCampaignRequest {
  location_id: number;
  directories: string[]; // Array of directory IDs
  business_category_id: number;
}

async function createCitationCampaign(data: CreateCampaignRequest) {
  const response = await fetch(
    'https://api.brightlocal.com/manage/v1/citation-builder/campaigns',
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.BRIGHTLOCAL_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  return response.json();
}
```

**Important Notes**:
- Citation building **consumes credits** from your BrightLocal account
- Check credit balance before creating campaigns: `/citation-builder/credit-balance`
- Campaigns can take several weeks to complete as citations are manually built
- Use lookup endpoint to preview which directories will receive citations

---

### Business Categories API

Get available business categories for location classification.

**Endpoint**: `GET /manage/v1/business-categories`

**Response**: List of category IDs and names for classification.

**Use Case**: Ensure locations use valid category IDs when creating or updating.

---

## MCP Server

**MCP (Model Context Protocol)** is an open standard that enables AI assistants to connect directly to BrightLocal data through a secure, standardized interface.

### What is BrightLocal's MCP Server?

BrightLocal's Remote MCP implementation provides:
- **Secure, authenticated access** to BrightLocal data through natural language
- **Real-time data retrieval** during AI assistant conversations
- **Support for major AI platforms**: Claude, ChatGPT (select plans), Mistral Le Chat

### Key Capabilities

With MCP, AI assistants can:
- Retrieve location details from your BrightLocal account
- Analyze ranking performance across directories
- Review citation status and accuracy
- Generate insights from local SEO data
- Transform generic AI into an intelligent assistant with complete context

### Integration

**Documentation**: https://developer.brightlocal.com/docs/mcp

**Available MCP Sections**:
1. **Introduction** - What is MCP and how it works
2. **What can you do?** - Use cases and capabilities
3. **Getting Started** - Setup and configuration
4. **What data is available?** - Accessible data types
5. **Example Prompts** - Sample queries for AI assistants
6. **Troubleshooting & Tips** - Common issues and solutions
7. **Support & Resources** - Help and documentation links

**Use Cases**:
- "Show me all locations in Colorado"
- "What's the citation status for Route36?"
- "Analyze ranking performance for my Boulder location"
- "Which directories am I missing citations on?"

---

## Examples

### Complete Node.js/TypeScript Client

```typescript
import fetch from 'node-fetch';

class BrightLocalClient {
  private apiKey: string;
  private baseUrl = 'https://api.brightlocal.com/manage/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`BrightLocal API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Locations
  async findLocations(params?: {
    query?: string;
    country?: string;
    page?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.append('query', params.query);
    if (params?.country) searchParams.append('country', params.country);
    if (params?.page) searchParams.append('page', params.page.toString());

    const queryString = searchParams.toString();
    const endpoint = `/locations${queryString ? `?${queryString}` : ''}`;

    return this.request<any>(endpoint);
  }

  async getLocation(locationId: number) {
    return this.request<any>(`/locations/${locationId}`);
  }

  async createLocation(data: any) {
    return this.request<any>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLocation(locationId: number, data: any) {
    return this.request<any>(`/locations/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLocation(locationId: number) {
    return this.request<any>(`/locations/${locationId}`, {
      method: 'DELETE',
    });
  }

  // Citation Builder
  async getCampaigns() {
    return this.request<any>('/citation-builder/campaigns');
  }

  async createCampaign(data: {
    location_id: number;
    directories: string[];
    business_category_id: number;
  }) {
    return this.request<any>('/citation-builder/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmCampaign(campaignId: number) {
    return this.request<any>(`/citation-builder/campaigns/${campaignId}/confirm`, {
      method: 'PUT',
    });
  }

  async getCreditBalance() {
    return this.request<any>('/citation-builder/credit-balance');
  }

  // Clients
  async findClients() {
    return this.request<any>('/clients');
  }

  async getClient(clientId: number) {
    return this.request<any>(`/clients/${clientId}`);
  }

  async createClient(data: any) {
    return this.request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Usage
const client = new BrightLocalClient(process.env.BRIGHTLOCAL_API_KEY!);

// Find all locations
const locations = await client.findLocations();
console.log(`Found ${locations.total_count} locations`);

// Get specific location
const location = await client.getLocation(3910987);
console.log(`Location: ${location.name}`);

// Create citation campaign
const campaign = await client.createCampaign({
  location_id: 3910987,
  directories: ['google', 'yelp', 'facebook'],
  business_category_id: 528,
});
console.log(`Campaign created: ${campaign.id}`);
```

---

## Resources

### Official Documentation
- **Developer Portal**: https://developer.brightlocal.com/
- **Management APIs**: https://developer.brightlocal.com/docs/management-apis
- **MCP Server**: https://developer.brightlocal.com/docs/mcp
- **Legacy API Docs**: https://apidocs.brightlocal.com/
- **Help Center**: https://help.brightlocal.com/

### Dashboard Access
- **Main Dashboard**: https://tools.brightlocal.com/
- **API Settings**: https://tools.brightlocal.com/seo-tools/admin/api

### Key Findings from Documentation

**Correct API Endpoints**:
- ✅ `https://api.brightlocal.com/manage/v1/locations` (CORRECT)
- ❌ `https://api.brightlocal.com/v1/locations` (INCORRECT - returns 404)

**Authentication**:
- Header: `x-api-key: YOUR_API_KEY`
- Header: `Accept: application/json`

**Response Structure**:
- All endpoints return JSON
- Find endpoints use pagination with `total_count` and `items` array
- Errors return `{"message": "error description"}`

---

## Current Account Status

**Account**: Route36
**Locations**: 1
- **ID**: 3910987
- **Name**: Route36
- **Business Name**: Route36
- **Location**: Boulder, CO 80301
- **Phone**: (303) 999-0228
- **Website**: http://r36.com
- **Category ID**: 528
- **Status**: Active

**API Access**: ✅ Verified Working
**Last Tested**: November 15, 2025, 12:54 PM

---

**End of Guide**
