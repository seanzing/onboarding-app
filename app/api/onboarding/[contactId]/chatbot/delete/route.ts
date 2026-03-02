/**
 * Chatbot Delete API Route
 *
 * DELETE /api/onboarding/[contactId]/chatbot/delete
 * Hard-delete the chatbot client from the backend and clear the slug.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
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
      console.error('[Chatbot Delete] Identity query error:', identityError)
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

    // Call chatbot backend delete endpoint
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
      const res = await fetch(`${chatbotBackendUrl}/${slug}/admin`, {
        method: 'DELETE',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        console.error(`[Chatbot Delete] Backend returned ${res.status}`)
        return NextResponse.json(
          apiError(`Chatbot backend returned ${res.status}`, 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }
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

    // Clear chatbot slug from identity map
    const { error: clearError } = await supabase
      .from('service_identity_map')
      .update({ chatbot_slug: null })
      .eq('hubspot_contact_id', contactId)

    if (clearError) {
      console.warn('[Chatbot Delete] Failed to clear slug from identity map:', clearError)
    }

    // Remove onboarding status for chatbot
    const { error: statusError } = await supabase
      .from('onboarding_status')
      .delete()
      .eq('hubspot_contact_id', contactId)
      .eq('service', 'chatbot')

    if (statusError) {
      console.warn('[Chatbot Delete] Failed to remove onboarding status:', statusError)
    }

    console.log(`[Chatbot Delete] Deleted chatbot "${slug}" for contact ${contactId}`)

    return NextResponse.json(apiSuccess({ slug, deleted: true }))
  } catch (error: unknown) {
    console.error('[Chatbot Delete] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to delete chatbot: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
