/**
 * Onboarding Status API Route
 *
 * GET /api/onboarding/[contactId]/status
 * Returns the full onboarding picture: identity map + all 4 service statuses.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_IDENTITY = {
  hubspot_contact_id: '',
  duda_site_code: null,
  chatbot_slug: null,
  foursquare_venue_id: null,
}

const DEFAULT_SERVICE_STATUS = {
  status: 'not_started',
  provisioned_at: null,
  last_triggered_at: null,
  metadata: null,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const supabase = await createClient()

    // Query identity map
    const { data: identity, error: identityError } = await supabase
      .from('service_identity_map')
      .select('*')
      .eq('hubspot_contact_id', contactId)
      .maybeSingle()

    if (identityError) {
      console.error('[Onboarding Status] Identity query error:', identityError)
      return NextResponse.json(
        apiError('Failed to fetch identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    // Query all onboarding statuses for this contact
    const { data: statuses, error: statusError } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('hubspot_contact_id', contactId)

    if (statusError) {
      console.error('[Onboarding Status] Status query error:', statusError)
      return NextResponse.json(
        apiError('Failed to fetch onboarding statuses', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    // Build services map from status rows
    const serviceMap: Record<string, typeof DEFAULT_SERVICE_STATUS> = {
      chatbot: { ...DEFAULT_SERVICE_STATUS },
      blogs: { ...DEFAULT_SERVICE_STATUS },
      landing_pages: { ...DEFAULT_SERVICE_STATUS },
      foursquare: { ...DEFAULT_SERVICE_STATUS },
    }

    if (statuses) {
      for (const row of statuses) {
        if (row.service in serviceMap) {
          serviceMap[row.service] = {
            status: row.status,
            provisioned_at: row.provisioned_at,
            last_triggered_at: row.last_triggered_at,
            metadata: row.metadata,
          }
        }
      }
    }

    return NextResponse.json(
      apiSuccess({
        identity: identity || { ...DEFAULT_IDENTITY, hubspot_contact_id: contactId },
        services: serviceMap,
      })
    )
  } catch (error: unknown) {
    console.error('[Onboarding Status] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to fetch onboarding status: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
