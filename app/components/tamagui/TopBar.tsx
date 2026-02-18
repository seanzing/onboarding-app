// @ts-nocheck
'use client'

import { XStack, YStack, Text, Stack, Input } from 'tamagui'
import type { ReactNode } from 'react'
import { MobileNav } from './MobileNav'

export interface TopBarProps {
  title?: string
  subtitle?: string
  searchPlaceholder?: string
  actions?: ReactNode
  onSearch?: (value: string) => void
  mobileNavItems?: ReactNode
  mobileLogo?: ReactNode
}

export function TopBar({
  title = 'Dashboard',
  subtitle,
  searchPlaceholder = 'Search...',
  actions,
  onSearch,
  mobileNavItems,
  mobileLogo
}: TopBarProps) {
  return (
    <Stack
      position="sticky"
      top={0}
      zIndex={50}
      width="100%"
      backgroundColor="#0a0e27"
      backdropFilter="blur(12px)"
      borderBottomWidth={1}
      borderBottomColor="#2a3f5f"
      paddingHorizontal="$6"
      paddingVertical="$2"
      shadowColor="rgba(0, 0, 0, 0.3)"
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 2 }}
      $sm={{
        paddingHorizontal: '$4',
        paddingVertical: '$1.5',
      }}
    >
      <XStack
        justifyContent="space-between"
        alignItems="center"
        space="$4"
        width="100%"
      >
        {/* Mobile Navigation (visible only on mobile) */}
        {mobileNavItems && (
          <Stack
            $gtSm={{ display: 'none' }}
            marginRight="$3"
          >
            <MobileNav logo={mobileLogo}>
              {mobileNavItems}
            </MobileNav>
          </Stack>
        )}

        {/* Left: Title Section */}
        <YStack space="$1" flex={1}>
          <Text
            fontSize="$7"
            fontWeight="700"
            color="$color"
            $sm={{
              fontSize: '$6',
            }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              fontSize="$3"
              color="$color"
              opacity={0.6}
              $sm={{
                fontSize: '$2',
              }}
            >
              {subtitle}
            </Text>
          )}
        </YStack>

        {/* Center: Search (Optional - hide on small screens) */}
        {onSearch && (
          <Stack
            flex={2}
            maxWidth={400}
            $sm={{
              display: 'none',
            }}
          >
            <Input
              placeholder={searchPlaceholder}
              size="$4"
              backgroundColor="rgba(30, 40, 71, 0.5)"
              borderColor="rgba(59, 130, 246, 0.2)"
              borderWidth={1}
              paddingHorizontal="$4"
              paddingVertical="$2"
              fontSize="$3"
              color="$color"
              placeholderTextColor="$colorTransparent"
              animation="quick"
              onChangeText={onSearch}
              focusStyle={{
                borderColor: '$zingBlue',
                borderWidth: 2,
                backgroundColor: 'rgba(30, 40, 71, 0.8)',
              }}
              hoverStyle={{
                borderColor: 'rgba(59, 130, 246, 0.4)',
                backgroundColor: 'rgba(30, 40, 71, 0.7)',
              }}
            />
          </Stack>
        )}

        {/* Right: Actions */}
        {actions && (
          <XStack space="$3" alignItems="center">
            {actions}
          </XStack>
        )}
      </XStack>
    </Stack>
  )
}
