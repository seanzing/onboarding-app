/**
 * HubSpot Analytics Loading Skeleton
 *
 * Shows instantly when navigating to /hubspot/analytics while data loads.
 * Matches the analytics dashboard layout with charts and stats.
 */

'use client';

import { YStack, XStack, Card } from 'tamagui';
import { TrendingUp } from 'lucide-react';
import {
  PageLoadingSkeleton,
  PageHeaderSkeleton,
  SkeletonBox,
  CardSkeleton,
} from '@/app/components/skeletons/PageSkeleton';

// Stat card skeleton
function StatCardSkeleton() {
  return (
    <Card
      bordered
      backgroundColor="$background"
      borderColor="rgba(59, 130, 246, 0.2)"
      borderWidth={1}
      borderRadius={12}
      padding="$4"
      flex={1}
      minWidth={180}
    >
      <YStack gap="$2">
        <SkeletonBox width={100} height={14} />
        <SkeletonBox width={80} height={36} />
        <SkeletonBox width={60} height={12} />
      </YStack>
    </Card>
  );
}

// Chart skeleton
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card
      bordered
      backgroundColor="$background"
      borderColor="rgba(59, 130, 246, 0.2)"
      borderWidth={1}
      borderRadius={12}
      padding="$4"
      gap="$3"
    >
      <XStack justifyContent="space-between" alignItems="center">
        <SkeletonBox width={150} height={20} />
        <SkeletonBox width={100} height={32} borderRadius={6} />
      </XStack>
      <SkeletonBox width="100%" height={height} borderRadius={8} />
    </Card>
  );
}

export default function HubSpotAnalyticsLoading() {
  return (
    <PageLoadingSkeleton>
      {/* Header */}
      <PageHeaderSkeleton
        icon={<TrendingUp size={26} color="#FF7A59" opacity={0.5} />}
        showButton
      />

      {/* Stats Row */}
      <XStack gap="$4" flexWrap="wrap">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </XStack>

      {/* Main Charts */}
      <XStack gap="$4" flexWrap="wrap">
        <YStack flex={2} minWidth={400}>
          <ChartSkeleton height={350} />
        </YStack>
        <YStack flex={1} minWidth={300}>
          <ChartSkeleton height={350} />
        </YStack>
      </XStack>

      {/* Secondary Charts */}
      <XStack gap="$4" flexWrap="wrap">
        <YStack flex={1} minWidth={300}>
          <ChartSkeleton height={250} />
        </YStack>
        <YStack flex={1} minWidth={300}>
          <ChartSkeleton height={250} />
        </YStack>
      </XStack>
    </PageLoadingSkeleton>
  );
}
