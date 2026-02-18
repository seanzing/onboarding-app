// Business Profile Types

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface BusinessHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  address: BusinessAddress;
  phone: string;
  email: string;
  website: string;
  description: string;
  categories: string[];
  hours?: BusinessHours; // Optional - not always available from HubSpot
  photos: string[];
  logo?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

// API Response Types

/**
 * BusinessProfileApiResponse - Response format for business profile API
 *
 * Note: Renamed from HubSpotApiResponse to avoid confusion with
 * the generic HubSpotApiResponse<T> in app/types/hubspot.ts
 */
export interface BusinessProfileApiResponse {
  success: boolean;
  data: BusinessProfile;
  timestamp: string;
  metadata?: {
    totalCompanies?: number;
    totalContacts?: number;
    aiSteps?: number;
  };
}
