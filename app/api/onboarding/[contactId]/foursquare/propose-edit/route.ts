/**
 * Foursquare Propose Edit API Route
 *
 * POST /api/onboarding/[contactId]/foursquare/propose-edit
 * Propose edits to an existing Foursquare venue's information.
 *
 * NOTE: The Foursquare Propose Edit endpoint requires a Service Account API key.
 * If FOURSQUARE_SERVICE_ACCOUNT_KEY is not set, this will fall back to using
 * FOURSQUARE_API_KEY, which may return 403 if it's not a service account key.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FSQ_BASE = 'https://places-api.foursquare.com/places'
const FSQ_VERSION = '2025-06-17'
const TIMEOUT_MS = 15_000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const body = await request.json()
    const { name, address, city, state, zip, tel, website } = body

    // Need at least one field to edit
    const hasEdits = name || address || city || state || zip || tel || website
    if (!hasEdits) {
      return NextResponse.json(
        apiError('No editable fields provided', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Look up venue ID
    const { data: identity, error: identityError } = await supabase
      .from('service_identity_map')
      .select('foursquare_venue_id')
      .eq('hubspot_contact_id', contactId)
      .maybeSingle()

    if (identityError) {
      console.error('[Foursquare Propose Edit] Identity query error:', identityError)
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

    // Prefer service account key, fall back to standard API key
    const apiKey = process.env.FOURSQUARE_SERVICE_ACCOUNT_KEY || process.env.FOURSQUARE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        apiError('Foursquare API key not configured', 'SERVICE_UNAVAILABLE'),
        { status: 503 }
      )
    }

    // Build edit payload — only include fields that were provided
    const editPayload: Record<string, unknown> = {}
    if (name) editPayload.name = name
    if (address) editPayload.address = address
    if (city) editPayload.locality = city
    if (state) editPayload.region = state
    if (zip) editPayload.postcode = zip
    if (tel) editPayload.tel = tel
    if (website) editPayload.website = website

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(
        `${FSQ_BASE}/${fsqId}/suggest/edit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Places-Api-Version': FSQ_VERSION,
          },
          body: JSON.stringify(editPayload),
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        console.error(`[Foursquare Propose Edit] API returned ${response.status}:`, errText)

        if (response.status === 403) {
          return NextResponse.json(
            apiError(
              'Foursquare Propose Edit requires a Service Account API key. Set FOURSQUARE_SERVICE_ACCOUNT_KEY in your environment.',
              'FORBIDDEN'
            ),
            { status: 403 }
          )
        }

        return NextResponse.json(
          apiError(`Foursquare API returned ${response.status}`, 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }

      const result = await response.json()

      // Update last_triggered_at in onboarding_status
      await supabase
        .from('onboarding_status')
        .upsert(
          {
            hubspot_contact_id: contactId,
            service: 'foursquare',
            last_triggered_at: new Date().toISOString(),
          },
          { onConflict: 'hubspot_contact_id,service' }
        )

      console.log(`[Foursquare Propose Edit] Submitted edit for venue ${fsqId} (contact ${contactId})`)

      return NextResponse.json(
        apiSuccess({
          fsq_id: fsqId,
          edits_submitted: editPayload,
          result,
        })
      )
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
    console.error('[Foursquare Propose Edit] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to propose edit: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
