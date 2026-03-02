/**
 * Chatbot Provision API Route
 *
 * POST /api/onboarding/[contactId]/chatbot/provision
 * Set chatbot slug and mark the chatbot service as provisioned.
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
    const { slug, name, company_info, branding, support_email } = body

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        apiError('Missing or invalid "slug" in request body', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Upsert slug into service_identity_map
    const { error: identityError } = await supabase
      .from('service_identity_map')
      .upsert(
        { hubspot_contact_id: contactId, chatbot_slug: slug },
        { onConflict: 'hubspot_contact_id' }
      )

    if (identityError) {
      console.error('[Chatbot Provision] Identity upsert error:', identityError)
      return NextResponse.json(
        apiError('Failed to update identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    // Create client in chatbot backend
    const chatbotBackendUrl = process.env.CHATBOT_BACKEND_URL
    if (chatbotBackendUrl) {
      try {
        const createRes = await fetch(`${chatbotBackendUrl}/${slug}/admin/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || '',
            company_info: company_info || {},
            branding: branding || {},
            support_email: support_email || '',
          }),
        })

        if (!createRes.ok) {
          console.error(`[Chatbot Provision] Backend create returned ${createRes.status}`)
          return NextResponse.json(
            apiError('Failed to create client in chatbot backend', 'EXTERNAL_API_ERROR'),
            { status: 502 }
          )
        }

        console.log(`[Chatbot Provision] Created client in chatbot backend for slug "${slug}"`)
      } catch (err) {
        console.error('[Chatbot Provision] Backend create fetch error:', err)
        return NextResponse.json(
          apiError('Chatbot backend unreachable', 'EXTERNAL_API_ERROR'),
          { status: 502 }
        )
      }
    }

    // Upsert onboarding_status for chatbot
    const { error: statusError } = await supabase
      .from('onboarding_status')
      .upsert(
        {
          hubspot_contact_id: contactId,
          service: 'chatbot',
          status: 'active',
          provisioned_at: new Date().toISOString(),
        },
        { onConflict: 'hubspot_contact_id,service' }
      )

    if (statusError) {
      console.error('[Chatbot Provision] Status upsert error:', statusError)
      return NextResponse.json(
        apiError('Failed to update onboarding status', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    console.log(`[Chatbot Provision] Provisioned chatbot "${slug}" for contact ${contactId}`)

    return NextResponse.json(
      apiSuccess({
        contactId,
        slug,
        status: 'active',
        provisioned_at: new Date().toISOString(),
      })
    )
  } catch (error: unknown) {
    console.error('[Chatbot Provision] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to provision chatbot: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
