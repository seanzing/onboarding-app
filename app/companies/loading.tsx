/**
 * Companies Page Loading Skeleton
 *
 * Shows instantly when navigating to /companies while data loads.
 * Matches the layout of the actual Companies page for smooth UX.
 */

'use client'

import { YStack, XStack, Card, Separator } from 'tamagui'
import { Database } from 'lucide-react'

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

// Table row skeleton
function TableRowSkeleton() {
  return (
    <>
      <XStack
        paddingHorizontal={20}
        paddingVertical={18}
        alignItems="center"
        width="100%"
      >
        {/* Company Name */}
        <YStack width="45%" minWidth={0} maxWidth="45%" gap="$1">
          <SkeletonBox width="70%" height={20} />
          <SkeletonBox width="40%" height={14} />
        </YStack>

        {/* Location */}
        <YStack width="30%" minWidth={0} maxWidth="30%" alignItems="center">
          <SkeletonBox width="60%" height={16} />
        </YStack>

        {/* Last Sync */}
        <YStack width="25%" minWidth={0} maxWidth="25%" alignItems="center">
          <SkeletonBox width="50%" height={16} />
        </YStack>
      </XStack>
      <Separator borderColor="$borderColor" />
    </>
  )
}

export default function CompaniesLoading() {
  return (
    <YStack
      width="100%"
      maxWidth="100%"
      gap="$6"
      padding="$6"
    >
      {/* Header Skeleton */}
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
          <YStack gap="$2" flex={1}>
            <XStack alignItems="center" gap="$3">
              <YStack
                width={52}
                height={52}
                borderRadius="$4"
                backgroundColor="rgba(59, 130, 246, 0.15)"
                alignItems="center"
                justifyContent="center"
              >
                <Database size={26} color="#3B82F6" opacity={0.5} />
              </YStack>
              <YStack>
                <SkeletonBox width={280} height={18} />
              </YStack>
            </XStack>
          </YStack>
          <SkeletonBox width={100} height={40} borderRadius={8} />
        </XStack>
      </YStack>

      {/* Search Bar Skeleton */}
      <SkeletonBox width={600} height={52} borderRadius={12} />

      {/* Pagination Info Skeleton */}
      <SkeletonBox width={200} height={16} />

      {/* Table Skeleton */}
      <Card
        bordered
        backgroundColor="$background"
        borderColor="rgba(59, 130, 246, 0.2)"
        borderWidth={1}
        borderRadius={12}
        padding={0}
        overflow="hidden"
        width="100%"
      >
        {/* Table Header */}
        <XStack
          paddingHorizontal={20}
          paddingVertical={16}
          backgroundColor="$backgroundStrong"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          width="100%"
          alignItems="center"
        >
          <YStack width="45%" alignItems="flex-start">
            <SkeletonBox width={80} height={14} />
          </YStack>
          <YStack width="30%" alignItems="center">
            <SkeletonBox width={70} height={14} />
          </YStack>
          <YStack width="25%" alignItems="center">
            <SkeletonBox width={65} height={14} />
          </YStack>
        </XStack>

        {/* Table Rows */}
        <YStack width="100%">
          {Array.from({ length: 10 }).map((_, idx) => (
            <TableRowSkeleton key={idx} />
          ))}
        </YStack>
      </Card>

      {/* Pagination Controls Skeleton */}
      <XStack justifyContent="center" alignItems="center" gap="$3" paddingVertical="$4">
        <SkeletonBox width={100} height={38} borderRadius={8} />
        <SkeletonBox width={120} height={20} />
        <SkeletonBox width={80} height={38} borderRadius={8} />
      </XStack>

      {/* Global pulse animation styles */}
      <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />
    </YStack>
  )
}
