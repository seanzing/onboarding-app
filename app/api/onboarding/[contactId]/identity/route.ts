/**
 * Onboarding Identity API Route
 *
 * PATCH /api/onboarding/[contactId]/identity
 * Set/update duda_site_code, chatbot_slug, foursquare_venue_id in the service identity map.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const body = await request.json()
    const { duda_site_code, chatbot_slug, foursquare_venue_id } = body

    // Build update payload with only provided fields
    const upsertData: Record<string, unknown> = {
      hubspot_contact_id: contactId,
    }

    if (duda_site_code !== undefined) upsertData.duda_site_code = duda_site_code
    if (chatbot_slug !== undefined) upsertData.chatbot_slug = chatbot_slug
    if (foursquare_venue_id !== undefined) upsertData.foursquare_venue_id = foursquare_venue_id

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_identity_map')
      .upsert(upsertData, { onConflict: 'hubspot_contact_id' })
      .select()
      .single()

    if (error) {
      console.error('[Onboarding Identity] Upsert error:', error)
      return NextResponse.json(
        apiError('Failed to update identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    console.log(`[Onboarding Identity] Updated identity for contact ${contactId}`)

    return NextResponse.json(apiSuccess(data))
  } catch (error: unknown) {
    console.error('[Onboarding Identity] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to update identity: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
