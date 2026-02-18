// @ts-nocheck
'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, Spinner, Separator } from 'tamagui'
import { Globe, AlertCircle, AlertTriangle, Play } from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingServiceStatus } from '@/app/types/onboarding'
import { invalidateOnboardingStatus } from '@/lib/cache/invalidate'

interface LandingPagesTabProps {
  contactId: string
  dudaSiteCode: string | null
  serviceStatus: OnboardingServiceStatus | undefined
  onRefresh: () => void
}

export default function LandingPagesTab({ contactId, dudaSiteCode, serviceStatus, onRefresh }: LandingPagesTabProps) {
  const [numPages, setNumPages] = useState(50)
  const [baseLocation, setBaseLocation] = useState('')
  const [industry, setIndustry] = useState('')
  const [generating, setGenerating] = useState(false)

  const status = serviceStatus?.status ?? 'not_started'
  const metadata = serviceStatus?.metadata ?? {}

  const handleGenerate = async () => {
    if (!dudaSiteCode) return
    try {
      setGenerating(true)
      const res = await fetch(`/api/onboarding/${contactId}/landing-pages/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_pages: numPages,
          base_location: baseLocation,
          industry,
          duda_site_code: dudaSiteCode,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Landing page generation started (${numPages} pages)`)
      invalidateOnboardingStatus(contactId)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate landing pages')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <YStack gap="$6" maxWidth={800}>
      {/* Header */}
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(16,185,129,0.2)"
        padding="$5"
      >
        <XStack alignItems="center" gap="$3">
          <YStack
            width={56}
            height={56}
            borderRadius="$4"
            backgroundColor="rgba(16,185,129,0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(16,185,129,0.3)"
          >
            <Globe size={28} color="#10B981" strokeWidth={2} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$6" fontWeight="800" color="$color">Geo-Targeted Landing Pages</Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              Generate location-specific landing pages for local SEO
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
                Set the Duda site code in the Overview tab before generating landing pages.
              </Text>
            </YStack>
          </XStack>
        </Card>
      )}

      {/* Ready to generate */}
      {dudaSiteCode && (status === 'not_started' || status === 'active') && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
          <YStack gap="$5">
            <Text fontSize="$5" fontWeight="700" color="$color">Generate Landing Pages</Text>

            {/* Stats from metadata */}
            {metadata.generated_count != null && (
              <>
                <XStack gap={16}>
                  <YStack flex={1} gap="$1">
                    <Text fontSize={12} color="$color" opacity={0.5}>Pages Generated</Text>
                    <Text fontSize={20} fontWeight="800" color="#10B981">{metadata.generated_count}</Text>
                  </YStack>
                </XStack>
                <Separator borderColor="$borderColor" />
              </>
            )}

            <YStack gap="$3">
              <XStack gap={12}>
                <YStack flex={1} gap="$1">
                  <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Industry *</Text>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Plumbing, Accounting, Dog Training"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.15)',
                      fontSize: 14,
                      background: 'transparent',
                      color: 'inherit',
                      width: '100%',
                    }}
                  />
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Base Location *</Text>
                  <input
                    type="text"
                    value={baseLocation}
                    onChange={(e) => setBaseLocation(e.target.value)}
                    placeholder="e.g. Denver, CO"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.15)',
                      fontSize: 14,
                      background: 'transparent',
                      color: 'inherit',
                      width: '100%',
                    }}
                  />
                </YStack>
              </XStack>
              <YStack gap="$1">
                <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Number of Pages</Text>
                <input
                  type="number"
                  value={numPages}
                  onChange={(e) => setNumPages(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={200}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.15)',
                    fontSize: 14,
                    background: 'transparent',
                    color: 'inherit',
                    width: '100%',
                    maxWidth: 200,
                  }}
                />
              </YStack>
            </YStack>

            <Button
              size="$4"
              backgroundColor="#10B981"
              onPress={handleGenerate}
              disabled={generating || !industry || !baseLocation}
              icon={generating ? <Spinner size="small" color="white" /> : <Play size={16} color="white" />}
            >
              <Text color="white" fontWeight="700">
                {generating ? 'Generating...' : `Generate ${numPages} Landing Pages`}
              </Text>
            </Button>
          </YStack>
        </Card>
      )}

      {/* Pending state */}
      {status === 'pending' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="rgba(245,158,11,0.3)" padding="$6">
          <YStack alignItems="center" gap="$4">
            <Spinner size="large" color="#10B981" />
            <Text fontSize="$5" fontWeight="700" color="$color">Generation in progress...</Text>
            <Text fontSize="$4" color="$color" opacity={0.6}>
              {metadata.num_pages ? `Generating ${metadata.num_pages} landing pages` : 'This may take a few minutes'}
            </Text>
          </YStack>
        </Card>
      )}

      {/* Error state */}
      {status === 'error' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(239,68,68,0.3)" padding="$6">
          <YStack gap="$3" alignItems="center">
            <AlertCircle size={32} color="#EF4444" />
            <Text fontSize="$5" fontWeight="700" color="$color">Landing Page Generation Error</Text>
            <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center">
              {serviceStatus?.notes || 'An error occurred during landing page generation'}
            </Text>
            <Button
              size="$4"
              backgroundColor="#10B981"
              marginTop="$2"
              onPress={handleGenerate}
              disabled={generating || !dudaSiteCode}
            >
              <Text color="white" fontWeight="700">Retry</Text>
            </Button>
          </YStack>
        </Card>
      )}
    </YStack>
  )
}
