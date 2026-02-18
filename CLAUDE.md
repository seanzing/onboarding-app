# CLAUDE.md - Development Documentation

This document provides context for Claude Code and AI-assisted development on this project.

## 📝 Project Overview

**Project Name**: Zing Local Directory Sync
**Purpose**: HubSpot CRM integration for local directory management
**Tech Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, Tamagui, Supabase
**Integration**: Direct HubSpot SDK for CRM access, Supabase for authentication

## 🎯 Key Architecture Decisions

### 1. HubSpot Integration Strategy

**Current Implementation**: Direct HubSpot CRM API v3

**Approach**:
- Uses official HubSpot REST API v3 directly
- No intermediary services or SDKs required
- **Authentication**: Private App Access Token (Bearer token)
- **Endpoint**: `https://api.hubapi.com/crm/v3/objects/*`

**API Pattern**:
```typescript
// Fetch companies from HubSpot
const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const response = await fetch(
  `${HUBSPOT_API_BASE}/crm/v3/objects/companies?properties=name,domain,phone,email&limit=100`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }
);

const data = await response.json();
const companies = data.results; // Array of company objects
```

**Key Files**:
- `app/api/hubspot/business-profile/route.ts` - Fetch companies (read-only)
- `app/api/hubspot/companies-direct/route.ts` - List all companies
- `app/api/hubspot/contacts/[id]/route.ts` - Update contacts (**writes to both HubSpot & Supabase**)

### 2. Dual-Write Data Strategy

**Critical Principle**: Contact updates are written to BOTH HubSpot AND Supabase.

**Implementation**:
- **Contact Updates**: Saves to HubSpot first, then Supabase (`app/api/hubspot/contacts/[id]/route.ts`)
- **Read Operations**: Direct HubSpot API calls for companies and contacts
- **Atomic Transactions**: Currently implementing rollback on failure (Phase 2 in progress)
- **User Confirmation**: Modal warns before dual-system updates

**Key Files**:
- `app/api/hubspot/contacts/[id]/route.ts` - Contact updates (BOTH systems)
- `app/api/hubspot/business-profile/route.ts` - Company reads (HubSpot only)
- `app/api/hubspot/companies-direct/route.ts` - Company list (HubSpot only)
- `app/components/tamagui/PropertyEditor.tsx` - Confirmation modal

### 3. Supabase Authentication System

**Choice**: Supabase Auth with email/password and PKCE flow

**Why Supabase**:
- Full-featured auth solution (email/password, OAuth, magic links)
- Built-in JWT token management with auto-refresh
- Row Level Security (RLS) for database access control
- Cross-platform support (Web + React Native)
- Generous free tier for development
- TypeScript-first with excellent DX

**Architecture**:
```typescript
// Universal Supabase client (lib/supabase/client.ts)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,                    // Platform-aware (localStorage/AsyncStorage)
    autoRefreshToken: true,     // Auto-refresh before expiry
    persistSession: true,       // Persist across app restarts
    detectSessionInUrl: true,   // For email confirmations
    flowType: 'pkce',           // PKCE flow (more secure)
  },
});
```

**Authentication Flow**:
1. User signs up/logs in via `app/(auth)/login` or `app/(auth)/signup`
2. Supabase creates JWT access token + refresh token
3. Tokens stored in platform-aware storage (localStorage on web)
4. AuthProvider wraps app and provides auth context
5. useAuth hook provides user, session, loading states
6. Auth state persists across page reloads
7. Tokens auto-refresh before expiration

**Auth Context Pattern** (`app/hooks/useAuth.tsx`):
```typescript
// AuthProvider listens to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  // Handle SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
});

// Custom hooks for different use cases
export function useAuth() // Full auth context
export function useUser() // Just user object
export function useSession() // Just session
export function useIsAuthenticated() // Boolean + loading
```

**Auth Pages**:
- `app/(auth)/login/page.tsx` - Email/password login
- `app/(auth)/signup/page.tsx` - New user registration
- `app/(auth)/forgot-password/page.tsx` - Password reset flow

**Auth API**:
- `app/api/auth/callback/route.ts` - OAuth callback + email confirmation handler

**Protected Routes** (Future):
- Currently all routes are public
- Can add middleware to protect routes requiring authentication
- Check `session` in middleware and redirect to `/login` if null

**Session Management**:
- Access token: Short-lived (1 hour)
- Refresh token: Long-lived (30 days)
- Auto-refresh: Happens automatically 5 minutes before expiry
- Sign out: Clears tokens and redirects to login

