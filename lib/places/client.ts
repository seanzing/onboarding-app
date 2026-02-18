/**
 * Google Places API Client
 *
 * Look up public business information for ANY business on Google Maps.
 * No OAuth required - uses API key authentication.
 *
 * Use Cases:
 * - Prospect research before inviting them to connect
 * - Verify business information for potential clients
 * - Competitor analysis
 * - Local SEO research
 *
 * Compatible with existing GBP OAuth setup:
 * - NON-clients: Use this Places API for public data lookup
 * - CLIENTS: Use lib/gbp/client.ts for full read/write access
 */

// API Configuration
const PLACES_API_BASE = 'https://places.googleapis.com/v1';

interface PlacesClientConfig {
  apiKey: string;
}

// Types for Google Places API responses
export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri: string;
    photoUri: string;
  }>;
}

export interface PlaceReview {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text: {
    text: string;
    languageCode: string;
  };
  originalText?: {
    text: string;
    languageCode: string;
  };
  authorAttribution: {
    displayName: string;
    uri: string;
    photoUri: string;
  };
  publishTime: string;
}

export interface PlaceOpeningHours {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close: { day: number; hour: number; minute: number };
  }>;
  weekdayDescriptions?: string[];
  specialDays?: Array<{
    date: { year: number; month: number; day: number };
  }>;
}

export interface PlaceDetails {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: PlaceOpeningHours;
  currentOpeningHours?: PlaceOpeningHours;
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: {
    text: string;
    languageCode: string;
  };
  reviews?: PlaceReview[];
  photos?: PlacePhoto[];
  googleMapsUri?: string;
  utcOffsetMinutes?: number;
}

export interface TextSearchResult {
  places: PlaceDetails[];
}

export interface NearbySearchResult {
  places: PlaceDetails[];
}

/**
 * Google Places API Client
 *
 * Enables public business data lookup without OAuth.
 */
export class PlacesClient {
  private apiKey: string;

