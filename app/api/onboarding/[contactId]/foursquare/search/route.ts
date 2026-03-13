/**
 * Foursquare Search API Route
 *
 * GET /api/onboarding/[contactId]/foursquare/search
 * Search for existing Foursquare venues before creating a new one.
 * Tries exact match first, falls back to fuzzy search.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FSQ_BASE = 'https://places-api.foursquare.com/places'
const FSQ_VERSION = '2025-06-17'
const TIMEOUT_MS = 15_000

async function fsqFetch(url: string, apiKey: string, signal: AbortSignal) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'X-Places-Api-Version': FSQ_VERSION,
    },
    signal,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  await params // consume params even though we don't need contactId for the search

  const sp = request.nextUrl.searchParams
  const name = sp.get('name')
  const address = sp.get('address')
  const city = sp.get('city')
  const state = sp.get('state')
  const zip = sp.get('zip')

  if (!name) {
    return NextResponse.json(
      apiError('Missing "name" query parameter', 'BAD_REQUEST'),
      { status: 400 }
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
    // Phase 1: Exact match (requires address, city, and cc)
    if (address && city) {
      const matchParams = new URLSearchParams({ name, address, city, cc: 'US' })
      if (state) matchParams.set('state', state)
      if (zip) matchParams.set('postalCode', zip)

      const matchRes = await fsqFetch(
        `${FSQ_BASE}/match?${matchParams}`,
        foursquareApiKey,
        controller.signal
      )

      if (matchRes.ok) {
        const matchData = await matchRes.json()
        const match = matchData?.place
        if (match?.fsq_place_id) {
          clearTimeout(timeout)
          return NextResponse.json(
            apiSuccess({ match, results: [] })
          )
        }
      }
    }
    // No exact match or insufficient params, fall through to fuzzy search

    // Phase 2: Fuzzy search
    const searchParams = new URLSearchParams({ query: name, limit: '5' })
    const nearParts = [city, state].filter(Boolean).join(', ')
    if (nearParts) {
      searchParams.set('near', nearParts)
    }

    const searchRes = await fsqFetch(
      `${FSQ_BASE}/search?${searchParams}`,
      foursquareApiKey,
      controller.signal
    )
    clearTimeout(timeout)

    if (!searchRes.ok) {
      const errText = await searchRes.text().catch(() => '')
      console.error(`[Foursquare Search] API returned ${searchRes.status}:`, errText)
      return NextResponse.json(
        apiError(`Foursquare API returned ${searchRes.status}`, 'EXTERNAL_API_ERROR'),
        { status: 502 }
      )
    }

    const searchData = await searchRes.json()
    const results = searchData?.results || []

    return NextResponse.json(
      apiSuccess({ match: null, results })
    )
  } catch (err: unknown) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        apiError('Foursquare API request timed out', 'EXTERNAL_API_ERROR'),
        { status: 504 }
      )
    }
    console.error('[Foursquare Search] Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to search Foursquare: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
