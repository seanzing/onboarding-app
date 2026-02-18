// @ts-nocheck
/**
 * Alert Component - Tamagui
 *
 * Professional alert/notification component with responsive sizing
 * Used for success messages, errors, warnings, and info throughout the app
 */

import { YStack, XStack, Text } from 'tamagui'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

export type AlertVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  children: React.ReactNode
  title?: string
  showIcon?: boolean
  // Allow any additional props from YStack
  [key: string]: any
}

const variantConfig = {
  default: {
    bg: '$blue2',
    border: '$blue6',
    icon: Info,
    iconColor: '#3B82F6', // $blue9
  },
  success: {
    bg: '$green2',
    border: '$green6',
    icon: CheckCircle2,
    iconColor: '#16A34A', // $green9
  },
  error: {
    bg: '$red2',
    border: '$red6',
    icon: AlertCircle,
    iconColor: '#DC2626', // $red9
  },
  warning: {
    bg: '$yellow2',
    border: '$yellow6',
    icon: AlertTriangle,
    iconColor: '#CA8A04', // $yellow9
  },
  info: {
    bg: '$blue2',
    border: '$blue6',
    icon: Info,
    iconColor: '#3B82F6', // $blue9
  },
}

export function Alert({
  variant = 'default',
  children,
  title,
  showIcon = true,
  ...props
}: AlertProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <YStack
      backgroundColor={config.bg}
      borderWidth={1}
      borderColor={config.border}
      borderRadius="$4"
      padding="$4"
      $sm={{ padding: "$4.5" }}
      $lg={{ padding: "$5" }}
      {...props}
    >
      <XStack
        space="$3"
        $sm={{ space: "$3.5" }}
        alignItems="flex-start"
      >
        {showIcon && (
          <YStack marginTop="$0.5">
            <Icon
              size={20}
              color={config.iconColor}
              strokeWidth={2}
            />
          </YStack>
        )}
        <YStack flex={1} space="$2">
          {title && (
            <Text
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              fontWeight="600"
              color="$color"
            >
              {title}
            </Text>
          )}
          <Text
            fontSize={13}
            $sm={{ fontSize: 14 }}
            $lg={{ fontSize: 15 }}
            color="$color"
            opacity={title ? 0.9 : 1}
            lineHeight={20}
            $sm={{ lineHeight: 22 }}
          >
            {children}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  )
}

// AlertDescription for more semantic usage
export function AlertDescription({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return (
    <Text
      fontSize={13}
      $sm={{ fontSize: 14 }}
      color="$color"
      opacity={0.9}
      lineHeight={20}
      {...props}
    >
      {children}
    </Text>
  )
}

// AlertTitle for more semantic usage
export function AlertTitle({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return (
    <Text
      fontSize={14}
      $sm={{ fontSize: 15 }}
      fontWeight="600"
      color="$color"
      {...props}
    >
      {children}
    </Text>
  )
}
