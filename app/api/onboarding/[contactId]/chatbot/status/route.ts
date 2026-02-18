/**
 * Chatbot Status API Route
 *
 * GET /api/onboarding/[contactId]/chatbot/status
 * Proxy to chatbot backend to get current config for this contact's chatbot.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
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
      console.error('[Chatbot Status] Identity query error:', identityError)
      return NextResponse.json(
        apiError('Failed to fetch identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    const slug = identity?.chatbot_slug
    if (!slug) {
      return NextResponse.json(
        apiSuccess({
          status: 'not_started',
          message: 'No chatbot slug configured for this contact',
        })
      )
    }

    // Proxy to chatbot backend
    const chatbotBackendUrl = process.env.CHATBOT_BACKEND_URL
    if (!chatbotBackendUrl) {
      return NextResponse.json(
        apiError('Chatbot backend URL not configured', 'SERVICE_UNAVAILABLE'),
        { status: 503 }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${chatbotBackendUrl}/${slug}/config`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        console.error(`[Chatbot Status] Backend returned ${response.status}`)
        return NextResponse.json(
          apiError(`Chatbot backend returned ${response.status}`, 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }

      const config = await response.json()

      return NextResponse.json(
        apiSuccess({
          status: 'active',
          slug,
          config,
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
    console.error('[Chatbot Status] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to fetch chatbot status: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
