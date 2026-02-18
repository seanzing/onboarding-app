// @ts-nocheck
'use client'

import { XStack, YStack, Stack, ScrollView } from 'tamagui'
import type { ReactNode } from 'react'
import { TopBar } from './TopBar'

export interface AppShellProps {
  children: ReactNode
  sidebar?: ReactNode
  topBarTitle?: string
  topBarSubtitle?: string
  topBarActions?: ReactNode
  onSearch?: (value: string) => void
  mobileNavItems?: ReactNode
  mobileLogo?: ReactNode
}

export function AppShell({
  children,
  sidebar,
  topBarTitle,
  topBarSubtitle,
  topBarActions,
  onSearch,
  mobileNavItems,
  mobileLogo
}: AppShellProps) {
  return (
    <XStack flex={1} height="100vh" backgroundColor="#0a0e27" overflow="hidden">
      {/* Sidebar - Hidden on mobile */}
      {sidebar}

      {/* Main Content Area */}
      <YStack flex={1} height="100vh" overflow="hidden">
        {/* Top Bar */}
        <TopBar
          title={topBarTitle}
          subtitle={topBarSubtitle}
          actions={topBarActions}
          onSearch={onSearch}
          mobileNavItems={mobileNavItems}
          mobileLogo={mobileLogo}
        />

        {/* Page Content - Scrollable */}
        <ScrollView
          flex={1}
          backgroundColor="#050536"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <Stack
            width="100%"
            maxWidth="100%"
            padding="$6"
            $sm={{
              padding: '$4',
            }}
          >
            {children}
          </Stack>
        </ScrollView>
      </YStack>
    </XStack>
  )
}
