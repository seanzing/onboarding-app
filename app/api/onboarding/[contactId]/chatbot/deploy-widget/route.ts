/**
 * Chatbot Deploy Widget API Route
 *
 * POST /api/onboarding/[contactId]/chatbot/deploy-widget
 * Create a Duda snippet with the chatbot widget and publish the site.
 *
 * DELETE /api/onboarding/[contactId]/chatbot/deploy-widget
 * Remove the widget snippet from Duda and republish.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/app/types/api'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDudaAuth(): string | null {
  const user = process.env.DUDA_API_USER
  const pass = process.env.DUDA_API_PASSWORD
  if (!user || !pass) return null
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

async function publishDudaSite(siteCode: string, auth: string): Promise<boolean> {
  const res = await fetch(
    `https://api.duda.co/api/sites/multiscreen/publish/${siteCode}`,
    {
      method: 'POST',
      headers: { Authorization: auth },
    }
  )
  return res.ok
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const supabase = await createClient()

    // Look up chatbot slug and duda site code from identity map
    const { data: identity, error: identityError } = await supabase
      .from('service_identity_map')
      .select('chatbot_slug, duda_site_code, duda_snippet_id')
      .eq('hubspot_contact_id', contactId)
      .maybeSingle()

    if (identityError) {
      console.error('[Deploy Widget] Identity query error:', identityError)
      return NextResponse.json(
        apiError('Failed to fetch identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    const slug = identity?.chatbot_slug
    const siteCode = identity?.duda_site_code

    if (!slug) {
      return NextResponse.json(
        apiError('No chatbot slug configured for this contact', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (!siteCode) {
      return NextResponse.json(
        apiError('No Duda site code configured for this contact', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (identity?.duda_snippet_id) {
      return NextResponse.json(
        apiError('Widget snippet already deployed', 'CONFLICT'),
        { status: 409 }
      )
    }

    const auth = getDudaAuth()
    if (!auth) {
      return NextResponse.json(
        apiError('Duda API credentials not configured', 'SERVICE_UNAVAILABLE'),
        { status: 503 }
      )
    }

    // Build widget markup
    const markup = `<script>window.ZING_WIDGET_CONFIG={client:'${slug}'};</script>\n<script src="https://zing-chatbot-multi-tenancy.vercel.app/widget.js" async></script>`

    // Create snippet on Duda
    const snippetRes = await fetch(
      `https://api.duda.co/api/sites/multiscreen/${siteCode}/snippets`,
      {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markup,
          location: 'BODY',
        }),
      }
    )

    if (!snippetRes.ok) {
      const errText = await snippetRes.text()
      console.error(`[Deploy Widget] Duda snippet creation failed (${snippetRes.status}):`, errText)
      return NextResponse.json(
        apiError(`Duda API returned ${snippetRes.status}: ${errText}`, 'EXTERNAL_API_ERROR'),
        { status: 502 }
      )
    }

    const snippetData = await snippetRes.json()
    const snippetId = snippetData.uuid || snippetData.id

    if (!snippetId) {
      console.error('[Deploy Widget] No snippet ID in response:', snippetData)
      return NextResponse.json(
        apiError('Duda did not return a snippet ID', 'EXTERNAL_API_ERROR'),
        { status: 502 }
      )
    }

    // Publish the site
    const published = await publishDudaSite(siteCode, auth)
    if (!published) {
      console.warn(`[Deploy Widget] Site publish failed for ${siteCode}, snippet was still created`)
    }

    // Store snippet_id in identity map
    const { error: updateError } = await supabase
      .from('service_identity_map')
      .update({ duda_snippet_id: snippetId })
      .eq('hubspot_contact_id', contactId)

    if (updateError) {
      console.warn('[Deploy Widget] Failed to store snippet_id:', updateError)
    }

    console.log(`[Deploy Widget] Deployed widget for "${slug}" on site ${siteCode}, snippet ${snippetId}`)

    return NextResponse.json(
      apiSuccess({ slug, site_code: siteCode, snippet_id: snippetId, published })
    )
  } catch (error: unknown) {
    console.error('[Deploy Widget] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to deploy widget: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  try {
    const supabase = await createClient()

    // Look up snippet ID and site code
    const { data: identity, error: identityError } = await supabase
      .from('service_identity_map')
      .select('duda_site_code, duda_snippet_id')
      .eq('hubspot_contact_id', contactId)
      .maybeSingle()

    if (identityError) {
      console.error('[Remove Widget] Identity query error:', identityError)
      return NextResponse.json(
        apiError('Failed to fetch identity map', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    const siteCode = identity?.duda_site_code
    const snippetId = identity?.duda_snippet_id

    if (!snippetId) {
      return NextResponse.json(
        apiError('No widget snippet deployed for this contact', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    if (!siteCode) {
      return NextResponse.json(
        apiError('No Duda site code configured for this contact', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    const auth = getDudaAuth()
    if (!auth) {
      return NextResponse.json(
        apiError('Duda API credentials not configured', 'SERVICE_UNAVAILABLE'),
        { status: 503 }
      )
    }

    // Delete snippet from Duda
    const deleteRes = await fetch(
      `https://api.duda.co/api/sites/multiscreen/${siteCode}/snippets/${snippetId}`,
      {
        method: 'DELETE',
        headers: { Authorization: auth },
      }
    )

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const errText = await deleteRes.text()
      console.error(`[Remove Widget] Duda snippet deletion failed (${deleteRes.status}):`, errText)
      return NextResponse.json(
        apiError(`Duda API returned ${deleteRes.status}: ${errText}`, 'EXTERNAL_API_ERROR'),
        { status: 502 }
      )
    }

    // Publish the site
    const published = await publishDudaSite(siteCode, auth)
    if (!published) {
      console.warn(`[Remove Widget] Site publish failed for ${siteCode}`)
    }

    // Clear snippet_id from identity map
    const { error: updateError } = await supabase
      .from('service_identity_map')
      .update({ duda_snippet_id: null })
      .eq('hubspot_contact_id', contactId)

    if (updateError) {
      console.warn('[Remove Widget] Failed to clear snippet_id:', updateError)
    }

    console.log(`[Remove Widget] Removed widget snippet ${snippetId} from site ${siteCode}`)

    return NextResponse.json(
      apiSuccess({ site_code: siteCode, snippet_id: snippetId, removed: true, published })
    )
  } catch (error: unknown) {
    console.error('[Remove Widget] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      apiError(`Failed to remove widget: ${message}`, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
