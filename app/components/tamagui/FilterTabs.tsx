// @ts-nocheck
'use client'

import { XStack, Text, Stack, ScrollView } from 'tamagui'

export type FilterOption = 'all' | 'synced' | 'pending' | 'error' | 'not_synced'

interface FilterTab {
  value: FilterOption
  label: string
  count?: number
}

interface FilterTabsProps {
  tabs: FilterTab[]
  activeTab: FilterOption
  onTabChange: (tab: FilterOption) => void
}

/**
 * FilterTabs - Professional Tamagui filter tabs
 *
 * Design: Stripe-style tab navigation
 * - Horizontal scrollable tabs
 * - Active state with bottom border
 * - Badge counts
 * - No animations, clean transitions
 */
export function FilterTabs({ tabs, activeTab, onTabChange }: FilterTabsProps) {
  return (
    <Stack
      borderBottomWidth={2}
      borderBottomColor="rgba(59, 130, 246, 0.2)"
      backgroundColor="rgba(30, 40, 71, 0.3)"
      borderRadius="$4"
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={4}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value

            return (
              <Stack
                key={tab.value}
                onPress={() => onTabChange(tab.value)}
                cursor="pointer"
                paddingHorizontal={20}
                paddingVertical={14}
                borderBottomWidth={3}
                borderBottomColor={isActive ? '$zingBlue' : 'transparent'}
                borderRadius="$3"
                backgroundColor={isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                animation="quick"
                hoverStyle={{
                  borderBottomColor: isActive ? '$zingBlue' : 'rgba(59, 130, 246, 0.4)',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.05)',
                }}
                pressStyle={{
                  scale: 0.98,
                }}
              >
                <XStack gap={10} alignItems="center">
                  <Text
                    fontSize={15}
                    fontWeight="700"
                    color={isActive ? '$zingBlue' : '$color'}
                    opacity={isActive ? 1 : 0.7}
                    letterSpacing={0.3}
                  >
                    {tab.label}
                  </Text>
                  {tab.count !== undefined && (
                    <Stack
                      backgroundColor={isActive ? '$zingBlue' : 'rgba(148, 163, 184, 0.2)'}
                      borderRadius={14}
                      paddingHorizontal={10}
                      paddingVertical={3}
                      minWidth={28}
                      alignItems="center"
                      justifyContent="center"
                      borderWidth={1}
                      borderColor={isActive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(148, 163, 184, 0.3)'}
                      shadowColor={isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}
                      shadowRadius={4}
                      shadowOffset={{ width: 0, height: 1 }}
                    >
                      <Text
                        fontSize={12}
                        fontWeight="700"
                        color={isActive ? 'white' : '$color'}
                      >
                        {tab.count}
                      </Text>
                    </Stack>
                  )}
                </XStack>
              </Stack>
            )
          })}
        </XStack>
      </ScrollView>
    </Stack>
  )
}
