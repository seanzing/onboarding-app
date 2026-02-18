// @ts-nocheck
'use client'

import { XStack, YStack, Text, Stack } from 'tamagui'
import { Bot, FileText, Globe, MapPin } from 'lucide-react'
import type { CustomerOnboarding, ServiceType, ServiceStatus } from '@/app/types/onboarding'
import { SERVICE_LABELS, STATUS_LABELS, STATUS_COLORS, SERVICE_COLORS } from '@/app/types/onboarding'

interface OnboardingStatusBarProps {
  onboarding: CustomerOnboarding | null
  loading?: boolean
}

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  foursquare: <MapPin size={16} strokeWidth={2} />,
  chatbot: <Bot size={16} strokeWidth={2} />,
  blogs: <FileText size={16} strokeWidth={2} />,
  landing_pages: <Globe size={16} strokeWidth={2} />,
}

const SERVICES: ServiceType[] = ['foursquare', 'chatbot', 'blogs', 'landing_pages']

export default function OnboardingStatusBar({ onboarding, loading }: OnboardingStatusBarProps) {
  if (loading) return null

  return (
    <XStack gap={12} flexWrap="wrap">
      {SERVICES.map((service) => {
        const status: ServiceStatus = onboarding?.services?.[service]?.status ?? 'not_started'
        const color = STATUS_COLORS[status]
        const bgColor = `${color}15`

        return (
          <XStack
            key={service}
            backgroundColor={bgColor}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$3"
            alignItems="center"
            gap={8}
            borderWidth={1}
            borderColor={`${color}30`}
          >
            <Stack style={{ color: SERVICE_COLORS[service] }}>
              {SERVICE_ICONS[service]}
            </Stack>
            <Text fontSize={12} fontWeight="600" color="$color">
              {SERVICE_LABELS[service]}
            </Text>
            <XStack
              backgroundColor={`${color}20`}
              paddingHorizontal="$1.5"
              paddingVertical="$0.5"
              borderRadius="$2"
            >
              <Text fontSize={10} fontWeight="700" color={color} textTransform="uppercase">
                {STATUS_LABELS[status]}
              </Text>
            </XStack>
          </XStack>
        )
      })}
    </XStack>
  )
}
