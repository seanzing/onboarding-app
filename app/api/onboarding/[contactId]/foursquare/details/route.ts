/**
 * Foursquare Details API Route
 *
 * GET /api/onboarding/[contactId]/foursquare/details
 * Fetch full venue details from Foursquare for a linked venue.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FSQ_BASE = 'https://places-api.foursquare.com/places'
const FSQ_VERSION = '2025-06-17'
const TIMEOUT_MS = 15_000

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const supabase = await createClient()

    // Look up venue ID from identity map
    const { data: identity, error: identityError } = await supabase
      .from('service_identity_map')
      .select('foursquare_venue_id')
      .eq('hubspot_contact_id', contactId)
      .maybeSingle()

    if (identityError) {
      console.error('[Foursquare Details] Identity query error:', identityError)
      return NextResponse.json(
        apiError('Failed to fetch identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    const fsqId = identity?.foursquare_venue_id
    if (!fsqId) {
      return NextResponse.json(
        apiError('No Foursquare venue linked for this contact', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    const foursquareApiKey = process.env.FOURSQUARE_SERVICE_ACCOUNT_KEY || process.env.FOURSQUARE_API_KEY
    if (!foursquareApiKey) {
      return NextResponse.json(
        apiError('Foursquare API key not configured', 'SERVICE_UNAVAILABLE'),
        { status: 503 }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(
        `${FSQ_BASE}/${fsqId}`,
        {
          headers: {
            Authorization: `Bearer ${foursquareApiKey}`,
            Accept: 'application/json',
            'X-Places-Api-Version': FSQ_VERSION,
          },
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        console.error(`[Foursquare Details] API returned ${response.status}:`, errText)
        return NextResponse.json(
          apiError(`Foursquare API returned ${response.status}`, 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }

      const venue = await response.json()
      return NextResponse.json(apiSuccess(venue))
    } catch (fetchError: unknown) {
      clearTimeout(timeout)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          apiError('Foursquare API request timed out', 'EXTERNAL_API_ERROR'),
          { status: 504 }
        )
      }
      throw fetchError
    }
  } catch (error: unknown) {
    console.error('[Foursquare Details] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to fetch venue details: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
