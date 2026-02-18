// @ts-nocheck
'use client'

import { YStack, XStack, Text, Stack, Separator, Button } from 'tamagui'
import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: string
  onClick?: () => void
}

export function NavItem({ icon, label, active = false, badge, onClick }: NavItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        paddingTop: 'var(--t-space-3)',
        paddingBottom: 'var(--t-space-3)',
        paddingLeft: 'var(--t-space-4)',
        paddingRight: 'var(--t-space-4)',
        borderRadius: 'var(--t-radius-4)',
        backgroundColor: active ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: active ? '#A855F7' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.08)'
          e.currentTarget.style.transform = 'scale(1.02)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
    >
      <XStack space="$3" alignItems="center">
        <Stack
          width={20}
          height={20}
          justifyContent="center"
          alignItems="center"
          opacity={active ? 1 : 0.7}
        >
          {icon}
        </Stack>
        <Text
          fontSize="$4"
          fontWeight={active ? '700' : '500'}
          color="$color"
          opacity={active ? 1 : 0.8}
          flex={1}
        >
          {label}
        </Text>
        {badge && (
          <Stack
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$4"
            backgroundColor="$zingBlue"
          >
            <Text fontSize="$1" fontWeight="700" color="$white">
              {badge}
            </Text>
          </Stack>
        )}
      </XStack>
    </div>
  )
}

export interface SidebarProps {
  children?: ReactNode
  logo?: ReactNode
  width?: number
  userEmail?: string
  onSignOut?: () => void
}

export function Sidebar({ children, logo, width = 260, userEmail, onSignOut }: SidebarProps) {
  return (
    <YStack
      width={width}
      height="100vh"
      backgroundColor="#050536"
      borderRightWidth={2}
      borderRightColor="rgba(168, 85, 247, 0.5)"
      padding="$4"
      space="$4"
      shadowColor="rgba(168, 85, 247, 0.4)"
      shadowRadius={24}
      shadowOffset={{ width: 6, height: 0 }}
      shadowOpacity={0.4}
      $sm={{
        display: 'none', // Hide on mobile - would need Sheet component for mobile menu
      }}
    >
      {/* Logo Section */}
      {logo && (
        <Stack marginBottom="$2">
          {logo}
        </Stack>
      )}

      <Separator borderColor="$borderColor" />

      {/* Navigation Items */}
      <YStack space="$2" flex={1}>
        {children}
      </YStack>

      {/* User Section - Bottom of Sidebar */}
      {userEmail && (
        <>
          <Separator borderColor="$borderColor" />

          <YStack space="$3" paddingTop="$2">
            {/* User Email */}
            <Text
              fontSize="$3"
              fontWeight="600"
              color="$color"
              numberOfLines={1}
              ellipsizeMode="tail"
              textAlign="center"
            >
              {userEmail}
            </Text>

            {/* Sign Out Button */}
            <Button
              size="$3"
              backgroundColor="transparent"
              borderWidth={1}
              borderColor="$errorRed"
              color="$errorRed"
              fontWeight="600"
              onPress={onSignOut}
              hoverStyle={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              }}
              pressStyle={{
                opacity: 0.8,
              }}
              icon={<LogOut size={16} color="var(--errorRed)" />}
            >
              Sign Out
            </Button>
          </YStack>
        </>
      )}
    </YStack>
  )
}
