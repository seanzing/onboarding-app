/**
 * Company Edit Page Loading Skeleton
 *
 * Shows instantly when navigating to /companies/[id]/edit while data loads.
 * Matches the PropertyEditor layout with 4 sections.
 */

'use client'

import { YStack, XStack, Card, Separator } from 'tamagui'
import { Building2, MapPin, Share2, Settings } from 'lucide-react'

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

// Field skeleton for form inputs
function FieldSkeleton() {
  return (
    <YStack gap="$2">
      <SkeletonBox width={120} height={14} />
      <SkeletonBox width="100%" height={44} borderRadius={8} />
    </YStack>
  )
}

// Section card skeleton
function SectionSkeleton({
  icon: Icon,
  title,
  fieldCount = 3,
}: {
  icon: React.ComponentType<{ size: number; color: string; opacity?: number }>
  title: string
  fieldCount?: number
}) {
  return (
    <Card
      bordered
      backgroundColor="$background"
      borderColor="rgba(59, 130, 246, 0.2)"
      borderWidth={1}
      borderRadius={12}
      padding="$5"
    >
      <YStack gap="$5">
        {/* Section Header */}
        <XStack alignItems="center" gap="$3">
          <YStack
            width={40}
            height={40}
            borderRadius={8}
            backgroundColor="rgba(59, 130, 246, 0.1)"
            alignItems="center"
            justifyContent="center"
          >
            <Icon size={20} color="#3B82F6" opacity={0.5} />
          </YStack>
          <SkeletonBox width={150} height={20} />
        </XStack>

        <Separator borderColor="$borderColor" />

        {/* Form Fields */}
        <YStack gap="$4">
          {Array.from({ length: fieldCount }).map((_, idx) => (
            <FieldSkeleton key={idx} />
          ))}
        </YStack>
      </YStack>
    </Card>
  )
}

export default function CompanyEditLoading() {
  return (
    // @ts-ignore - minHeight accepts viewport units
    <YStack minHeight="100vh" backgroundColor="$background">
      <YStack
        maxWidth={1280}
        width="100%"
        marginHorizontal="auto"
        padding="$4"
      >
        {/* Back button skeleton */}
        <YStack marginBottom="$5">
          <SkeletonBox width={100} height={36} borderRadius={8} />
        </YStack>

        {/* Header Skeleton */}
        <YStack gap="$3" marginBottom="$6">
          <SkeletonBox width="50%" height={32} />
          <SkeletonBox width="30%" height={16} />
        </YStack>

        {/* Form Sections */}
        <YStack gap="$6">
          {/* Business Information Section */}
          <SectionSkeleton icon={Building2} title="Business Information" fieldCount={5} />

          {/* Location Section */}
          <SectionSkeleton icon={MapPin} title="Location" fieldCount={5} />

          {/* Social Media Section */}
          <SectionSkeleton icon={Share2} title="Social Media" fieldCount={3} />

          {/* Directory Settings Section */}
          <SectionSkeleton icon={Settings} title="Directory Settings" fieldCount={3} />

          {/* Action Buttons Skeleton */}
          <XStack gap="$4" justifyContent="flex-end" paddingTop="$4">
            <SkeletonBox width={100} height={44} borderRadius={8} />
            <SkeletonBox width={140} height={44} borderRadius={8} />
          </XStack>
        </YStack>
      </YStack>

      {/* Global pulse animation styles */}
      <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />
    </YStack>
  )
}
