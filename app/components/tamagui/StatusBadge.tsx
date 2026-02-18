// @ts-nocheck
'use client'

import { XStack, Text } from 'tamagui'

export type StatusType = 'synced' | 'pending' | 'error' | 'not_synced'

export interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_COLORS = {
  synced: {
    bg: 'rgba(34, 197, 94, 0.15)',     // green with opacity
    border: 'rgba(34, 197, 94, 0.4)',  // green border
    text: '#22C55E',                    // bright green
    shadow: 'rgba(34, 197, 94, 0.2)',  // green shadow
    label: 'Synced',
  },
  pending: {
    bg: 'rgba(251, 191, 36, 0.15)',    // amber with opacity
    border: 'rgba(251, 191, 36, 0.4)', // amber border
    text: '#FBB836',                    // bright amber
    shadow: 'rgba(251, 191, 36, 0.2)', // amber shadow
    label: 'Pending',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',     // red with opacity
    border: 'rgba(239, 68, 68, 0.4)',  // red border
    text: '#EF4444',                    // bright red
    shadow: 'rgba(239, 68, 68, 0.2)',  // red shadow
    label: 'Error',
  },
  not_synced: {
    bg: 'rgba(148, 163, 184, 0.15)',   // gray with opacity
    border: 'rgba(148, 163, 184, 0.3)',// gray border
    text: '#94A3B8',                    // muted gray
    shadow: 'rgba(148, 163, 184, 0.15)',// gray shadow
    label: 'Not Synced',
  },
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_COLORS[status]
  const displayLabel = label || config.label

  const sizeConfig = {
    sm: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 11,
    },
    md: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 13,
    },
    lg: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
    },
  }

  const sizing = sizeConfig[size]

  return (
    <XStack
      paddingHorizontal={sizing.paddingHorizontal}
      paddingVertical={sizing.paddingVertical}
      borderRadius={16}
      backgroundColor={config.bg}
      borderWidth={1.5}
      borderColor={config.border}
      alignItems="center"
      justifyContent="center"
      shadowColor={config.shadow}
      shadowRadius={4}
      shadowOffset={{ width: 0, height: 1 }}
    >
      <Text
        fontSize={sizing.fontSize}
        fontWeight="700"
        color={config.text}
        letterSpacing={0.3}
      >
        {displayLabel}
      </Text>
    </XStack>
  )
}
