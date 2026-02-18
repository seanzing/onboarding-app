// @ts-nocheck
'use client'

import { ReactNode } from 'react'
import { Card, YStack, XStack, Text, Button, Stack, Spinner } from 'tamagui'
import { AlertCircle, RefreshCw, Inbox, Database } from 'lucide-react'

// ============================================================
// TYPES & VARIANTS
// ============================================================

export type EmptyStateVariant = 'default' | 'info' | 'success' | 'warning' | 'purple'

const VARIANT_COLORS = {
  default: {
    iconBg: 'rgba(107, 114, 128, 0.12)',
    iconColor: '#6B7280',
    borderColor: 'rgba(107, 114, 128, 0.25)',
    bgColor: 'rgba(107, 114, 128, 0.04)',
    buttonBg: 'rgba(107, 114, 128, 0.12)',
    buttonColor: '#6B7280',
  },
  info: {
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#3B82F6',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    bgColor: 'rgba(59, 130, 246, 0.04)',
    buttonBg: 'rgba(59, 130, 246, 0.12)',
    buttonColor: '#3B82F6',
  },
  success: {
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconColor: '#10B981',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    bgColor: 'rgba(16, 185, 129, 0.04)',
    buttonBg: 'rgba(16, 185, 129, 0.12)',
    buttonColor: '#10B981',
  },
  warning: {
    iconBg: 'rgba(245, 158, 11, 0.12)',
    iconColor: '#F59E0B',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    bgColor: 'rgba(245, 158, 11, 0.04)',
    buttonBg: 'rgba(245, 158, 11, 0.12)',
    buttonColor: '#F59E0B',
  },
  purple: {
    iconBg: 'rgba(139, 92, 246, 0.12)',
    iconColor: '#8B5CF6',
    borderColor: 'rgba(139, 92, 246, 0.25)',
    bgColor: 'rgba(139, 92, 246, 0.04)',
    buttonBg: 'rgba(139, 92, 246, 0.12)',
    buttonColor: '#8B5CF6',
  },
}

// ============================================================
// EMPTY STATE COMPONENT
// ============================================================

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  variant?: EmptyStateVariant
  compact?: boolean
}

/**
 * EmptyState - Beautiful empty state for when no data is available
 *
 * Features:
 * - Color variants for different contexts
 * - Compact mode for smaller spaces
 * - Primary and secondary action buttons
 * - Responsive design
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  compact = false,
}: EmptyStateProps) {
  const colors = VARIANT_COLORS[variant]

  return (
    <Card
      backgroundColor={colors.bgColor}
      borderColor={colors.borderColor}
      borderWidth={1}
      borderRadius="$5"
      padding={compact ? '$5' : '$8'}
      $sm={{ padding: compact ? '$4' : '$6' }}
    >
      <YStack
        space={compact ? '$3' : '$4'}
        alignItems="center"
        justifyContent="center"
        paddingVertical={compact ? '$2' : '$4'}
      >
        {/* Icon Container */}
        <Stack
          width={compact ? 56 : 72}
          height={compact ? 56 : 72}
          borderRadius={compact ? '$4' : 36}
          backgroundColor={colors.iconBg}
          justifyContent="center"
          alignItems="center"
          $sm={{ width: compact ? 48 : 64, height: compact ? 48 : 64 }}
        >
          {icon || <Inbox size={compact ? 24 : 32} color={colors.iconColor} strokeWidth={1.5} />}
        </Stack>

        {/* Content */}
        <YStack space="$2" alignItems="center" maxWidth={400}>
          <Text
            fontSize={compact ? '$5' : '$6'}
            fontWeight="700"
            color="$color"
            textAlign="center"
            $sm={{ fontSize: compact ? '$4' : '$5' }}
          >
            {title}
          </Text>
          {description && (
            <Text
              fontSize={compact ? '$3' : '$4'}
              color="$color"
              opacity={0.6}
              textAlign="center"
              fontWeight="500"
              lineHeight={compact ? 18 : 22}
              $sm={{ fontSize: '$3' }}
            >
              {description}
            </Text>
          )}
        </YStack>

        {/* Action Buttons */}
        {(action || secondaryAction) && (
          <XStack
            space="$3"
            marginTop="$2"
            flexWrap="wrap"
            justifyContent="center"
            $sm={{ flexDirection: 'column', width: '100%' }}
          >
            {action && (
              <Button
                size={compact ? '$3' : '$4'}
                onPress={action.onClick}
                backgroundColor={colors.buttonBg}
                borderWidth={0}
                fontWeight="600"
                fontSize={compact ? 13 : 14}
                paddingHorizontal={compact ? 16 : 24}
                height={compact ? 36 : 40}
                borderRadius="$3"
                hoverStyle={{
                  opacity: 0.85,
                  backgroundColor: colors.buttonBg,
                }}
                pressStyle={{
                  opacity: 0.7,
                }}
                $sm={{ width: '100%' }}
              >
                <Text color={colors.buttonColor} fontWeight="600" fontSize={compact ? 13 : 14}>
                  {action.label}
                </Text>
              </Button>
            )}
            {secondaryAction && (
              <Button
                size={compact ? '$3' : '$4'}
                onPress={secondaryAction.onClick}
                backgroundColor="transparent"
                borderWidth={1}
                borderColor={colors.borderColor}
                fontWeight="500"
                fontSize={compact ? 13 : 14}
                paddingHorizontal={compact ? 16 : 24}
                height={compact ? 36 : 40}
                borderRadius="$3"
                hoverStyle={{
                  backgroundColor: colors.bgColor,
                }}
                pressStyle={{
                  opacity: 0.7,
                }}
                $sm={{ width: '100%' }}
              >
                <Text color="$color" opacity={0.7} fontWeight="500" fontSize={compact ? 13 : 14}>
                  {secondaryAction.label}
                </Text>
              </Button>
            )}
          </XStack>
        )}
      </YStack>
    </Card>
  )
}

