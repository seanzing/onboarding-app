/**
 * Foursquare Submit API Route
 *
 * POST /api/onboarding/[contactId]/foursquare/submit
 * Submit venue to Foursquare or generate a manual export.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const body = await request.json()
    const { name, address, city, state, zip, lat, lng, categories } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "name" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const foursquareApiKey = process.env.FOURSQUARE_API_KEY

    if (foursquareApiKey) {
      // Attempt to create venue via Foursquare API
      try {
        const venuePayload: Record<string, unknown> = { name }
        if (address) venuePayload.address = address
        if (city) venuePayload.city = city
        if (state) venuePayload.state = state
        if (zip) venuePayload.zip = zip
        if (lat && lng) {
          venuePayload.ll = `${lat},${lng}`
        }
        if (categories && Array.isArray(categories) && categories.length > 0) {
          venuePayload.categoryIds = categories.join(',')
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        const response = await fetch('https://api.foursquare.com/v3/places', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: foursquareApiKey,
          },
          body: JSON.stringify(venuePayload),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
          const errorBody = await response.text()
          console.error(`[Foursquare Submit] API returned ${response.status}:`, errorBody)
          return NextResponse.json(
            apiError(`Foursquare API returned ${response.status}`, 'EXTERNAL_API_ERROR'),
            { status: 502 }
          )
        }

        const venue = await response.json()
        const venueId = venue.fsq_id || venue.id

        // Update service_identity_map with venue ID
        const { error: identityError } = await supabase
          .from('service_identity_map')
          .upsert(
            { hubspot_contact_id: contactId, foursquare_venue_id: venueId },
            { onConflict: 'hubspot_contact_id' }
          )

        if (identityError) {
          console.warn('[Foursquare Submit] Failed to update identity map:', identityError)
        }

        // Update onboarding_status
        const { error: statusError } = await supabase
          .from('onboarding_status')
          .upsert(
            {
              hubspot_contact_id: contactId,
              service: 'foursquare',
              status: 'active',
              provisioned_at: new Date().toISOString(),
              metadata: { venue_id: venueId, venue_name: name },
            },
            { onConflict: 'hubspot_contact_id,service' }
          )

        if (statusError) {
          console.warn('[Foursquare Submit] Failed to update onboarding status:', statusError)
        }

        console.log(`[Foursquare Submit] Created venue "${name}" (${venueId}) for contact ${contactId}`)

        return NextResponse.json(
          apiSuccess({
            contactId,
            venue_id: venueId,
            venue,
            status: 'active',
          })
        )
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return NextResponse.json(
            apiError('Foursquare API request timed out', 'EXTERNAL_API_ERROR'),
            { status: 504 }
          )
        }
        throw fetchError
      }
    } else {
      // No API key -- store as manual export
      const venueData = { name, address, city, state, zip, lat, lng, categories }

      const { error: statusError } = await supabase
        .from('onboarding_status')
        .upsert(
          {
            hubspot_contact_id: contactId,
            service: 'foursquare',
            status: 'pending',
            last_triggered_at: new Date().toISOString(),
            metadata: { manual_export: true, venue_data: venueData },
          },
          { onConflict: 'hubspot_contact_id,service' }
        )

      if (statusError) {
        console.error('[Foursquare Submit] Failed to store manual export:', statusError)
        return NextResponse.json(
          apiError('Failed to store venue data', 'INTERNAL_ERROR'),
          { status: 500 }
        )
      }

      console.log(`[Foursquare Submit] Stored manual export for contact ${contactId}`)

      return NextResponse.json(
        apiSuccess({
          contactId,
          status: 'pending',
          manual_export: true,
          venue_data: venueData,
        })
      )
    }
  } catch (error: unknown) {
    console.error('[Foursquare Submit] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to submit Foursquare venue: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