**Security Features**:
- PKCE flow prevents auth code interception
- HTTP-only cookies option (not currently used)
- Row Level Security on database tables (if implemented)
- Email confirmation for new accounts
- Password reset via secure email link

### 4. BrightLocal Citation Builder Integration

**Choice**: Direct BrightLocal REST API v4 for Citation Builder

**Why BrightLocal**:
- Industry-leading citation building service (submits to 100+ directories)
- Manages business listings across Google, Yelp, Facebook, and more
- Automated citation monitoring and duplicate management
- Comprehensive API for programmatic campaign management

**API Architecture**:
```typescript
// BrightLocal has TWO separate API systems:

// 1. Management API v1 (Locations & Clients)
const MANAGEMENT_API_BASE = 'https://api.brightlocal.com/manage/v1';
// Authentication: x-api-key header
// Parameter style: snake_case

// 2. Citation Builder v4 API (Campaigns)
const CITATION_API_BASE = 'https://tools.brightlocal.com/seo-tools/api';
// Authentication: api-key query parameter
// Parameter style: camelCase
```

**Verified Working Endpoints**:

**Management API v1:**
- `GET /locations` - List all locations
- `POST /locations` - Create location with business data
- `GET /locations/{id}` - Get location details
- `PUT /locations/{id}` - Update location
- `GET /clients` - List all clients

**Citation Builder v4 API:**
- `POST /v4/cb/create` - Create campaign (JSON: `{locationId: number}`)
- `PUT /v4/cb/{id}` - Update campaign (JSON: `{locationId, full_description}`)
- `GET /v4/cb/get-all` - List all campaigns
- `GET /v4/cb/get?campaign-id={id}` - Get campaign details
- `GET /v2/cb/citations?campaign-id={id}` - Get available directories (async)
- `POST /v2/cb/confirm-and-pay` - Process payment and start campaign

**Critical API Format Discovery**:
After comprehensive testing, discovered the correct parameter format:
```typescript
// ❌ WRONG (all return 400 errors):
body: new URLSearchParams({ location_id: '3914394' })
body: JSON.stringify({ location_id: 3914394 })

// ✅ CORRECT:
body: JSON.stringify({ locationId: 3914394 }) // camelCase + integer
Content-Type: application/json // NOT form-urlencoded
```

**Campaign Creation Workflow**:
```typescript
// 1. Create Campaign
const createResponse = await fetch(
  `${CITATION_API_BASE}/v4/cb/create?api-key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId: 3914394 }),
  }
);
// Returns: {success: true, campaignId: 914900}

// 2. Update Campaign (add business description)
const updateResponse = await fetch(
  `${CITATION_API_BASE}/v4/cb/${campaignId}?api-key=${API_KEY}`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: 3914394,
      full_description: 'Professional accounting services',
    }),
  }
);
// Returns: {success: true, result: "Campaign updated"}

// 3. Wait for citations search (async process)
// Retry GET /v2/cb/citations?campaign-id={id} until ready

// 4. Select directories and confirm payment
// POST /v2/cb/confirm-and-pay?campaign-id={id}
```

**Key Discoveries**:
1. **Hybrid API Architecture**: v4 for campaigns, v2 for citations/payment
2. **Async Citations Search**: BrightLocal searches for available directories in background
3. **One Campaign Per Location**: Each location can only have one active campaign
4. **Parameter Naming Convention**: Citation Builder API uses camelCase (locationId), Management API uses snake_case (location_id)

**Implementation Status** (November 2025):
- ✅ 10 locations created in BrightLocal
- ✅ 10 clients created in BrightLocal
- ✅ Citation Builder v4 API fully tested
- ✅ Campaign creation/update workflows verified
- 🔄 Directory selection automation (in progress)
- 🔄 Business hours updates required for submission

**Key Files**:
- `BRIGHTLOCAL-API-ENDPOINTS.md` - Complete API reference
- `verify-brightlocal-platform.ts` - Verify locations/clients exist
- `test-complete-workflow.ts` - End-to-end workflow test
- `app/brightlocal/` - BrightLocal integration modules

### 5. Database Architecture (Supabase PostgreSQL)

**For complete database documentation, see**: [docs/DATABASE-SCHEMA.md](./docs/DATABASE-SCHEMA.md)

**Key Design Principle**: Universal `hubspot_contact_id` links ALL integration tables.

**Core Tables**:
| Table | Purpose |
|-------|---------|
| `contacts` | HubSpot customers synced from CRM |
| `clients` | Agency client records |
| `enriched_businesses` | **Master records** for directory submissions |
| `brightlocal_locations` | BrightLocal API sync data |
| `brightlocal_campaigns` | Citation builder campaigns |
| `gbp_locations` | Google Business Profile data |

**Entity Relationships**:
```
HubSpot Contact (hubspot_contact_id)
        │
        ├──► contacts (synced customer data)
        │
        ├──► enriched_businesses (master business data)
        │
        ├──► brightlocal_locations (BrightLocal sync)
        │       └──► brightlocal_campaigns
        │
        └──► gbp_locations (Google Business Profile)
