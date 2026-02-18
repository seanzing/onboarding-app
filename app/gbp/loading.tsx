/**
 * GBP Dashboard Loading Skeleton
 *
 * Shows instantly when navigating to /gbp while data loads.
 * Matches the tabbed layout of the GBP dashboard.
 */

'use client';

import { YStack, XStack, Card } from 'tamagui';
import { MapPin } from 'lucide-react';
import {
  PageLoadingSkeleton,
  PageHeaderSkeleton,
  TabsSkeleton,
  SkeletonBox,
  CardSkeleton,
  ListSkeleton,
} from '@/app/components/skeletons/PageSkeleton';

export default function GBPLoading() {
  return (
    <PageLoadingSkeleton>
      {/* Header */}
      <PageHeaderSkeleton
        icon={<MapPin size={26} color="#3B82F6" opacity={0.5} />}
        showButton={false}
      />

      {/* Tabs */}
      <TabsSkeleton count={4} />

      {/* Main Content Area */}
      <YStack gap="$4">
        {/* Stats Row */}
        <XStack gap="$4" flexWrap="wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card
              key={i}
              bordered
              backgroundColor="$background"
              borderColor="rgba(59, 130, 246, 0.2)"
              borderWidth={1}
              borderRadius={12}
              padding="$4"
              flex={1}
              minWidth={200}
            >
              <YStack gap="$2">
                <SkeletonBox width={80} height={14} />
                <SkeletonBox width={60} height={32} />
              </YStack>
            </Card>
          ))}
        </XStack>

        {/* Connected Accounts List */}
        <ListSkeleton count={3} />

        {/* Search Card */}
        <CardSkeleton height={150} />
      </YStack>
    </PageLoadingSkeleton>
  );
}
