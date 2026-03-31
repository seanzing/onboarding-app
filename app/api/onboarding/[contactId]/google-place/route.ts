/**
 * Google Place Link & Details API
 *
 * GET  /api/onboarding/[contactId]/google-place — Get linked place details
 * POST /api/onboarding/[contactId]/google-place — Link a Google Place ID to this contact
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'
import { PlacesClient } from '@/lib/places/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET — Fetch details for the linked Google Place
 * Returns full place data (address, lat/lng, hours, categories, photos)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const supabase = await createClient()

    // Look up the stored google_place_id
    const { data: identity, error: identityError } = await supabase
      .from('service_identity_map')
      .select('google_place_id')
      .eq('hubspot_contact_id', contactId)
      .maybeSingle()

    if (identityError) {
      console.error('[Google Place] Identity lookup error:', identityError)
      return NextResponse.json(
        apiError('Failed to look up identity', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    if (!identity?.google_place_id) {
      return NextResponse.json(
        apiSuccess({ linked: false, place: null })
      )
    }

    // Fetch full details from Google Places API
    const client = new PlacesClient()
    const place = await client.getPlaceDetails(identity.google_place_id, {
      includeReviews: false,
      includePhotos: true,
    })

    const transformed = {
      placeId: place.id,
      name: place.displayName?.text,
      address: place.formattedAddress,
      addressComponents: place.addressComponents?.reduce((acc, comp) => {
        if (comp.types.includes('street_number')) acc.streetNumber = comp.longText
        if (comp.types.includes('route')) acc.street = comp.longText
        if (comp.types.includes('locality')) acc.city = comp.longText
        if (comp.types.includes('administrative_area_level_1')) acc.state = comp.shortText
        if (comp.types.includes('postal_code')) acc.zipCode = comp.longText
        if (comp.types.includes('country')) acc.country = comp.shortText
        return acc
      }, {} as Record<string, string>),
      location: place.location,
      rating: place.rating,
      totalReviews: place.userRatingCount,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
      website: place.websiteUri,
      businessStatus: place.businessStatus,
      category: place.primaryTypeDisplayName?.text || place.primaryType,
      types: place.types,
      googleMapsUrl: place.googleMapsUri,
      hours: place.regularOpeningHours?.weekdayDescriptions,
      hoursPeriods: place.regularOpeningHours?.periods,
      isOpenNow: place.currentOpeningHours?.openNow,
      photos: place.photos?.slice(0, 5).map(photo => ({
        name: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
        url: client.getPhotoUrl(photo.name, 800, 600),
        thumbnail: client.getPhotoUrl(photo.name, 200, 150),
      })),
    }

    return NextResponse.json(
      apiSuccess({ linked: true, place: transformed })
    )
  } catch (error: unknown) {
    console.error('[Google Place] Error fetching details:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to fetch place details: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * POST — Link a Google Place ID to this contact
 * Body: { placeId: string }
 *
 * Also accepts a Google Maps URL and extracts the place ID from it.
 * Body: { mapsUrl: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const body = await request.json()
    let { placeId } = body
    const { mapsUrl } = body

    // If a Google Maps URL was provided, extract the place ID
    if (!placeId && mapsUrl) {
      placeId = await extractPlaceIdFromUrl(mapsUrl)
      if (!placeId) {
        return NextResponse.json(
          apiError(
            'Could not extract a Place ID from that URL. Please use a direct Google Maps link to the business.',
            'BAD_REQUEST'
          ),
          { status: 400 }
        )
      }
    }

    if (!placeId || typeof placeId !== 'string') {
      return NextResponse.json(
        apiError('Missing placeId or mapsUrl in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    // Verify the place exists by fetching details
    const client = new PlacesClient()
    let placeName: string
    try {
      const place = await client.getPlaceDetails(placeId, {
        includeReviews: false,
        includePhotos: false,
      })
      placeName = place.displayName?.text || 'Unknown'
    } catch {
      return NextResponse.json(
        apiError('Invalid Place ID — could not find this business on Google', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    // Store in service_identity_map
    const supabase = await createClient()

    const { error: upsertError } = await supabase
      .from('service_identity_map')
      .upsert(
        { hubspot_contact_id: contactId, google_place_id: placeId },
        { onConflict: 'hubspot_contact_id' }
      )

    if (upsertError) {
      console.error('[Google Place] Upsert error:', upsertError)
      return NextResponse.json(
        apiError('Failed to save place link', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    console.log(`[Google Place] Linked "${placeName}" (${placeId}) to contact ${contactId}`)

    return NextResponse.json(
      apiSuccess({ contactId, placeId, placeName })
    )
  } catch (error: unknown) {
    console.error('[Google Place] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to link place: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * Extract a Google Place ID from various Google Maps URL formats:
 * - https://www.google.com/maps/place/...
 * - https://maps.google.com/?cid=...
 * - https://goo.gl/maps/...  (short links — follow redirect)
 * - https://maps.app.goo.gl/...  (new short links)
 *
 * Falls back to text-searching the business name from the URL.
 */
async function extractPlaceIdFromUrl(url: string): Promise<string | null> {
  try {
    // Format: /maps/place/BUSINESS+NAME/@lat,lng,.../data=...!1s<PLACE_ID>...
    // The place ID is in the ChIJ... format inside the data parameter
    const chijMatch = url.match(/!1s(ChIJ[A-Za-z0-9_-]+)/)
    if (chijMatch) return chijMatch[1]

    // Format: place_id query param
    const urlObj = new URL(url)
    const placeIdParam = urlObj.searchParams.get('place_id')
    if (placeIdParam) return placeIdParam

    // Format: ftid query param (sometimes used)
    const ftid = urlObj.searchParams.get('ftid')
    if (ftid) return ftid

    // For short links or URLs with business name but no place ID,
    // extract the business name and search for it
    const placeNameMatch = url.match(/\/maps\/place\/([^/@]+)/)
    if (placeNameMatch) {
      const searchQuery = decodeURIComponent(placeNameMatch[1]).replace(/\+/g, ' ')
      const client = new PlacesClient()
      const results = await client.textSearch(searchQuery, { maxResultCount: 1 })
      if (results.length > 0) return results[0].id
    }

    // For goo.gl short links, follow the redirect to get the full URL
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      const response = await fetch(url, { redirect: 'follow' })
      const finalUrl = response.url
      if (finalUrl !== url) {
        return extractPlaceIdFromUrl(finalUrl)
      }
    }

    return null
  } catch {
    return null
  }
}