// ============================================================
// NO DATA YET - Specialized Empty State
// ============================================================

interface NoDataYetProps {
  icon?: ReactNode
  title?: string
  description?: string
  helpText?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: EmptyStateVariant
}

/**
 * NoDataYet - Specialized empty state for "data not loaded yet" scenarios
 *
 * Provides friendly messaging and optional help text
 */
export function NoDataYet({
  icon,
  title = 'No Data Yet',
  description = 'Data will appear here once available.',
  helpText,
  action,
  variant = 'info',
}: NoDataYetProps) {
  const colors = VARIANT_COLORS[variant]

  return (
    <Card
      backgroundColor={colors.bgColor}
      borderColor={colors.borderColor}
      borderWidth={1}
      borderRadius="$5"
      padding="$8"
      $sm={{ padding: '$6' }}
    >
      <YStack space="$4" alignItems="center" justifyContent="center" paddingVertical="$4">
        {/* Icon */}
        <Stack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor={colors.iconBg}
          justifyContent="center"
          alignItems="center"
          $sm={{ width: 64, height: 64 }}
        >
          {icon || <Database size={36} color={colors.iconColor} strokeWidth={1.5} />}
        </Stack>

        {/* Content */}
        <YStack space="$2" alignItems="center" maxWidth={450}>
          <Text
            fontSize="$6"
            fontWeight="700"
            color="$color"
            textAlign="center"
            $sm={{ fontSize: '$5' }}
          >
            {title}
          </Text>
          <Text
            fontSize="$4"
            color="$color"
            opacity={0.6}
            textAlign="center"
            fontWeight="500"
            lineHeight={22}
            $sm={{ fontSize: '$3' }}
          >
            {description}
          </Text>
          {helpText && (
            <Text
              fontSize="$3"
              color={colors.iconColor}
              textAlign="center"
              fontWeight="500"
              marginTop="$2"
              $sm={{ fontSize: '$2' }}
            >
              {helpText}
            </Text>
          )}
        </YStack>

        {/* Action Button */}
        {action && (
          <Button
            size="$4"
            onPress={action.onClick}
            backgroundColor={colors.buttonBg}
            borderWidth={0}
            fontWeight="600"
            fontSize={14}
            paddingHorizontal={24}
            height={44}
            borderRadius="$4"
            marginTop="$2"
            hoverStyle={{
              opacity: 0.85,
            }}
            pressStyle={{
              opacity: 0.7,
            }}
          >
            <Text color={colors.buttonColor} fontWeight="600" fontSize={14}>
              {action.label}
            </Text>
          </Button>
        )}
      </YStack>
    </Card>
  )
}

