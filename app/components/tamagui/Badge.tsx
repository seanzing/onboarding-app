// @ts-nocheck
/**
 * Badge Component - Tamagui
 *
 * Professional badge component with responsive sizing and semantic variants
 * Used for status indicators, labels, and tags throughout the app
 */

import { YStack, Text, styled } from 'tamagui'

export type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline'

export interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  // Allow any additional props from YStack
  [key: string]: any
}

const variantColors = {
  default: {
    bg: 'rgba(156, 163, 175, 0.15)',
    color: 'rgba(156, 163, 175, 1)',
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    color: 'rgba(34, 197, 94, 1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    color: 'rgba(239, 68, 68, 1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    color: 'rgba(245, 158, 11, 1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    color: 'rgba(59, 130, 246, 1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  outline: {
    bg: 'transparent',
    color: '$color',
    borderColor: '$borderColor',
  },
}

export function Badge({
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const colors = variantColors[variant]

  return (
    <YStack
      backgroundColor={colors.bg}
      borderWidth={variant === 'outline' ? 1 : 0}
      borderColor={colors.borderColor}
      paddingHorizontal="$2"
      paddingVertical="$1"
      $sm={{ paddingHorizontal: "$2.5", paddingVertical: "$1.5" }}
      borderRadius="$2"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      {...props}
    >
      <Text
        fontSize={11}
        $sm={{ fontSize: 12 }}
        fontWeight="500"
        color={colors.color}
        letterSpacing={0.3}
      >
        {children}
      </Text>
    </YStack>
  )
}

// Styled variant for more customization
export const StyledBadge = styled(YStack, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',

  variants: {
    size: {
      sm: {
        paddingHorizontal: '$1.5',
        paddingVertical: '$0.5',
      },
      md: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
      lg: {
        paddingHorizontal: '$3',
        paddingVertical: '$1.5',
      },
    },

    variant: {
      default: {
        backgroundColor: 'rgba(156, 163, 175, 0.15)',
      },
      success: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
      },
      error: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
      },
      warning: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
      },
      info: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
})