```

**Critical Migration** (November 18, 2025):
- Renamed `hubspot_company_id` → `hubspot_contact_id` across ALL tables
- Reason: Contacts always have `hs_object_id`, companies are optional
- Each contact represents a business owner with their own integrations

### 6. Enriched Businesses System

**For complete workflow guide, see**: [docs/ENRICHED-BUSINESSES-WORKFLOW.md](./docs/ENRICHED-BUSINESSES-WORKFLOW.md)

**Purpose**: Store master business data enriched from multiple sources for directory submissions.

**Data Flow**:
```
HubSpot Customer → Manual Research → Enriched JSON → Supabase → BrightLocal CSV
```

**Key Components**:
| File/Location | Purpose |
|---------------|---------|
| `data/enriched-hubspot/*.json` | Enriched business JSON files (29 keys each) |
| `scripts/verify-schema.js` | Verify JSON schema consistency |
| `scripts/import-enriched-businesses.ts` | Import JSON to Supabase |
| `supabase/migrations/20251128000000_create_enriched_businesses.sql` | Database migration |

**JSON Schema** (29 top-level keys):
```json
{
  "hubspotContactId": "536151",
  "hubspotUrl": "https://app.hubspot.com/...",
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
  "businessHours": { "monday": "9-5", ... },
  "logo": "public/images/...",
  "images": ["path1.jpg", "path2.jpg"],
  "imagesNote": null,
  "socialMedia": { "facebook": "...", "instagram": "..." },
  "attributes": { "languages": ["English"], ... },
  "services": ["Service 1", "Service 2"],
  "certifications": [],
  "notes": null,
  "enrichmentDate": "2025-11-28",
  "enrichmentSources": ["HubSpot", "Website"],
  "dataSource": "hubspot + web enrichment"
}
```

**BrightLocal Category IDs** (found via Playwright MCP):
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

**Import Commands**:
```bash
# Push database migration
supabase db push

# Import enriched businesses to Supabase
npx tsx scripts/import-enriched-businesses.ts
```

### 7. Playwright MCP Browser Automation

**For complete guide, see**: [docs/PLAYWRIGHT-MCP-GUIDE.md](./docs/PLAYWRIGHT-MCP-GUIDE.md)

**Purpose**: Automate browser tasks for BrightLocal category lookups and CSV uploads.

**Key Use Cases**:
1. **Find BrightLocal category IDs** - Navigate to categories list, search, get ID
2. **Bulk CSV uploads** - Upload location data for citation building
3. **Verify submissions** - Check campaign status

**Category Lookup Workflow**:
```
1. mcp__playwright__browser_navigate → BrightLocal login
2. mcp__playwright__browser_snapshot → Get page elements
3. mcp__playwright__browser_click → Click Categories List tab
4. mcp__playwright__browser_type → Search for category
5. mcp__playwright__browser_snapshot → Read results with category ID
```

**Category Search URL**:
```
https://tools.brightlocal.com/seo-tools/admin/clients-and-locations/bulk/import#categories
```

### 8. Tamagui UI Framework

**Choice**: Tamagui for UI components alongside Tailwind CSS

**Why Tamagui**:
- Universal components (Web + React Native)
- Excellent performance with compile-time optimization
- Built-in theming and dark mode support
- Animations out of the box
- Works alongside Tailwind for utility classes

**Complete Redesign** (November 2025):
- Replaced shadcn/ui components with Tamagui
- Full mobile responsive design
- Professional SaaS dashboard aesthetic
- Smooth animations and transitions
- Consistent spacing and typography

**Tamagui Components in Use**:
- `AppShell` - Main layout wrapper
- `TopBar` - Navigation header
- `Sidebar` - Collapsible sidebar navigation
- `CompaniesTable` - Data table with sorting/filtering
- `BusinessProfileCard` - Company detail cards
- `StatCard` - Dashboard statistics
- `Alert`, `Badge`, `Button` - UI primitives

### 9. UI/UX Design Principles

**Matched Widths** (October 30, 2025):
- BusinessSelector: `max-w-4xl` (896px)
- BusinessProfileCard: `max-w-4xl` (896px)
- Ensures visual alignment and consistency

**No Transparency Issues**:
- Header: `bg-background/95 backdrop-blur` for solid appearance
- Dropdown: `bg-popover/100 backdrop-blur-sm shadow-lg` for fully opaque menu
- All overlays have solid backgrounds

**Improved Readability**:
- Larger text sizes: `text-base` instead of `text-sm` in selectors
- More padding: `py-2.5` and `h-12` for better touch targets
- Hover states: `hover:bg-accent/50` for visual feedback
- Bigger icons: Increased from `size-4` to `size-5`

## 🗂️ File Structure & Purpose

### Core API Routes

**`app/api/hubspot/companies/route.ts`**
- **Purpose**: Returns list of all companies (first 100)
- **Method**: GET
- **Returns**: Array of HubSpotCompany objects
- **Used by**: `useCompanies` hook
- **Key feature**: Full company properties including address, phone, email, domain

**`app/api/hubspot/business-profile/route.ts`**
- **Purpose**: Returns first company as BusinessProfile format
- **Method**: GET
- **Returns**: Single BusinessProfile object
- **Used by**: `useBusinessProfile` hook (legacy - now replaced by selector)

### Core Components

**`app/components/BusinessSelector.tsx`**
- **Purpose**: Dropdown for selecting companies
- **Features**:
  - Alphabetically sorted companies
  - Shows name + domain/location subtitle
  - Quick info panel for selected company
  - Max height: 400px for dropdown
- **Styling**: `max-w-4xl border-2 shadow-lg`

**`app/components/BusinessProfileCard.tsx`**
- **Purpose**: Display detailed company information
- **Features**:
  - Building icon and company name (3xl font)
  - HubSpot Company ID shown
  - Conditional rendering (only shows available fields)
  - Empty state message if no contact info
- **Styling**: `max-w-4xl border-2 shadow-lg`
- **Layout**: 2-column grid for contact fields

**`app/components/Header.tsx`**
- **Purpose**: App header with title
- **Text**: "Zing LOCAL DIRECTORY SYNC"
- **Styling**: Solid background with backdrop blur
- **Position**: Sticky at top with z-50

### Auth Components & Hooks

**`app/hooks/useAuth.tsx`**
- **Purpose**: Universal auth context and hooks
- **Exports**:
  - `AuthProvider` - Context provider component
  - `useAuth()` - Full auth context (user, session, loading, signOut)
  - `useUser()` - Just user object
  - `useSession()` - Just session
  - `useSignOut()` - Sign out function
  - `useIsAuthenticated()` - Boolean check + loading
- **Features**:
  - Listens to Supabase auth state changes
  - Auto-updates on SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
  - Handles session persistence

**`lib/supabase/client.ts`**
- **Purpose**: Universal Supabase client for Web + React Native
- **Exports**: `supabase`, `getCurrentUser()`, `getCurrentSession()`, `signOut()`
- **Configuration**: PKCE flow, auto-refresh, persistent sessions
- **Environment**: Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**`lib/supabase/storage.ts`**
- **Purpose**: Platform-aware storage adapter
- **Web**: Uses `localStorage`
- **React Native**: Uses `AsyncStorage` (if installed)
- **Interface**: Compatible with Supabase storage requirements

**`app/(auth)/login/page.tsx`**
- **Purpose**: Login page with email/password form
- **Features**: Email validation, password input, error handling
- **Redirects**: To dashboard on successful login

**`app/(auth)/signup/page.tsx`**
- **Purpose**: Registration page for new users
- **Features**: Email/password validation, terms acceptance
- **Flow**: Creates account → sends confirmation email → redirects

**`app/(auth)/forgot-password/page.tsx`**
- **Purpose**: Password reset request page
- **Flow**: Enter email → receive reset link → follow link to reset

**`app/api/auth/callback/route.ts`**
- **Purpose**: Auth callback handler for OAuth and email confirmations
- **Handles**: Email verification links, OAuth redirects
- **Returns**: Redirects to appropriate page after auth

### Custom Hooks

**`app/hooks/useCompanies.ts`**
- **Purpose**: Fetch and manage companies list
- **Endpoint**: `/api/hubspot/companies`
- **Returns**: `{ companies, loading, error }`
- **Used by**: Main page for dropdown population

**`app/hooks/useBusinessProfile.ts`**
- **Purpose**: Fetch single business profile (legacy)
- **Endpoint**: `/api/hubspot/business-profile`
- **Returns**: `{ profile, loading, error }`
- **Note**: Now used as fallback for default profile

**`app/hooks/useDirectorySync.ts`**
- **Purpose**: Manage directory platform sync status
- **Features**: Mock data for directory services
- **Returns**: `{ services, syncPlatform, syncAll, isSyncingAll }`

### Utilities

**`app/utils/companyConverter.ts`**
- **Purpose**: Convert HubSpotCompany to BusinessProfile
- **Key**: Only includes real data, no fake fallbacks
- **Usage**: When selecting company from dropdown

**`lib/supabase/client.ts`**
- **Purpose**: Universal Supabase client with auth and database access
- **Features**: PKCE flow, auto-refresh tokens, platform-aware storage
- **Usage**: Authentication and database operations throughout the app

## 🔄 Data Flow

### Read Flow (Companies List)
```
User opens app
    ↓
Main page loads
    ↓
useCompanies() hook fires
    ↓
GET /api/hubspot/companies
    ↓
Direct HubSpot API call
    ↓
fetch('https://api.hubapi.com/crm/v3/objects/companies')
    ↓
Parse JSON response
    ↓
Extract companies array
    ↓
Return to frontend
    ↓
BusinessSelector dropdown populated
    ↓
User selects company
    ↓
hubspotToBusinessProfile() converts data
    ↓
BusinessProfileCard displays company
```

### Write Flow (Contact Update)
```
User edits contact property
    ↓
PropertyEditor modal opens
    ↓
User confirms "Update Both Systems"
    ↓
PATCH /api/hubspot/contacts/[id]
    ↓
1. Update HubSpot (with previous state cached)
    ↓
2. Update Supabase
    ↓
If Supabase fails → Rollback HubSpot (Phase 2)
    ↓
Return success/error to frontend
    ↓
UI refreshes with updated data
```

## 🧹 Code Cleanup History

### Files Deleted (October 30, 2025)

**Test/Debug Routes** (6 files):
- `app/api/test-ai/route.ts`
- `app/api/test-composio/route.ts`
- `app/api/test-rube/route.ts`
- `app/api/test-rube-workflow/route.ts`
- `app/api/debug-companies/route.ts`
- `app/api/agent/hubspot/route.ts` (old AI agent using deprecated SDK)

**Unused Components** (1 file):
- `app/components/FilterBar.tsx`

**Documentation Files** (8 files):
- `BRIGHTLOCAL_INTEGRATION_GUIDE.md`
- `COMPLETE_REDESIGN_SUMMARY.md`
- `DIRECTORY_INTEGRATION_STRATEGY.md`
- `FINAL_REDESIGN_SUMMARY.md`
- `NEXTJS_SHADCN_VERIFICATION.md`
- `REDESIGN_COMPLETE.md`
- `REDESIGN_PLAN.md`
- `docs/RECENT_CHANGES.md`

**Data Files** (8 files):
- `final_semantic_categorization.json`
- `ticket_categories_final.json`
- `ticket_samples.json`
- `verified_top_30.json`
- `zing-work-homepage-data.json`
- `mock-emails.csv`
- `mock-emails-issues-only.csv`
- `process_emails.py`

**System Files**:
- `nul` (Windows artifact)
- `.playwright-mcp/` directory

**Total**: 32 files removed (~150KB)

### Recent Architectural Changes (November 18, 2025)

**RUBE Dependency Removal**:
- Deleted `lib/rube-mcp-client.ts` (HTTP client for RUBE MCP API)
- Removed all RUBE MCP tool calls (`RUBE_SEARCH_TOOLS`, `RUBE_MULTI_EXECUTE_TOOL`)
- Replaced with direct HubSpot CRM API v3 calls using `fetch()`
- Removed `RUBE_BEARER_TOKEN` from environment variables

**API Architecture Updates**:
- `app/api/hubspot/business-profile/route.ts`: Now uses direct HubSpot API
- `app/api/hubspot/contacts/[id]/route.ts`: Dual-write pattern (HubSpot + Supabase)
- All test/debug routes previously deleted (October 30, 2025)

**Documentation Updates**:
- Updated CLAUDE.md to reflect direct API usage
- Documented dual-write strategy and atomic transaction plan
- Added comprehensive environment variable documentation
- Updated all code examples to use direct fetch() calls

## 🔐 Environment Variables

Required in `.env.local`:

```env
# Supabase Configuration (REQUIRED for Auth & Database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# HubSpot Configuration (REQUIRED for CRM Integration)
HUBSPOT_ACCESS_TOKEN=pat-na1-...

# Pipedream Configuration (REQUIRED for OAuth)
NEXT_PUBLIC_PIPEDREAM_PROJECT_ID=proj_...
NEXT_PUBLIC_PIPEDREAM_CONNECT_PUBLISHABLE_KEY=pk_...

# BrightLocal Configuration (REQUIRED for Directory Management)
BRIGHTLOCAL_API_KEY=...
BRIGHTLOCAL_API_V4_URL=https://tools.brightlocal.com/seo-tools/api

# CRON Configuration (REQUIRED for automated sync)
CRON_SECRET=your-secure-random-string-here

# Optional (for legacy/future features)
COMPOSIO_API_KEY=ak_...
OPENAI_API_KEY=sk-proj-...
```

**Environment Variable Details**:

**Supabase Variables** (`NEXT_PUBLIC_*` means client-side accessible):
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key (safe to expose)
- **Note**: Anon key is safe for client-side use with Row Level Security (RLS)
- **Get these from**: Supabase Dashboard → Settings → API

**HubSpot Variables**:
- `HUBSPOT_ACCESS_TOKEN`: Private app access token for CRM API
- **Server-side only** (not exposed to client)
- **Permissions required**: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.companies.read`
- **Get this from**: HubSpot → Settings → Integrations → Private Apps

**Pipedream Variables**:
- `NEXT_PUBLIC_PIPEDREAM_PROJECT_ID`: Your Pipedream project ID
- `NEXT_PUBLIC_PIPEDREAM_CONNECT_PUBLISHABLE_KEY`: Publishable key for OAuth
- **Client-side accessible** (needed for OAuth flow)
- **Get these from**: Pipedream Dashboard → Connect

**BrightLocal Variables**:
- `BRIGHTLOCAL_API_KEY`: API key for directory management
- `BRIGHTLOCAL_API_V4_URL`: API endpoint (usually unchanged)
- **Server-side only** (not exposed to client)
- **Get this from**: BrightLocal → Settings → API Access

**CRON Variables**:
- `CRON_SECRET`: Secret token for authenticating automated cron jobs
- **Server-side only** (not exposed to client)
- **Generate with**: `openssl rand -hex 32` or any secure random string generator
- **Used by**: `/api/sync/customers` endpoint for daily HubSpot→Supabase sync
- **Vercel Setup**: Add `CRON_SECRET` in Vercel Dashboard → Settings → Environment Variables

### 🕐 CRON Job Configuration

**Automated Customer Sync**:
The app syncs HubSpot customers to Supabase daily via a CRON job configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync/customers",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Schedule**: Runs daily at 6:00 AM UTC

**How It Works**:
1. Vercel CRON triggers `POST /api/sync/customers` with `Authorization: Bearer <CRON_SECRET>`
2. Middleware validates the CRON_SECRET against environment variable
3. If valid, sync proceeds; if invalid, returns 401 Unauthorized
4. Sync fetches all `lifecyclestage=customer` contacts from HubSpot
5. Upserts them into Supabase `contacts` table
6. Logs results to `customer_sync_transaction_log` table

**Manual Trigger** (from Admin UI):
- Authenticated users can also trigger sync from the admin dashboard
- Uses session cookie instead of CRON_SECRET
- Same endpoint, different auth mechanism

**Security Notes**:
- `.env.local` is gitignored
- Never commit API keys or tokens
- `NEXT_PUBLIC_*` variables are bundled into client JavaScript (ensure they're public-safe)
- Server-only secrets (HubSpot, BrightLocal tokens) are never exposed to client
- Supabase anon key is protected by Row Level Security (RLS) policies

### Test Credentials

**Location**: `.env.local` (lines 39-41)

```env
# Test Credentials for Playwright
TEST_EMAIL=nathan@zing-work.com
TEST_PASSWORD=ZingAdmin2025!
```

**Usage**:
- Automated Playwright tests
- Manual testing and development
- OAuth flow verification scripts
- Default admin account for development

**Important**:
- These are the same credentials used for Supabase authentication
- Required for testing protected routes (admin page, OAuth flows)
- Used by test scripts: `test-oauth-manual.ts`, `test-oauth-flow-complete.ts`
- Reference these in any new test scripts via `process.env.TEST_EMAIL` and `process.env.TEST_PASSWORD`

## 🎨 Styling Guidelines

### Tailwind CSS Classes

**Card Styling**:
```tsx
className="max-w-4xl border-2 shadow-lg"
```

**Icon Containers**:
```tsx
className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
```

**Dropdown Items**:
```tsx
className="py-2.5 pr-10 pl-3 text-base cursor-pointer hover:bg-accent/50"
```

**Headers with Backdrop Blur**:
```tsx
className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
```

### Component Patterns

**Conditional Rendering** (only show if data exists):
```tsx
{profile.phone && (
  <div>
    <Phone />
    <a href={`tel:${profile.phone}`}>{profile.phone}</a>
  </div>
)}
```

**Empty States**:
```tsx
{!hasData && (
  <div className="flex items-center gap-3 border border-dashed">
    <AlertCircle />
    <p>No data available</p>
  </div>
)}
```

## 🐛 Known Issues & Solutions

### Issue: RUBE Response Parsing

**Problem**: Response deeply nested in `content[0].text` as JSON string

**Solution**:
```typescript
const textContent = executeResult?.content?.[0]?.text;
const parsed = JSON.parse(textContent);
const companies = parsed?.data?.data?.results?.[0]?.response?.data?.results;
```

### Issue: Business Hours Not Available

**Problem**: HubSpot doesn't provide business hours data

**Solution**:
- Made `hours` optional in BusinessProfile type
- Removed from converter: `hours: undefined`
- Don't display in UI if not available

### Issue: Missing Address Fields

**Problem**: Some companies have partial address data

**Solution**:
```typescript
const hasAddress = profile.address.street || profile.address.city ||
                   profile.address.state || profile.address.zipCode;
```

## 🚀 Development Workflow

### Starting Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set environment variables**:
   - Create `.env.local` with required variables:
     - Supabase credentials (URL + anon key)
     - HubSpot private app token
     - Pipedream OAuth credentials
     - BrightLocal API key

3. **Start dev server**:
   ```bash
   pnpm dev
   ```

4. **Open browser**:
   - Navigate to `http://localhost:3000`

### Making Changes

**Adding New Components**:
1. Create in `app/components/`
2. Use shadcn/ui primitives from `components/ui/`
3. Follow max-width pattern: `max-w-4xl`
4. Add TypeScript interface for props

**Adding New API Routes**:
1. Create in `app/api/[route]/route.ts`
2. Use direct HubSpot API with `fetch()` and Bearer token
3. Handle errors gracefully with try-catch
4. Return structured JSON with success/error handling
5. For dual-write operations, implement atomic transactions

**Updating Types**:
1. Edit `app/types/business-profile.ts`
2. Ensure backward compatibility
3. Update converter if needed: `app/utils/companyConverter.ts`

## 📊 Performance Considerations

### Current Limitations

- **100 Companies Max**: First page only from HubSpot
- **No Caching**: Fresh API call on each page load
- **No Pagination**: Single page of results
- **Sequential Loading**: Companies → Profile (not parallel)

### Future Optimizations

1. **Implement caching** with SWR or React Query
2. **Add pagination** for >100 companies
3. **Parallel data fetching** for better performance
4. **Virtual scrolling** in dropdown for large lists
5. **Debounced search** in selector

## 🔍 Debugging Tips

### Enable Detailed Logging

All components have console.log statements:
```typescript
console.log('[ComponentName] State:', data);
```

**Key log points**:
- `[API]` - API route execution (HubSpot, Supabase, BrightLocal)
- `[useCompanies]` - Hook data fetching
- `[useAuth]` - Authentication state changes
- `[PropertyEditor]` - Contact property updates
- `[BusinessProfileCard]` - Profile rendering

### Common Issues

**"Failed to fetch companies from HubSpot"**:
- Check `HUBSPOT_ACCESS_TOKEN` in `.env.local`
- Verify token has required permissions (crm.objects.companies.read)
- Check network tab for 401/403 errors
- Verify HubSpot account has companies

**"Contact update failed"**:
- Check dual-write transaction logs in console
- Verify both HubSpot and Supabase are accessible
- Check if rollback was triggered (Phase 2 feature)
- Review PropertyEditor modal confirmation

**"Authentication errors"**:
- Check Supabase credentials in `.env.local`
- Verify session persistence in localStorage
- Check token refresh in network tab
- Review auth state in useAuth hook

**"UI not updating"**:
- Check React state updates in components
- Verify useEffect dependencies
- Check for TypeScript errors in console
- Review SWR cache invalidation

## 📚 Additional Resources

### Tamagui UI Documentation
- Components: https://tamagui.dev/
- Docs: https://tamagui.dev/docs
- GitHub: https://github.com/tamagui/tamagui

### Next.js 16 App Router
- Docs: https://nextjs.org/docs
- API Routes: Server-side only
- React Server Components by default

### HubSpot CRM API v3
- API Docs: https://developers.hubspot.com/docs/api/crm
- Private Apps: https://developers.hubspot.com/docs/api/private-apps
- Authentication: Bearer token with required scopes

### Supabase
- Docs: https://supabase.com/docs
- Auth: https://supabase.com/docs/guides/auth
- Database: https://supabase.com/docs/guides/database

### BrightLocal API
- API Docs: https://developer.brightlocal.com/
- Directory Management: Citation campaigns and location sync

## ✅ Testing Checklist

Before committing changes:

- [ ] All TypeScript errors resolved
- [ ] No console errors in browser
- [ ] Companies load in dropdown
- [ ] Company selection updates profile
- [ ] All fields display correctly (or hidden if empty)
- [ ] Contact property updates show confirmation modal
- [ ] Dual-write operations complete successfully (HubSpot + Supabase)
- [ ] Authentication flow works (login, signup, logout)
- [ ] Responsive on mobile
- [ ] Atomic transactions rollback on failure (Phase 2)

## 🎯 Future Development

### High Priority
1. Pagination support (beyond 100 companies)
2. Search/filter in dropdown
3. Export companies to CSV
4. Real directory sync (not mock)

### Medium Priority
5. Company detail page (separate route)
6. Bulk operations
7. Recent companies history
8. Favorites/bookmarks

### Low Priority
9. Dark mode toggle
10. Custom fields mapping
11. Multi-HubSpot account support
12. Audit log

---

**Last Updated**: November 28, 2025
**Major Updates**:
- **NEW: Database schema documentation** - Complete schema reference at `docs/DATABASE-SCHEMA.md`
- **NEW: Enriched businesses system** - Master data for directory submissions with `enriched_businesses` table
- **NEW: Playwright MCP guide** - Browser automation for BrightLocal category lookups
- **11 businesses imported** - All with BrightLocal category IDs ready for CSV export
- **Removed RUBE dependency** - Replaced with direct HubSpot CRM API v3
- **Dual-write architecture** - Contact updates save to both HubSpot AND Supabase
- **Atomic transactions** - Implementing rollback on failure (Phase 2 in progress)
- Added Pipedream Connect OAuth integration for Google Business Profile
- Created test credentials documentation and verification scripts
- Added Supabase authentication system
- Implemented Tamagui UI framework with complete mobile redesign
**Maintained by**: Claude Code + Development Team
**Questions**: Refer to README.md or contact development team

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| [docs/DATABASE-SCHEMA.md](./docs/DATABASE-SCHEMA.md) | Complete database schema, tables, relationships |
| [docs/ENRICHED-BUSINESSES-WORKFLOW.md](./docs/ENRICHED-BUSINESSES-WORKFLOW.md) | How to enrich and import business data |
| [docs/PLAYWRIGHT-MCP-GUIDE.md](./docs/PLAYWRIGHT-MCP-GUIDE.md) | Browser automation for BrightLocal |
| [docs/BRIGHTLOCAL-API-COMPLETE-GUIDE.md](./docs/BRIGHTLOCAL-API-COMPLETE-GUIDE.md) | BrightLocal API reference |
| [docs/BRIGHTLOCAL-CSV-SCHEMA.md](./docs/BRIGHTLOCAL-CSV-SCHEMA.md) | CSV format for bulk imports |
| [docs/HUBSPOT-SYNC-GUIDE.md](./docs/HUBSPOT-SYNC-GUIDE.md) | HubSpot sync workflows |