  constructor(config?: PlacesClientConfig) {
    this.apiKey = config?.apiKey || process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google Places API key is required. Set GOOGLE_PLACES_API_KEY in your environment.');
    }
  }

  /**
   * Search for businesses by text query.
   *
   * @example
   * const results = await client.textSearch('Route36 Accounting Portland OR');
   * const results = await client.textSearch('pizza restaurants near me', { locationBias: { lat: 45.5, lng: -122.6 } });
   */
  async textSearch(
    query: string,
    options?: {
      locationBias?: { lat: number; lng: number; radius?: number };
      maxResultCount?: number;
      includedType?: string;
      languageCode?: string;
      regionCode?: string;
    }
  ): Promise<PlaceDetails[]> {
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.websiteUri',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.regularOpeningHours',
      'places.businessStatus',
      'places.types',
      'places.primaryType',
      'places.primaryTypeDisplayName',
      'places.priceLevel',
      'places.googleMapsUri',
    ].join(',');

    const body: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: options?.maxResultCount || 10,
    };

    if (options?.locationBias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: options.locationBias.lat,
            longitude: options.locationBias.lng,
          },
          radius: options.locationBias.radius || 5000,
        },
      };
    }

    if (options?.includedType) body.includedType = options.includedType;
    if (options?.languageCode) body.languageCode = options.languageCode;
    if (options?.regionCode) body.regionCode = options.regionCode;

    const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Places API Error (${response.status}): ${error}`);
    }

    const data: TextSearchResult = await response.json();
    return data.places || [];
  }

  /**
   * Get detailed information about a specific place.
   *
   * @param placeId - Google Place ID (e.g., 'ChIJN1t_tDeuEmsRUsoyG83frY4')
   * @param options - Options for the request
   *
   * @example
   * const details = await client.getPlaceDetails('ChIJN1t_tDeuEmsRUsoyG83frY4');
   */
  async getPlaceDetails(
    placeId: string,
    options?: {
      includeReviews?: boolean;
      includePhotos?: boolean;
      languageCode?: string;
    }
  ): Promise<PlaceDetails> {
    const fields = [
      'id',
      'displayName',
      'formattedAddress',
      'addressComponents',
      'location',
      'rating',
      'userRatingCount',
      'priceLevel',
      'websiteUri',
      'nationalPhoneNumber',
      'internationalPhoneNumber',
      'regularOpeningHours',
      'currentOpeningHours',
      'businessStatus',
      'types',
      'primaryType',
      'primaryTypeDisplayName',
      'googleMapsUri',
      'utcOffsetMinutes',
    ];

    if (options?.includeReviews !== false) fields.push('reviews');
    if (options?.includePhotos !== false) fields.push('photos');

    const fieldMask = fields.join(',');

    let url = `${PLACES_API_BASE}/places/${placeId}`;
    if (options?.languageCode) {
      url += `?languageCode=${options.languageCode}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Places API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Search for nearby businesses.
   *
   * @param location - Center point for the search
   * @param options - Search options
   *
   * @example
   * const nearby = await client.nearbySearch(
   *   { lat: 45.5231, lng: -122.6765 },
   *   { includedTypes: ['accounting'], radius: 5000 }
   * );
   */
  async nearbySearch(
    location: { lat: number; lng: number },
    options?: {
      radius?: number;
      includedTypes?: string[];
      excludedTypes?: string[];
      maxResultCount?: number;
      languageCode?: string;
      rankPreference?: 'DISTANCE' | 'POPULARITY';
    }
  ): Promise<PlaceDetails[]> {
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.websiteUri',
      'places.nationalPhoneNumber',
      'places.businessStatus',
      'places.types',
      'places.primaryType',
      'places.googleMapsUri',
    ].join(',');

    const body: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius: options?.radius || 5000,
        },
      },
      maxResultCount: options?.maxResultCount || 20,
    };

    if (options?.includedTypes) body.includedTypes = options.includedTypes;
    if (options?.excludedTypes) body.excludedTypes = options.excludedTypes;
    if (options?.languageCode) body.languageCode = options.languageCode;
    if (options?.rankPreference) body.rankPreference = options.rankPreference;

    const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Places API Error (${response.status}): ${error}`);
    }

    const data: NearbySearchResult = await response.json();
    return data.places || [];
  }

  /**
   * Get a photo URL for a place photo.
   *
   * @param photoName - The photo resource name from PlaceDetails.photos[].name
   * @param maxWidth - Maximum width in pixels (1-4800)
   * @param maxHeight - Maximum height in pixels (1-4800)
   *
   * @example
   * const photoUrl = client.getPhotoUrl(place.photos[0].name, 400, 300);
   */
  getPhotoUrl(photoName: string, maxWidth: number = 400, maxHeight: number = 300): string {
    return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${this.apiKey}`;
  }

  /**
   * Autocomplete place search (for search-as-you-type).
   *
   * @param input - Partial search text
   * @param options - Autocomplete options
   *
   * @example
   * const suggestions = await client.autocomplete('Route36 Account');
   */
  async autocomplete(
    input: string,
    options?: {
      locationBias?: { lat: number; lng: number; radius?: number };
      includedPrimaryTypes?: string[];
      languageCode?: string;
      regionCode?: string;
    }
  ): Promise<Array<{
    placePrediction: {
      placeId: string;
      text: { text: string };
      structuredFormat: {
        mainText: { text: string };
        secondaryText: { text: string };
      };
    };
  }>> {
    const body: Record<string, unknown> = {
      input,
      includeQueryPredictions: false,
    };

    if (options?.locationBias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: options.locationBias.lat,
            longitude: options.locationBias.lng,
          },
          radius: options.locationBias.radius || 50000,
        },
      };
    }

    if (options?.includedPrimaryTypes) body.includedPrimaryTypes = options.includedPrimaryTypes;
    if (options?.languageCode) body.languageCode = options.languageCode;
    if (options?.regionCode) body.regionCode = options.regionCode;

    const response = await fetch(`${PLACES_API_BASE}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Places API Error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  }
}

// Export a default client instance (uses env var)
let _defaultClient: PlacesClient | null = null;

export function getPlacesClient(): PlacesClient {
  if (!_defaultClient) {
    _defaultClient = new PlacesClient();
  }
  return _defaultClient;
}

// Convenience functions
export async function lookupBusiness(query: string): Promise<PlaceDetails | null> {
  const client = getPlacesClient();
  const results = await client.textSearch(query, { maxResultCount: 1 });
  if (results.length === 0) return null;

  // Get full details including reviews and photos
  return client.getPlaceDetails(results[0].id, {
    includeReviews: true,
    includePhotos: true,
  });
}

export async function findNearbyBusinesses(
  lat: number,
  lng: number,
  type?: string
): Promise<PlaceDetails[]> {
  const client = getPlacesClient();
  return client.nearbySearch(
    { lat, lng },
    { includedTypes: type ? [type] : undefined }
  );
}
