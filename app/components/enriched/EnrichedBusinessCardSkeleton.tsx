/**
 * EnrichedBusinessCardSkeleton Component
 *
 * Skeleton loading placeholder for EnrichedBusinessCard
 * Provides visual feedback while data is being loaded
 */

'use client';

import { Card, YStack, XStack } from 'tamagui';

const TEAL_COLOR = '#14B8A6';
const TEAL_LIGHT = 'rgba(20, 184, 166, 0.1)';
const TEAL_BORDER = 'rgba(20, 184, 166, 0.3)';

function SkeletonBox({
  width,
  height,
  borderRadius = '$2',
}: {
  width: number | string;
  height: number;
  borderRadius?: '$1' | '$2' | '$3' | '$4';
}) {
  return (
    <YStack
      width={width as number}
      height={height}
      borderRadius={borderRadius as '$2'}
      backgroundColor="rgba(20, 184, 166, 0.15)"
      animation="slow"
      animateOnly={['opacity']}
      opacity={0.5}
      $platform-web={{
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

export function EnrichedBusinessCardSkeleton() {
  return (
    <Card
      size="$4"
      bordered
      padding="$5"
      backgroundColor={TEAL_LIGHT}
      borderColor={TEAL_BORDER}
      borderLeftWidth={5}
      borderLeftColor={TEAL_COLOR}
      $sm={{ padding: '$4' }}
    >
      <YStack gap="$4">
        {/* Header Section */}
        <XStack gap="$5" flexWrap="wrap" $sm={{ gap: '$4' }}>
          {/* Logo Skeleton */}
          <SkeletonBox width={120} height={120} borderRadius="$4" />

          {/* Business Info Skeleton */}
          <YStack flex={1} gap="$3" minWidth={250}>
            {/* Business Name */}
            <YStack gap="$2">
              <SkeletonBox width="60%" height={32} />
              <SkeletonBox width="35%" height={20} />
            </YStack>

            {/* Categories */}
            <XStack gap="$2">
              <SkeletonBox width={80} height={28} borderRadius="$2" />
              <SkeletonBox width={100} height={28} borderRadius="$2" />
            </XStack>

            {/* Contact Info */}
            <YStack gap="$2">
              <XStack gap="$2" alignItems="center">
                <SkeletonBox width={16} height={16} borderRadius="$1" />
                <SkeletonBox width="40%" height={18} />
              </XStack>
              <XStack gap="$2" alignItems="center">
                <SkeletonBox width={16} height={16} borderRadius="$1" />
                <SkeletonBox width="50%" height={18} />
              </XStack>
            </YStack>
          </YStack>

          {/* Open Status Badge */}
          <YStack alignItems="flex-end">
            <SkeletonBox width={100} height={36} borderRadius="$3" />
          </YStack>
        </XStack>

        {/* Description Skeleton */}
        <YStack gap="$1.5">
          <SkeletonBox width="100%" height={14} />
          <SkeletonBox width="90%" height={14} />
          <SkeletonBox width="75%" height={14} />
        </YStack>

        {/* Expand Button Skeleton */}
        <SkeletonBox width={180} height={40} borderRadius="$3" />
      </YStack>
    </Card>
  );
}

/**
 * Multiple skeleton cards for grid loading state
 */
export function EnrichedBusinessCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <EnrichedBusinessCardSkeleton key={idx} />
      ))}
    </>
  );
}
