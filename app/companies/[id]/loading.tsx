/**
 * Company Detail Page Loading Skeleton
 *
 * Shows instantly when navigating to /companies/[id] while data loads.
 * Matches the two-column layout of the company detail page.
 */

'use client'

import { YStack, XStack, Card, Separator } from 'tamagui'

// Add keyframes for pulse animation
const pulseKeyframes = `
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
`

// Skeleton box with pulse animation
function SkeletonBox({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | string
  height: number
  borderRadius?: number
}) {
  return (
    <YStack
      width={width as number}
      height={height}
      borderRadius={borderRadius}
      backgroundColor="rgba(59, 130, 246, 0.15)"
      opacity={0.6}
      // @ts-ignore - web animation
      style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
    />
  )
}

export default function CompanyDetailLoading() {
  return (
    <YStack
      width="100%"
      maxWidth="100%"
      gap="$6"
      padding="$6"
    >
      {/* Breadcrumb Skeleton */}
      <XStack gap={8} alignItems="center">
        <SkeletonBox width={80} height={14} />
        <SkeletonBox width={8} height={14} />
        <SkeletonBox width={150} height={14} />
      </XStack>

      {/* Page Header Skeleton */}
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$2" flex={1}>
            <SkeletonBox width="40%" height={32} />
            <SkeletonBox width="25%" height={16} />
          </YStack>
          <XStack gap={8}>
            <SkeletonBox width={140} height={36} borderRadius={8} />
            <SkeletonBox width={90} height={36} borderRadius={8} />
          </XStack>
        </XStack>
      </YStack>

      {/* Main Content - Two Columns */}
      <XStack gap={24} alignItems="flex-start">
        {/* Left Column - Company Information */}
        <YStack flex={2} gap="$6">
          <Card
            bordered
            backgroundColor="$background"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={12}
            padding="$6"
          >
            <YStack gap="$6">
              {/* Header */}
              <SkeletonBox width={180} height={22} />

              {/* Contact Information Section */}
              <YStack gap="$4">
                <SkeletonBox width={150} height={12} />
                <YStack gap="$3">
                  {/* Phone */}
                  <XStack gap={12} alignItems="center">
                    <SkeletonBox width={32} height={32} borderRadius={16} />
                    <YStack flex={1} gap="$1">
                      <SkeletonBox width={50} height={12} />
                      <SkeletonBox width={140} height={16} />
                    </YStack>
                  </XStack>

                  {/* Website */}
                  <XStack gap={12} alignItems="center">
                    <SkeletonBox width={32} height={32} borderRadius={16} />
                    <YStack flex={1} gap="$1">
                      <SkeletonBox width={60} height={12} />
                      <SkeletonBox width={200} height={16} />
                    </YStack>
                  </XStack>
                </YStack>
              </YStack>

              <Separator borderColor="$borderColor" />

              {/* Address Section */}
              <YStack gap="$4">
                <SkeletonBox width={80} height={12} />
                <XStack gap={12} alignItems="flex-start">
                  <SkeletonBox width={32} height={32} borderRadius={16} />
                  <YStack flex={1} gap="$1">
                    <SkeletonBox width={60} height={12} />
                    <SkeletonBox width={180} height={16} />
                    <SkeletonBox width={150} height={16} />
                  </YStack>
                </XStack>
              </YStack>
            </YStack>
          </Card>
        </YStack>

        {/* Right Column - GBP Connection & Details */}
        <YStack flex={1} gap="$6" minWidth={280}>
          {/* GBP Connection Card */}
          <Card
            bordered
            backgroundColor="$background"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={12}
            padding="$6"
          >
            <YStack gap="$5">
              <SkeletonBox width={200} height={22} />
              <YStack alignItems="center" paddingVertical="$4">
                <SkeletonBox width={24} height={24} borderRadius={12} />
                <SkeletonBox width={120} height={12} />
              </YStack>
            </YStack>
          </Card>

          {/* Details Card */}
          <Card
            bordered
            backgroundColor="$background"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={12}
            padding="$6"
          >
            <YStack gap="$5">
              <SkeletonBox width={80} height={22} />
              <YStack gap="$4">
                <YStack gap="$1">
                  <SkeletonBox width={60} height={12} />
                  <SkeletonBox width={100} height={14} />
                </YStack>
                <Separator borderColor="$borderColor" />
                <YStack gap="$1">
                  <SkeletonBox width={90} height={12} />
                  <SkeletonBox width={100} height={14} />
                </YStack>
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </XStack>

      {/* Global pulse animation styles */}
      <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />
    </YStack>
  )
}
