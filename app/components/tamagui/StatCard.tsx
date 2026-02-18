// @ts-nocheck
'use client'

import { Card, XStack, YStack, Text, Stack } from 'tamagui'
import type { ReactNode } from 'react'

export interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  theme?: 'blue' | 'cyan' | 'purple' | 'success' | 'warning' | 'error'
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
}

const THEME_COLORS = {
  blue: {
    bg: 'rgba(59, 130, 246, 0.1)',     // blue with 10% opacity - dark theme
    icon: '#3B82F6',   // blue-500 - bright icon
  },
  cyan: {
    bg: 'rgba(0, 174, 255, 0.1)',     // cyan with 10% opacity - dark theme
    icon: '#00AEFF',   // zing.work cyan - bright icon
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.1)',     // green with 10% opacity - dark theme
    icon: '#22C55E',   // green-500 - bright icon
  },
  warning: {
    bg: 'rgba(249, 115, 22, 0.1)',     // orange with 10% opacity - dark theme
    icon: '#F97316',   // orange-500 - bright icon
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',     // red with 10% opacity - dark theme
    icon: '#EF4444',   // red-500 - bright icon
  },
  purple: {
    bg: 'rgba(168, 85, 247, 0.1)',     // purple with 10% opacity - dark theme
    icon: '#A855F7',   // purple-500 - bright icon
  },
}

export function StatCard({ title, value, icon, theme = 'blue', trend }: StatCardProps) {
  const colors = THEME_COLORS[theme]

  return (
    <Card
      elevate
      size="$4"
      bordered
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
      shadowColor="$shadowColor"
      shadowRadius={2}
      shadowOffset={{ width: 0, height: 1 }}
      padding="$4"
      flex={1}
      minHeight={100}
      minWidth={200}
      maxWidth={320}
      cursor="default"
      hoverStyle={{
        borderColor: colors.icon,
        backgroundColor: colors.bg,
      }}
      animation="quick"
      $sm={{
        width: 'calc(50% - 8px)',
        minWidth: 'calc(50% - 8px)',
        maxWidth: 'calc(50% - 8px)',
        flex: 0,
      }}
      $gtSm={{
        flex: 1,
        minWidth: 220,
        maxWidth: 320,
      }}
    >
      <XStack
        space="$3"
        $sm={{ space: "$4" }}
        alignItems="center"
        flex={1}
      >
        {/* Content */}
        <YStack
          flex={1}
          space="$2"
          $sm={{ space: "$2.5" }}
        >
          <Text
            fontSize={13}
            $sm={{ fontSize: 14 }}
            $lg={{ fontSize: 14 }}
            color="$color"
            opacity={0.7}
            fontWeight="600"
            letterSpacing={0.8}
            textTransform="uppercase"
          >
            {title}
          </Text>
          <XStack space="$2" $sm={{ space: "$3" }} alignItems="baseline">
            <Text
              fontSize={28}
              $sm={{ fontSize: 32 }}
              $lg={{ fontSize: 36 }}
              fontWeight="700"
              color="$color"
            >
              {value}
            </Text>
            {trend && (
              <Text
                fontSize={12}
                $sm={{ fontSize: 13 }}
                $lg={{ fontSize: 14 }}
                color="$color"
                opacity={0.5}
                fontWeight="500"
              >
                {trend.value}
              </Text>
            )}
          </XStack>
        </YStack>

        {/* Icon */}
        <Stack
          width={36}
          height={36}
          $sm={{ width: 40, height: 40 }}
          $lg={{ width: 44, height: 44 }}
          borderRadius={22}
          backgroundColor={colors.bg}
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
        >
          {icon}
        </Stack>
      </XStack>
    </Card>
  )
}
