/**
 * Landing Pages Generate API Route
 *
 * POST /api/onboarding/[contactId]/landing-pages/generate
 * Proxy to landing pages service to generate location pages.
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

  const landingPagesUrl = process.env.LANDING_PAGES_URL
  if (!landingPagesUrl) {
    return NextResponse.json(
      apiError('Landing pages service not configured', 'SERVICE_UNAVAILABLE'),
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const num_pages = body.num_pages ?? 50
    const { base_location, duda_site_code, industry, collection_name } = body

    if (!duda_site_code || typeof duda_site_code !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "duda_site_code" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (!base_location || typeof base_location !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "base_location" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (!industry || typeof industry !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "industry" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    // Proxy POST to landing pages service
    // Maps our field names to the service's expected schema (OneOffRequest)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const servicePayload: Record<string, unknown> = {
        site_code: duda_site_code,
        industry,
        base_location,
        num_pages,
      }
      if (collection_name) servicePayload.collection_name = collection_name

      const response = await fetch(`${landingPagesUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicePayload),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error(`[Landing Pages Generate] Service returned ${response.status}: ${errorText}`)
        return NextResponse.json(
          apiError(`Landing pages service returned ${response.status}`, 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }

      const result = await response.json()

      // Upsert onboarding_status for landing_pages
      const supabase = await createClient()

      const { error: statusError } = await supabase
        .from('onboarding_status')
        .upsert(
          {
            hubspot_contact_id: contactId,
            service: 'landing_pages',
            status: 'pending',
            last_triggered_at: new Date().toISOString(),
            metadata: { num_pages, base_location, duda_site_code, industry, collection_name },
          },
          { onConflict: 'hubspot_contact_id,service' }
        )

      if (statusError) {
        console.warn('[Landing Pages Generate] Failed to update onboarding status:', statusError)
      }

      console.log(`[Landing Pages Generate] Triggered ${num_pages} pages for site ${duda_site_code} (${industry})`)

      return NextResponse.json(
        apiSuccess({
          contactId,
          duda_site_code,
          industry,
          num_pages,
          base_location,
          result,
          status: 'pending',
          last_triggered_at: new Date().toISOString(),
        })
      )
    } catch (fetchError: unknown) {
      clearTimeout(timeout)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          apiError('Landing pages service request timed out', 'EXTERNAL_API_ERROR'),
          { status: 504 }
        )
      }
      throw fetchError
    }
  } catch (error: unknown) {
    console.error('[Landing Pages Generate] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to generate landing pages: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
