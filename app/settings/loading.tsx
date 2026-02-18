/**
 * Settings Page Loading Skeleton
 *
 * Shows instantly when navigating to /settings while data loads.
 * Matches the settings page layout with service status cards.
 */

'use client';

import { YStack, XStack, Card } from 'tamagui';
import { Settings } from 'lucide-react';
import {
  PageLoadingSkeleton,
  PageHeaderSkeleton,
  SkeletonBox,
  SkeletonCircle,
  StatusCardSkeleton,
} from '@/app/components/skeletons/PageSkeleton';

export default function SettingsLoading() {
  return (
    <PageLoadingSkeleton>
      {/* Header */}
      <PageHeaderSkeleton
        icon={<Settings size={26} color="#3B82F6" opacity={0.5} />}
        showButton={false}
      />

      {/* Service Status Section */}
      <YStack gap="$4">
        <SkeletonBox width={180} height={24} />

        {/* Status Cards Grid */}
        <XStack gap="$4" flexWrap="wrap">
          {/* HubSpot Status */}
          <YStack flex={1} minWidth={300}>
            <StatusCardSkeleton />
          </YStack>

          {/* Supabase Status */}
          <YStack flex={1} minWidth={300}>
            <StatusCardSkeleton />
          </YStack>

        </XStack>
      </YStack>

      {/* GBP Connection Section */}
      <YStack gap="$4">
        <SkeletonBox width={220} height={24} />

        <Card
          bordered
          backgroundColor="$background"
          borderColor="rgba(59, 130, 246, 0.2)"
          borderWidth={1}
          borderRadius={12}
          padding="$5"
          gap="$4"
        >
          {/* ZingManagerConnect placeholder */}
          <XStack gap="$4" alignItems="center">
            <SkeletonCircle size={56} />
            <YStack flex={1} gap="$2">
              <SkeletonBox width={200} height={20} />
              <SkeletonBox width={280} height={14} />
            </YStack>
          </XStack>

          <SkeletonBox width={180} height={44} borderRadius={8} />
        </Card>
      </YStack>

      {/* Account Section */}
      <YStack gap="$4">
        <SkeletonBox width={140} height={24} />

        <Card
          bordered
          backgroundColor="$background"
          borderColor="rgba(59, 130, 246, 0.2)"
          borderWidth={1}
          borderRadius={12}
          padding="$4"
          gap="$3"
        >
          <XStack gap="$3" alignItems="center">
            <SkeletonCircle size={48} />
            <YStack flex={1} gap="$2">
              <SkeletonBox width={180} height={18} />
              <SkeletonBox width={220} height={14} />
            </YStack>
          </XStack>
          <SkeletonBox width={100} height={36} borderRadius={6} />
        </Card>
      </YStack>
    </PageLoadingSkeleton>
  );
}
