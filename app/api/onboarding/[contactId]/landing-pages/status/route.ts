/**
 * Landing Pages Status API Route
 *
 * GET /api/onboarding/[contactId]/landing-pages/status
 * Read onboarding_status for the landing_pages service.
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

    const { data, error } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('hubspot_contact_id', contactId)
      .eq('service', 'landing_pages')
      .maybeSingle()

    if (error) {
      console.error('[Landing Pages Status] Query error:', error)
      return NextResponse.json(
        apiError('Failed to fetch landing pages status', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        apiSuccess({
          hubspot_contact_id: contactId,
          service: 'landing_pages',
          status: 'not_started',
          provisioned_at: null,
          last_triggered_at: null,
          metadata: null,
        })
      )
    }

    return NextResponse.json(apiSuccess(data))
  } catch (error: unknown) {
    console.error('[Landing Pages Status] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to fetch landing pages status: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
