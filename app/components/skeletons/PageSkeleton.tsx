/**
 * Reusable Page Skeleton Components
 *
 * Provides consistent loading states across all pages.
 * Uses Tamagui components with pulse animation.
 */

'use client';

import { YStack, XStack, Card, Separator } from 'tamagui';
import { ReactNode } from 'react';

// Pulse animation keyframes
const pulseKeyframes = `
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
`;

// Inject styles once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * Basic skeleton box with pulse animation
 */
export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  className,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  className?: string;
}) {
  injectStyles();

  return (
    <YStack
      width={width as number}
      height={height}
      borderRadius={borderRadius}
      backgroundColor="rgba(59, 130, 246, 0.15)"
      style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite' }}
      className={className}
    />
  );
}

/**
 * Skeleton circle for avatars/icons
 */
export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return <SkeletonBox width={size} height={size} borderRadius={size / 2} />;
}

/**
 * Skeleton text line
 */
export function SkeletonText({
  width = '100%',
  height = 16,
}: {
  width?: number | string;
  height?: number;
}) {
  return <SkeletonBox width={width} height={height} borderRadius={4} />;
}

/**
 * Page header skeleton with icon and title
 */
export function PageHeaderSkeleton({
  icon,
  showButton = true,
}: {
  icon?: ReactNode;
  showButton?: boolean;
}) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
      <XStack alignItems="center" gap="$3">
        <YStack
          width={52}
          height={52}
          borderRadius="$4"
          backgroundColor="rgba(59, 130, 246, 0.15)"
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
        <YStack gap="$2">
          <SkeletonBox width={200} height={24} />
          <SkeletonBox width={140} height={14} />
        </YStack>
      </XStack>
      {showButton && <SkeletonBox width={120} height={40} borderRadius={8} />}
    </XStack>
  );
}

/**
 * Tabs skeleton
 */
export function TabsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <XStack gap="$2" paddingVertical="$2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} width={100} height={36} borderRadius={8} />
      ))}
    </XStack>
  );
}

/**
 * Card skeleton for dashboard cards
 */
export function CardSkeleton({
  height = 200,
  showHeader = true,
}: {
  height?: number;
  showHeader?: boolean;
}) {
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
      {showHeader && (
        <XStack justifyContent="space-between" alignItems="center">
          <SkeletonBox width={150} height={20} />
          <SkeletonCircle size={32} />
        </XStack>
      )}
      <SkeletonBox width="100%" height={height - (showHeader ? 80 : 40)} />
    </Card>
  );
}

/**
 * Grid of card skeletons
 */
export function CardGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: number;
}) {
  return (
    <XStack flexWrap="wrap" gap="$4">
      {Array.from({ length: count }).map((_, i) => (
        <YStack key={i} width={`${100 / columns - 2}%`} minWidth={280}>
          <CardSkeleton />
        </YStack>
      ))}
    </XStack>
  );
}

/**
 * List item skeleton
 */
export function ListItemSkeleton() {
  return (
    <>
      <XStack paddingVertical="$3" paddingHorizontal="$4" alignItems="center" gap="$3">
        <SkeletonCircle size={40} />
        <YStack flex={1} gap="$2">
          <SkeletonBox width="60%" height={18} />
          <SkeletonBox width="40%" height={14} />
        </YStack>
        <SkeletonBox width={80} height={32} borderRadius={6} />
      </XStack>
      <Separator borderColor="$borderColor" />
    </>
  );
}

/**
 * List skeleton
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card
      bordered
      backgroundColor="$background"
      borderColor="rgba(59, 130, 246, 0.2)"
      borderWidth={1}
      borderRadius={12}
      padding={0}
      overflow="hidden"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </Card>
  );
}

/**
 * Status card skeleton for settings page
 */
export function StatusCardSkeleton() {
  return (
    <Card
      bordered
      backgroundColor="$background"
      borderColor="rgba(59, 130, 246, 0.2)"
      borderWidth={1}
      borderRadius={12}
      padding="$4"
    >
      <XStack alignItems="center" gap="$3">
        <SkeletonCircle size={48} />
        <YStack flex={1} gap="$2">
          <SkeletonBox width={120} height={20} />
          <SkeletonBox width={180} height={14} />
        </YStack>
        <SkeletonCircle size={24} />
      </XStack>
    </Card>
  );
}

/**
 * Full page loading wrapper
 */
export function PageLoadingSkeleton({
  children,
  padding = '$6',
}: {
  children: ReactNode;
  padding?: string;
}) {
  return (
    <YStack width="100%" maxWidth="100%" gap="$6" padding={padding as any}>
      {children}
    </YStack>
  );
}
