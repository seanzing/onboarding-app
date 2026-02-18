// @ts-nocheck
'use client';

/**
 * EmptyState Component
 *
 * A beautiful, reusable empty state component for when data hasn't loaded
 * or doesn't exist yet. Used throughout the app for consistent UX.
 */

import { YStack, XStack, Text, Button, Card } from 'tamagui';
import { ReactNode } from 'react';

export type EmptyStateVariant = 'default' | 'info' | 'success' | 'warning' | 'purple';

interface EmptyStateProps {
  /** Icon to display (Lucide React icon) */
  icon: ReactNode;
  /** Main title text */
  title: string;
  /** Descriptive subtitle */
  description: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button handler */
  onAction?: () => void;
  /** Optional secondary action label */
  secondaryActionLabel?: string;
  /** Optional secondary action handler */
  onSecondaryAction?: () => void;
  /** Visual variant for color theming */
  variant?: EmptyStateVariant;
  /** Optional compact mode for smaller spaces */
  compact?: boolean;
}

const VARIANT_COLORS = {
  default: {
    iconBg: 'rgba(107, 114, 128, 0.12)',
    iconColor: '#6B7280',
    borderColor: 'rgba(107, 114, 128, 0.2)',
    bgColor: 'rgba(107, 114, 128, 0.03)',
    buttonBg: 'rgba(107, 114, 128, 0.15)',
    buttonColor: '#6B7280',
  },
  info: {
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#3B82F6',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    bgColor: 'rgba(59, 130, 246, 0.03)',
    buttonBg: 'rgba(59, 130, 246, 0.15)',
    buttonColor: '#3B82F6',
  },
  success: {
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconColor: '#10B981',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    bgColor: 'rgba(16, 185, 129, 0.03)',
    buttonBg: 'rgba(16, 185, 129, 0.15)',
    buttonColor: '#10B981',
  },
  warning: {
    iconBg: 'rgba(245, 158, 11, 0.12)',
    iconColor: '#F59E0B',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    bgColor: 'rgba(245, 158, 11, 0.03)',
    buttonBg: 'rgba(245, 158, 11, 0.15)',
    buttonColor: '#F59E0B',
  },
  purple: {
    iconBg: 'rgba(139, 92, 246, 0.12)',
    iconColor: '#8B5CF6',
    borderColor: 'rgba(139, 92, 246, 0.2)',
    bgColor: 'rgba(139, 92, 246, 0.03)',
    buttonBg: 'rgba(139, 92, 246, 0.15)',
    buttonColor: '#8B5CF6',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
  compact = false,
}: EmptyStateProps) {
  const colors = VARIANT_COLORS[variant];

  return (
    <Card
      backgroundColor={colors.bgColor}
      borderColor={colors.borderColor}
      borderWidth={1}
      borderRadius="$5"
      padding={compact ? '$5' : '$8'}
      alignItems="center"
      justifyContent="center"
      $sm={{ padding: compact ? '$4' : '$6' }}
    >
      <YStack
        alignItems="center"
        justifyContent="center"
        space={compact ? '$3' : '$4'}
        maxWidth={400}
      >
        {/* Icon Container */}
        <YStack
          width={compact ? 64 : 80}
          height={compact ? 64 : 80}
          borderRadius={compact ? '$4' : '$5'}
          backgroundColor={colors.iconBg}
          alignItems="center"
          justifyContent="center"
          $sm={{ width: compact ? 56 : 64, height: compact ? 56 : 64 }}
        >
          {icon}
        </YStack>

        {/* Text Content */}
        <YStack alignItems="center" space="$2">
          <Text
            fontSize={compact ? '$5' : '$6'}
            fontWeight="700"
            color="$color"
            textAlign="center"
            $sm={{ fontSize: compact ? '$4' : '$5' }}
          >
            {title}
          </Text>
          <Text
            fontSize={compact ? '$3' : '$4'}
            color="$color"
            opacity={0.6}
            textAlign="center"
            lineHeight={compact ? 20 : 24}
            $sm={{ fontSize: '$3' }}
          >
            {description}
          </Text>
        </YStack>

        {/* Action Buttons */}
        {(actionLabel || secondaryActionLabel) && (
          <XStack
            space="$3"
            marginTop="$2"
            flexWrap="wrap"
            justifyContent="center"
            $sm={{ flexDirection: 'column', width: '100%' }}
          >
            {actionLabel && onAction && (
              <Button
                size={compact ? '$3' : '$4'}
                backgroundColor={colors.buttonBg}
                borderRadius="$3"
                onPress={onAction}
                hoverStyle={{ opacity: 0.8 }}
                pressStyle={{ opacity: 0.7 }}
                $sm={{ width: '100%' }}
              >
                <Text
                  color={colors.buttonColor}
                  fontWeight="600"
                  fontSize={compact ? '$3' : '$4'}
                >
                  {actionLabel}
                </Text>
              </Button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <Button
                size={compact ? '$3' : '$4'}
                backgroundColor="transparent"
                borderWidth={1}
                borderColor={colors.borderColor}
                borderRadius="$3"
                onPress={onSecondaryAction}
                hoverStyle={{ backgroundColor: colors.bgColor }}
                pressStyle={{ opacity: 0.7 }}
                $sm={{ width: '100%' }}
              >
                <Text
                  color="$color"
                  opacity={0.7}
                  fontWeight="500"
                  fontSize={compact ? '$3' : '$4'}
                >
                  {secondaryActionLabel}
                </Text>
              </Button>
            )}
          </XStack>
        )}
      </YStack>
    </Card>
  );
}

/**
 * NoDataYet - Specialized empty state for "no data loaded" scenarios
 */
export function NoDataYet({
  icon,
  title = 'No Data Yet',
  description = 'Data will appear here once available.',
  ...props
}: Partial<EmptyStateProps> & { icon: ReactNode }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      variant="info"
      {...props}
    />
  );
}

/**
 * LoadingFailed - Specialized empty state for error scenarios
 */
export function LoadingFailed({
  icon,
  title = 'Failed to Load',
  description = 'Something went wrong. Please try again.',
  onRetry,
  ...props
}: Partial<EmptyStateProps> & { icon: ReactNode; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      variant="warning"
      actionLabel={onRetry ? 'Try Again' : undefined}
      onAction={onRetry}
      {...props}
    />
  );
}

export default EmptyState;
