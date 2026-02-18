// @ts-nocheck
'use client'

import { useState, useRef, useCallback } from 'react'
import { YStack, XStack, Text, Card, Button, Spinner, Separator } from 'tamagui'
import { FileText, AlertCircle, AlertTriangle, CheckCircle2, Play } from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingServiceStatus } from '@/app/types/onboarding'
import { invalidateOnboardingStatus } from '@/lib/cache/invalidate'

interface BlogsTabProps {
  contactId: string
  dudaSiteCode: string | null
  serviceStatus: OnboardingServiceStatus | undefined
  onRefresh: () => void
}

interface ProgressState {
  elapsed: number
  message: string
  numBlogs: number
}

export default function BlogsTab({ contactId, dudaSiteCode, serviceStatus, onRefresh }: BlogsTabProps) {
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [numBlogs, setNumBlogs] = useState(12)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)

  const status = serviceStatus?.status ?? 'not_started'
  const metadata = serviceStatus?.metadata ?? {}

  const handleGenerate = useCallback(async () => {
    if (!dudaSiteCode) return
    setGenerating(true)
    setProgress({ elapsed: 0, message: 'Starting...', numBlogs })

    try {
      const res = await fetch(`/api/onboarding/${contactId}/blogs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          industry,
          location,
          duda_site_code: dudaSiteCode,
          num_blogs: numBlogs,
        }),
      })

      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'progress') {
              setProgress(prev => ({ elapsed: event.elapsed, message: event.message, numBlogs: prev?.numBlogs ?? numBlogs }))
            } else if (event.type === 'started') {
              setProgress({ elapsed: 0, message: `Generating ${event.num_blogs} blogs...`, numBlogs: event.num_blogs })
            } else if (event.type === 'complete') {
              const count = event.blogs_generated ?? 0
              const sent = event.blogs_sent_to_duda ?? 0
              toast.success(`Generated ${count} blogs, ${sent} sent to Duda`)
              invalidateOnboardingStatus(contactId)
              onRefresh()
              streamDone = true
              break
            } else if (event.type === 'error') {
              toast.error(event.message || 'Blog generation failed')
              streamDone = true
              break
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }

      // Cancel the reader if we broke out early
      reader.cancel().catch(() => {})
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate blogs')
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }, [contactId, dudaSiteCode, businessName, industry, location, numBlogs, onRefresh])

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.15)',
    fontSize: 14,
    background: 'transparent',
    color: 'inherit',
    width: '100%',
  }

  return (
    <YStack gap="$6" maxWidth={800}>
      {/* Header */}
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(233,86,20,0.2)"
        padding="$5"
      >
        <XStack alignItems="center" gap="$3">
          <YStack
            width={56}
            height={56}
            borderRadius="$4"
            backgroundColor="rgba(233,86,20,0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(233,86,20,0.3)"
          >
            <FileText size={28} color="#E95614" strokeWidth={2} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$6" fontWeight="800" color="$color">SEO Blogs</Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              Generate SEO-optimized blog posts for the customer's website
            </Text>
          </YStack>
          {status === 'active' && (
            <XStack backgroundColor="rgba(16,185,129,0.1)" paddingHorizontal="$3" paddingVertical="$1.5" borderRadius="$3">
              <Text fontSize={12} fontWeight="700" color="#10B981" textTransform="uppercase">Active</Text>
            </XStack>
          )}
        </XStack>
      </Card>

      {/* No Duda site code warning */}
      {!dudaSiteCode && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(245,158,11,0.3)" padding="$6">
          <XStack gap={12} alignItems="center">
            <AlertTriangle size={24} color="#F59E0B" />
            <YStack flex={1}>
              <Text fontSize="$5" fontWeight="700" color="$color">Duda Site Code Required</Text>
              <Text fontSize="$4" color="$color" opacity={0.6}>
                Set the Duda site code in the Overview tab before generating blogs.
              </Text>
            </YStack>
          </XStack>
        </Card>
      )}

      {/* Live progress card */}
      {generating && progress && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(233,86,20,0.3)" padding="$6">
          <YStack alignItems="center" gap="$4">
            <Spinner size="large" color="#E95614" />
            <Text fontSize="$5" fontWeight="700" color="$color">
              Generating {progress.numBlogs} blogs...
            </Text>
            <Text fontSize="$4" color="$color" opacity={0.7}>
              {progress.elapsed}s elapsed
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.5}>
              {progress.message}
            </Text>
            <Text fontSize="$2" color="$color" opacity={0.4}>
              This may take several minutes. Do not close this tab.
            </Text>
          </YStack>
        </Card>
      )}

      {/* Ready to generate */}
      {dudaSiteCode && !generating && (status === 'not_started' || status === 'active') && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
          <YStack gap="$5">
            <Text fontSize="$5" fontWeight="700" color="$color">Generate Blogs</Text>

            {/* Stats from metadata */}
            {metadata.published_count != null && (
              <>
                <XStack gap={16}>
                  <YStack flex={1} gap="$1">
                    <Text fontSize={12} color="$color" opacity={0.5}>Published</Text>
                    <Text fontSize={20} fontWeight="800" color="#10B981">{metadata.published_count}</Text>
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <Text fontSize={12} color="$color" opacity={0.5}>Total Generated</Text>
                    <Text fontSize={20} fontWeight="800" color="$color">{metadata.total_count ?? '—'}</Text>
                  </YStack>
                </XStack>
                <Separator borderColor="$borderColor" />
              </>
            )}

            <YStack gap="$3">
              <YStack gap="$1">
                <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Business Name *</Text>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Plumbing"
                  style={inputStyle}
                />
              </YStack>
              <XStack gap={12}>
                <YStack flex={1} gap="$1">
                  <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Industry *</Text>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Plumbing, Accounting"
                    style={inputStyle}
                  />
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Location *</Text>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Denver, CO"
                    style={inputStyle}
                  />
                </YStack>
              </XStack>
              <YStack gap="$1">
                <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Number of Blogs</Text>
                <input
                  type="number"
                  value={numBlogs}
                  onChange={(e) => setNumBlogs(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  min={1}
                  max={50}
                  style={{ ...inputStyle, maxWidth: 120 }}
                />
              </YStack>
            </YStack>

            <Button
              size="$4"
              backgroundColor="#E95614"
              onPress={handleGenerate}
              disabled={!businessName || !industry || !location}
              icon={<Play size={16} color="white" />}
            >
              <Text color="white" fontWeight="700">Generate Blogs</Text>
            </Button>
          </YStack>
        </Card>
      )}

      {/* Pending state (from DB, not active generation) */}
      {!generating && status === 'pending' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="rgba(245,158,11,0.3)" padding="$6">
          <YStack alignItems="center" gap="$4">
            <Spinner size="large" color="#E95614" />
            <Text fontSize="$5" fontWeight="700" color="$color">Blog generation in progress...</Text>
            <Text fontSize="$4" color="$color" opacity={0.6}>
              {metadata.num_blogs ? `Generating ${metadata.num_blogs} blog posts` : 'This may take a few minutes'}
            </Text>
          </YStack>
        </Card>
      )}

      {/* Error state */}
      {!generating && status === 'error' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(239,68,68,0.3)" padding="$6">
          <YStack gap="$3" alignItems="center">
            <AlertCircle size={32} color="#EF4444" />
            <Text fontSize="$5" fontWeight="700" color="$color">Blog Generation Error</Text>
            <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center">
              {serviceStatus?.notes || 'An error occurred during blog generation'}
            </Text>
            <Button
              size="$4"
              backgroundColor="#E95614"
              marginTop="$2"
              onPress={handleGenerate}
              disabled={!dudaSiteCode}
            >
              <Text color="white" fontWeight="700">Retry</Text>
            </Button>
          </YStack>
        </Card>
      )}
    </YStack>
  )
}
