/**
 * Blog Generate API Route
 *
 * POST /api/onboarding/[contactId]/blogs/generate
 * Proxy to blog service to generate blogs for a contact's site.
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
    const { duda_site_code, business_name, industry, location } = body

    if (!duda_site_code || typeof duda_site_code !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "duda_site_code" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (!business_name || typeof business_name !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "business_name" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (!industry || typeof industry !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "industry" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (!location || typeof location !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "location" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    const blogServiceUrl = process.env.BLOG_SERVICE_URL
    if (!blogServiceUrl) {
      return NextResponse.json(
        apiError('Blog service URL not configured', 'SERVICE_UNAVAILABLE'),
        { status: 503 }
      )
    }

    // Proxy POST to blog service (DirectGenerationRequest schema)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${blogServiceUrl}/generate/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name, industry, location, duda_site_code }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error(`[Blogs Generate] Blog service returned ${response.status}: ${errorText}`)
        return NextResponse.json(
          apiError(`Blog service returned ${response.status}`, 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }

      const result = await response.json()

      // Upsert onboarding_status for blogs
      const supabase = await createClient()

      const { error: statusError } = await supabase
        .from('onboarding_status')
        .upsert(
          {
            hubspot_contact_id: contactId,
            service: 'blogs',
            status: 'pending',
            last_triggered_at: new Date().toISOString(),
            metadata: { business_name, industry, location, duda_site_code },
          },
          { onConflict: 'hubspot_contact_id,service' }
        )

      if (statusError) {
        console.warn('[Blogs Generate] Failed to update onboarding status:', statusError)
      }

      console.log(`[Blogs Generate] Triggered blogs for ${business_name} (${industry}) at ${location}`)

      return NextResponse.json(
        apiSuccess({
          contactId,
          duda_site_code,
          business_name,
          industry,
          location,
          result,
          status: 'pending',
          last_triggered_at: new Date().toISOString(),
        })
      )
    } catch (fetchError: unknown) {
      clearTimeout(timeout)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          apiError('Blog service request timed out', 'EXTERNAL_API_ERROR'),
          { status: 504 }
        )
      }
      throw fetchError
    }
  } catch (error: unknown) {
    console.error('[Blogs Generate] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to generate blogs: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
