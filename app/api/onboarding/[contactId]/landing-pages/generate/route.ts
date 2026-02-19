/**
 * Landing Pages Generate API Route
 *
 * POST /api/onboarding/[contactId]/landing-pages/generate
 * Proxy to landing pages service to generate location pages.
 * Returns Server-Sent Events (SSE) stream with progress heartbeats.
 */

import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Vercel Pro max (5 min)

const SERVICE_TIMEOUT = 360_000 // 6 minutes
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

  const { duda_site_code, base_location, industry, collection_name, priority_locations } = body
  const num_pages = Math.max(1, Math.min(200, Number(body.num_pages) || 50))

  // Validate required fields
  for (const [field, value] of Object.entries({ duda_site_code, base_location, industry })) {
    if (!value || typeof value !== 'string') {
      return new Response(
        JSON.stringify({ error: `Missing or invalid "${field}" in request body` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Validate priority_locations if provided
  const priorityList: string[] = Array.isArray(priority_locations)
    ? priority_locations.filter((l): l is string => typeof l === 'string' && l.trim() !== '')
    : []

  if (priorityList.length > num_pages) {
    return new Response(
      JSON.stringify({ error: `priority_locations (${priorityList.length}) cannot exceed num_pages (${num_pages})` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const landingPagesUrl = process.env.LANDING_PAGES_URL
  if (!landingPagesUrl) {
    return new Response(
      JSON.stringify({ error: 'Landing pages service not configured' }),
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
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      const close = () => {
        if (closed) return
        closed = true
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }

      // Send initial event
      send({ type: 'started', num_pages, priority_locations: priorityList })

      // Start heartbeat
      heartbeatTimer = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        send({
          type: 'progress',
          elapsed,
          num_pages,
          message: 'Still working...',
        })
      }, HEARTBEAT_INTERVAL)

      // Build service payload
      const servicePayload: Record<string, unknown> = {
        site_code: duda_site_code,
        industry,
        base_location,
        num_pages,
      }
      if (collection_name) servicePayload.collection_name = collection_name
      if (priorityList.length > 0) servicePayload.priority_locations = priorityList

      // Call landing pages service
      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), SERVICE_TIMEOUT)

      try {
        const response = await fetch(`${landingPagesUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(servicePayload),
          signal: abortController.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          console.error(`[Landing Pages Generate] Service returned ${response.status}: ${errorText}`)

          const supabase = await createClient()
          await supabase.from('onboarding_status').upsert(
            {
              hubspot_contact_id: contactId,
              service: 'landing_pages',
              status: 'error',
              last_triggered_at: new Date().toISOString(),
              metadata: { num_pages, base_location, duda_site_code, industry, priority_locations: priorityList, error: `Service returned ${response.status}` },
            },
            { onConflict: 'hubspot_contact_id,service' }
          )

          send({ type: 'error', message: `Landing pages service returned ${response.status}` })
          close()
          return
        }

        const result = await response.json()

        // Upsert success status
        const supabase = await createClient()
        const { error: statusError } = await supabase.from('onboarding_status').upsert(
          {
            hubspot_contact_id: contactId,
            service: 'landing_pages',
            status: 'active',
            last_triggered_at: new Date().toISOString(),
            metadata: {
              num_pages,
              base_location,
              duda_site_code,
              industry,
              priority_locations: priorityList,
              pages_generated: result.pages_generated ?? result.num_pages,
              pages_sent_to_duda: result.pages_sent_to_duda,
            },
          },
          { onConflict: 'hubspot_contact_id,service' }
        )

        if (statusError) {
          console.warn('[Landing Pages Generate] Failed to update onboarding status:', statusError)
        }

        console.log(`[Landing Pages Generate] Completed ${num_pages} pages for site ${duda_site_code} (${industry})`)

        send({
          type: 'complete',
          result,
          pages_generated: result.pages_generated ?? result.num_pages,
          pages_sent_to_duda: result.pages_sent_to_duda,
        })
        close()
      } catch (fetchError: unknown) {
        clearTimeout(timeout)

        const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError'
        const errorMessage = isTimeout
          ? 'Landing pages service timed out'
          : fetchError instanceof Error
            ? fetchError.message
            : 'Unknown error'

        console.error('[Landing Pages Generate] Error:', errorMessage)

        try {
          const supabase = await createClient()
          await supabase.from('onboarding_status').upsert(
            {
              hubspot_contact_id: contactId,
              service: 'landing_pages',
              status: 'error',
              last_triggered_at: new Date().toISOString(),
              metadata: { num_pages, base_location, duda_site_code, industry, priority_locations: priorityList, error: errorMessage },
            },
            { onConflict: 'hubspot_contact_id,service' }
          )
        } catch (dbError) {
          console.error('[Landing Pages Generate] Failed to update error status:', dbError)
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
