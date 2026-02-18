/**
 * Place Details API
 *
 * Get detailed information about a specific business.
 * Includes reviews, photos, hours, and all available data.
 *
 * GET /api/places/[placeId]
 * GET /api/places/ChIJN1t_tDeuEmsRUsoyG83frY4?includeReviews=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlacesClient } from '@/lib/places/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeReviews = searchParams.get('includeReviews') !== 'false';
    const includePhotos = searchParams.get('includePhotos') !== 'false';

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      );
    }

    const client = new PlacesClient();

    const place = await client.getPlaceDetails(placeId, {
      includeReviews,
      includePhotos,
    });

    // Transform to a cleaner format
    const business = {
      placeId: place.id,
      name: place.displayName?.text,
      address: place.formattedAddress,
      addressComponents: place.addressComponents?.reduce((acc, comp) => {
        if (comp.types.includes('street_number')) acc.streetNumber = comp.longText;
        if (comp.types.includes('route')) acc.street = comp.longText;
        if (comp.types.includes('locality')) acc.city = comp.longText;
        if (comp.types.includes('administrative_area_level_1')) acc.state = comp.shortText;
        if (comp.types.includes('postal_code')) acc.zipCode = comp.longText;
        if (comp.types.includes('country')) acc.country = comp.shortText;
        return acc;
      }, {} as Record<string, string>),
      location: place.location,
      rating: place.rating,
      totalReviews: place.userRatingCount,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
      website: place.websiteUri,
      businessStatus: place.businessStatus,
      category: place.primaryTypeDisplayName?.text || place.primaryType,
      types: place.types,
      priceLevel: place.priceLevel,
      googleMapsUrl: place.googleMapsUri,
      hours: {
        weekdays: place.regularOpeningHours?.weekdayDescriptions,
        isOpenNow: place.currentOpeningHours?.openNow,
        periods: place.regularOpeningHours?.periods,
      },
      reviews: place.reviews?.map(review => ({
        author: review.authorAttribution.displayName,
        authorPhoto: review.authorAttribution.photoUri,
        authorUrl: review.authorAttribution.uri,
        rating: review.rating,
        text: review.text?.text,
        time: review.relativePublishTimeDescription,
        publishedAt: review.publishTime,
      })),
      photos: place.photos?.map(photo => ({
        name: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
        url: client.getPhotoUrl(photo.name, 800, 600),
        thumbnail: client.getPhotoUrl(photo.name, 200, 150),
        attribution: photo.authorAttributions?.[0]?.displayName,
      })),
    };

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Place details error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
