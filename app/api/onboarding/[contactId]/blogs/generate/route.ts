/**
 * Blog Generate API Route
 *
 * POST /api/onboarding/[contactId]/blogs/generate
 * Proxy to blog service to generate blogs for a contact's site.
 * Returns Server-Sent Events (SSE) stream with progress heartbeats.
 */

import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Vercel Pro max (5 min)

const BLOG_SERVICE_TIMEOUT = 360_000 // 6 minutes
const HEARTBEAT_INTERVAL = 5_000 // 5 seconds

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { contactId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { duda_site_code, business_name, industry, location, num_blogs } = body

  // Validate required fields
  for (const [field, value] of Object.entries({ duda_site_code, business_name, industry, location })) {
    if (!value || typeof value !== 'string') {
      return new Response(
        JSON.stringify({ error: `Missing or invalid "${field}" in request body` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const numBlogsInt = Math.max(1, Math.min(50, Number(num_blogs) || 12))

  const blogServiceUrl = process.env.BLOG_SERVICE_URL
  if (!blogServiceUrl) {
    return new Response(
      JSON.stringify({ error: 'Blog service URL not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null
      let closed = false
      const startTime = Date.now()

      const send = (data: Record<string, unknown>) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const close = () => {
        if (closed) return
        closed = true
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        controller.close()
      }

      // Send initial event
      send({ type: 'started', num_blogs: numBlogsInt })

      // Start heartbeat
      heartbeatTimer = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        send({
          type: 'progress',
          elapsed,
          num_blogs: numBlogsInt,
          message: `Still working...`,
        })
      }, HEARTBEAT_INTERVAL)

      // Call blog service
      const controller2 = new AbortController()
      const timeout = setTimeout(() => controller2.abort(), BLOG_SERVICE_TIMEOUT)

      try {
        const response = await fetch(`${blogServiceUrl}/generate/direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name,
            industry,
            location,
            duda_site_code,
            num_blogs: numBlogsInt,
          }),
          signal: controller2.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          console.error(`[Blogs Generate] Blog service returned ${response.status}: ${errorText}`)

          // Upsert error status
          const supabase = await createClient()
          await supabase.from('onboarding_status').upsert(
            {
              hubspot_contact_id: contactId,
              service: 'blogs',
              status: 'error',
              last_triggered_at: new Date().toISOString(),
              metadata: { business_name, industry, location, duda_site_code, num_blogs: numBlogsInt, error: `Blog service returned ${response.status}` },
            },
            { onConflict: 'hubspot_contact_id,service' }
          )

          send({ type: 'error', message: `Blog service returned ${response.status}` })
          close()
          return
        }

        const result = await response.json()

        // Upsert success status
        const supabase = await createClient()
        const { error: statusError } = await supabase.from('onboarding_status').upsert(
          {
            hubspot_contact_id: contactId,
            service: 'blogs',
            status: 'active',
            last_triggered_at: new Date().toISOString(),
            metadata: {
              business_name,
              industry,
              location,
              duda_site_code,
              num_blogs: numBlogsInt,
              blogs_generated: result.blogs_generated,
              blogs_sent_to_duda: result.blogs_sent_to_duda,
            },
          },
          { onConflict: 'hubspot_contact_id,service' }
        )

        if (statusError) {
          console.warn('[Blogs Generate] Failed to update onboarding status:', statusError)
        }

        console.log(`[Blogs Generate] Completed blogs for ${business_name} (${industry}) at ${location}: ${result.blogs_generated} generated`)

        send({
          type: 'complete',
          result,
          blogs_generated: result.blogs_generated,
          blogs_sent_to_duda: result.blogs_sent_to_duda,
        })
        close()
      } catch (fetchError: unknown) {
        clearTimeout(timeout)

        const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError'
        const errorMessage = isTimeout
          ? 'Blog service timed out'
          : fetchError instanceof Error
            ? fetchError.message
            : 'Unknown error'

        console.error('[Blogs Generate] Error:', errorMessage)

        // Upsert error status
        try {
          const supabase = await createClient()
          await supabase.from('onboarding_status').upsert(
            {
              hubspot_contact_id: contactId,
              service: 'blogs',
              status: 'error',
              last_triggered_at: new Date().toISOString(),
              metadata: { business_name, industry, location, duda_site_code, num_blogs: numBlogsInt, error: errorMessage },
            },
            { onConflict: 'hubspot_contact_id,service' }
          )
        } catch (dbError) {
          console.error('[Blogs Generate] Failed to update error status:', dbError)
        }

        send({ type: 'error', message: errorMessage })
        close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
