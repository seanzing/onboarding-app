// @ts-nocheck
'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, Spinner, Separator } from 'tamagui'
import { MapPin, AlertCircle, CheckCircle2, Send, Download, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingServiceStatus } from '@/app/types/onboarding'
import { invalidateOnboardingStatus } from '@/lib/cache/invalidate'

interface FoursquareTabProps {
  contactId: string
  foursquareVenueId: string | null
  company: any
  serviceStatus: OnboardingServiceStatus | undefined
  onRefresh: () => void
}

export default function FoursquareTab({ contactId, foursquareVenueId, company, serviceStatus, onRefresh }: FoursquareTabProps) {
  const [submitting, setSubmitting] = useState(false)

  const status = serviceStatus?.status ?? 'not_started'
  const metadata = serviceStatus?.metadata ?? {}
  const props = company.properties

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/onboarding/${contactId}/foursquare/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: props.company || `${props.firstname} ${props.lastname}`,
          address: props.address || '',
          city: props.city || '',
          state: props.state || '',
          zip: props.zip || '',
          phone: props.phone || '',
          website: props.website || '',
          categories: [],
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(data.data?.venue_id ? 'Venue submitted to Foursquare' : 'Venue data saved for manual submission')
      invalidateOnboardingStatus(contactId)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit to Foursquare')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadExport = () => {
    const exportData = {
      name: props.company || `${props.firstname} ${props.lastname}`,
      address: props.address || '',
      city: props.city || '',
      state: props.state || '',
      zip: props.zip || '',
      phone: props.phone || '',
      website: props.website || '',
      email: props.email || '',
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `foursquare-export-${contactId}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export downloaded')
  }

  return (
    <YStack gap="$6" maxWidth={800}>
      {/* Header */}
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(168,85,247,0.2)"
        padding="$5"
      >
        <XStack alignItems="center" gap="$3">
          <YStack
            width={56}
            height={56}
            borderRadius="$4"
            backgroundColor="rgba(168,85,247,0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(168,85,247,0.3)"
          >
            <MapPin size={28} color="#A855F7" strokeWidth={2} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$6" fontWeight="800" color="$color">Foursquare Directory Listing</Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              Submit business listing to Foursquare for local discovery
            </Text>
          </YStack>
          {status === 'active' && (
            <XStack backgroundColor="rgba(16,185,129,0.1)" paddingHorizontal="$3" paddingVertical="$1.5" borderRadius="$3">
              <Text fontSize={12} fontWeight="700" color="#10B981" textTransform="uppercase">Active</Text>
            </XStack>
          )}
        </XStack>
      </Card>

      {/* No venue ID — show business data + submit */}
      {!foursquareVenueId && (status === 'not_started' || status === 'error') && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
          <YStack gap="$5">
            <Text fontSize="$5" fontWeight="700" color="$color">Business Data for Submission</Text>

            <YStack gap="$3">
              {[
                { label: 'Business Name', value: props.company || `${props.firstname || ''} ${props.lastname || ''}`.trim() },
                { label: 'Address', value: props.address },
                { label: 'City', value: props.city },
                { label: 'State', value: props.state },
                { label: 'ZIP', value: props.zip },
                { label: 'Phone', value: props.phone },
                { label: 'Website', value: props.website },
              ].map(({ label, value }) => (
                <XStack key={label} gap={12}>
                  <Text fontSize={13} color="$color" opacity={0.5} fontWeight="500" width={120}>{label}</Text>
                  <Text fontSize={13} color="$color" fontWeight="500" flex={1}>{value || '—'}</Text>
                </XStack>
              ))}
            </YStack>

            <Separator borderColor="$borderColor" />

            <XStack gap={12}>
              <Button
                flex={1}
                size="$4"
                backgroundColor="#A855F7"
                onPress={handleSubmit}
                disabled={submitting}
                icon={submitting ? <Spinner size="small" color="white" /> : <Send size={16} color="white" />}
              >
                <Text color="white" fontWeight="700">
                  {submitting ? 'Submitting...' : 'Submit to Foursquare'}
                </Text>
              </Button>
              <Button
                size="$4"
                backgroundColor="$background"
                borderWidth={1}
                borderColor="rgba(168,85,247,0.3)"
                onPress={handleDownloadExport}
                icon={<Download size={16} color="#A855F7" />}
              >
                <Text color="#A855F7" fontWeight="700">Export</Text>
              </Button>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Pending state */}
      {status === 'pending' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="rgba(245,158,11,0.3)" padding="$6">
          <YStack alignItems="center" gap="$4">
            <Spinner size="large" color="#A855F7" />
            <Text fontSize="$5" fontWeight="700" color="$color">Submission in progress...</Text>
            <Text fontSize="$4" color="$color" opacity={0.6}>
              {metadata.manual_export ? 'Data saved — awaiting manual submission to Foursquare' : 'Processing Foursquare submission'}
            </Text>
          </YStack>
        </Card>
      )}

      {/* Active state — venue created */}
      {foursquareVenueId && status === 'active' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(16,185,129,0.3)" padding="$6">
          <YStack gap="$4">
            <XStack gap={12} alignItems="center">
              <CheckCircle2 size={24} color="#10B981" />
              <Text fontSize="$5" fontWeight="700" color="$color">Venue Listed on Foursquare</Text>
            </XStack>
            <Separator borderColor="$borderColor" />
            <YStack gap="$2">
              <Text fontSize={12} color="$color" opacity={0.5}>Venue ID</Text>
              <Text fontSize={14} color="$color" fontWeight="600" fontFamily="$mono">{foursquareVenueId}</Text>
            </YStack>
            <Button
              size="$3"
              backgroundColor="$background"
              borderWidth={1}
              borderColor="rgba(168,85,247,0.3)"
              onPress={() => {
                window.open(`https://foursquare.com/v/${foursquareVenueId}`, '_blank')
              }}
              icon={<ExternalLink size={14} color="#A855F7" />}
            >
              <Text color="#A855F7" fontWeight="600" fontSize={13}>View on Foursquare</Text>
            </Button>
          </YStack>
        </Card>
      )}

      {/* Error with notes */}
      {status === 'error' && serviceStatus?.notes && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(239,68,68,0.3)" padding="$6">
          <XStack gap={12} alignItems="center">
            <AlertCircle size={20} color="#EF4444" />
            <Text fontSize="$4" color="$color" opacity={0.7} flex={1}>{serviceStatus.notes}</Text>
          </XStack>
        </Card>
      )}
    </YStack>
  )
}
