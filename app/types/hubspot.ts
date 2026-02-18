/**
 * Unified HubSpot Type Definitions
 *
 * Consolidated from various route files to provide a single source of truth
 * for HubSpot-related TypeScript interfaces.
 *
 * Migration: Types previously exported from API routes are now centralized here.
 */

/**
 * HubSpot Contact Interface
 *
 * Represents a contact object from HubSpot CRM API v3.
 * Includes both explicit property types and dynamic property access.
 */
export interface HubSpotContact {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Whether the contact has been archived in HubSpot */
  archived?: boolean;
  properties: {
    // Core contact properties
    email?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    phone?: string | null;
    company?: string | null;
    website?: string | null;

    // Address properties
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;

    // Business properties
    jobtitle?: string | null;
    lifecyclestage?: string | null;
    hs_lead_status?: string | null;

    // Allow any other HubSpot properties
    [key: string]: string | null | undefined;
  };
}

/**
 * HubSpot Company Interface
 *
 * Represents a company object from HubSpot CRM API v3 or CSV export.
 * Used for business profile display and directory sync operations.
 */
export interface HubSpotCompany {
  id: string;
  name: string | null;
  domain: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  description?: string | null;
  industry?: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  /** HubSpot record URL (only available from CSV exports) */
  url?: string;
}

/**
 * HubSpot Property Definition
 *
 * Represents a property schema from HubSpot's property API.
 */
export interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  description?: string;
  groupName?: string;
  options?: Array<{
    label: string;
    value: string;
    displayOrder?: number;
  }>;
}

/**
 * HubSpot API Response wrapper
 *
 * Generic response structure from HubSpot CRM API v3.
 */
export interface HubSpotApiResponse<T> {
  results: T[];
  paging?: {
    next?: {
      after: string;
      link?: string;
    };
  };
}

/**
 * HubSpot Contacts Response
 */
export type HubSpotContactsResponse = HubSpotApiResponse<HubSpotContact>;

/**
 * HubSpot Companies Response
 */
export type HubSpotCompaniesResponse = HubSpotApiResponse<HubSpotCompany>;
