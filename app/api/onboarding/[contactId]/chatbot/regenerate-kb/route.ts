/**
 * Chatbot Regenerate Knowledge Base API Route
 *
 * POST /api/onboarding/[contactId]/chatbot/regenerate-kb
 * Proxy to chatbot backend to regenerate the knowledge base.
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
    const supabase = await createClient()

    // Look up chatbot slug from identity map
    const { data: identity, error: identityError } = await supabase
      .from('service_identity_map')
      .select('chatbot_slug')
      .eq('hubspot_contact_id', contactId)
      .maybeSingle()

    if (identityError) {
      console.error('[Chatbot Regenerate KB] Identity query error:', identityError)
      return NextResponse.json(
        apiError('Failed to fetch identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    const slug = identity?.chatbot_slug
    if (!slug) {
      return NextResponse.json(
        apiError('No chatbot slug configured for this contact', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    const chatbotBackendUrl = process.env.CHATBOT_BACKEND_URL
    if (!chatbotBackendUrl) {
      return NextResponse.json(
        apiError('Chatbot backend URL not configured', 'SERVICE_UNAVAILABLE'),
        { status: 503 }
      )
    }

    // Proxy POST to chatbot backend
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(
        `${chatbotBackendUrl}/${slug}/admin/regenerate-kb`,
        {
          method: 'POST',
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)

      if (!response.ok) {
        console.error(`[Chatbot Regenerate KB] Backend returned ${response.status}`)
        return NextResponse.json(
          apiError(`Chatbot backend returned ${response.status}`, 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }

      const result = await response.json()

      // Update last_triggered_at in onboarding_status
      const { error: statusError } = await supabase
        .from('onboarding_status')
        .upsert(
          {
            hubspot_contact_id: contactId,
            service: 'chatbot',
            last_triggered_at: new Date().toISOString(),
          },
          { onConflict: 'hubspot_contact_id,service' }
        )

      if (statusError) {
        console.warn('[Chatbot Regenerate KB] Failed to update last_triggered_at:', statusError)
      }

      console.log(`[Chatbot Regenerate KB] Regenerated KB for slug "${slug}"`)

      return NextResponse.json(
        apiSuccess({
          slug,
          result,
          last_triggered_at: new Date().toISOString(),
        })
      )
    } catch (fetchError: unknown) {
      clearTimeout(timeout)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          apiError('Chatbot backend request timed out', 'EXTERNAL_API_ERROR'),
          { status: 504 }
        )
      }
      throw fetchError
    }
  } catch (error: unknown) {
    console.error('[Chatbot Regenerate KB] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to regenerate knowledge base: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