// ============================================================
// ERROR STATE COMPONENT
// ============================================================

interface ErrorStateProps {
  error: string | Error
  title?: string
  onRetry?: () => void
}

/**
 * ErrorState - Display when an error occurs
 *
 * Features:
 * - Red color scheme for errors
 * - Clear error messaging
 * - Retry button
 */
export function ErrorState({
  error,
  title = 'Something went wrong',
  onRetry,
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <Card
      backgroundColor="rgba(239, 68, 68, 0.04)"
      borderColor="rgba(239, 68, 68, 0.25)"
      borderWidth={1}
      borderRadius="$5"
      padding="$8"
      $sm={{ padding: '$6' }}
    >
      <YStack space="$4" alignItems="center" justifyContent="center" paddingVertical="$4">
        {/* Error Icon */}
        <Stack
          width={72}
          height={72}
          borderRadius={36}
          backgroundColor="rgba(239, 68, 68, 0.12)"
          justifyContent="center"
          alignItems="center"
          $sm={{ width: 64, height: 64 }}
        >
          <AlertCircle size={32} color="#EF4444" strokeWidth={1.5} />
        </Stack>

        {/* Content */}
        <YStack space="$2" alignItems="center" maxWidth={400}>
          <Text
            fontSize="$6"
            fontWeight="700"
            color="$color"
            textAlign="center"
            $sm={{ fontSize: '$5' }}
          >
            {title}
          </Text>
          <Text
            fontSize="$4"
            color="$color"
            opacity={0.6}
            textAlign="center"
            fontWeight="500"
            lineHeight={22}
            $sm={{ fontSize: '$3' }}
          >
            {errorMessage}
          </Text>
        </YStack>

        {/* Retry Button */}
        {onRetry && (
          <Button
            size="$4"
            onPress={onRetry}
            backgroundColor="rgba(239, 68, 68, 0.12)"
            borderWidth={0}
            fontWeight="600"
            fontSize={14}
            paddingHorizontal={24}
            height={44}
            borderRadius="$4"
            marginTop="$2"
            hoverStyle={{
              opacity: 0.85,
            }}
            pressStyle={{
              opacity: 0.7,
            }}
          >
            <XStack gap="$2" alignItems="center">
              <RefreshCw size={16} color="#EF4444" strokeWidth={2} />
              <Text color="#EF4444" fontWeight="600" fontSize={14}>
                Try Again
              </Text>
            </XStack>
          </Button>
        )}
      </YStack>
    </Card>
  )
}

// ============================================================
// LOADING STATE COMPONENT
// ============================================================

interface LoadingStateProps {
  title?: string
  description?: string
  variant?: 'default' | 'info' | 'purple'
}

/**
 * LoadingState - Display while data is loading
 *
 * Features:
 * - Spinner animation
 * - Configurable messages
 * - Color variants
 */
export function LoadingState({
  title = 'Loading...',
  description,
  variant = 'info',
}: LoadingStateProps) {
  const colors = VARIANT_COLORS[variant]

  return (
    <Card
      backgroundColor={colors.bgColor}
      borderColor={colors.borderColor}
      borderWidth={1}
      borderRadius="$5"
      padding="$8"
      $sm={{ padding: '$6' }}
    >
      <YStack space="$4" alignItems="center" justifyContent="center" paddingVertical="$4">
        {/* Spinner */}
        <Spinner size="large" color={colors.iconColor} />

        {/* Content */}
        <YStack space="$2" alignItems="center" maxWidth={400}>
          <Text
            fontSize="$6"
            fontWeight="700"
            color="$color"
            textAlign="center"
            $sm={{ fontSize: '$5' }}
          >
            {title}
          </Text>
          {description && (
            <Text
              fontSize="$4"
              color="$color"
              opacity={0.6}
              textAlign="center"
              fontWeight="500"
              lineHeight={22}
              $sm={{ fontSize: '$3' }}
            >
              {description}
            </Text>
          )}
        </YStack>
      </YStack>
    </Card>
  )
}
