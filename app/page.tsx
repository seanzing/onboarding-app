// @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import { YStack, XStack, Text, Button, Spinner, Card } from 'tamagui'
import { Building2 } from 'lucide-react'
import { useCompanies } from './hooks/useCompanies'
import ClientOnly from './components/ClientOnly'

export default function DashboardPage() {
  const router = useRouter()
  const { companies, loading: companiesLoading, error: companiesError } = useCompanies()

  // Loading state
  if (companiesLoading) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh" space="$5">
          <Spinner size="large" color="$zingBlue" />
          <YStack space="$3" alignItems="center">
            <Text fontSize="$8" fontWeight="700" color="$color">
              Loading dashboard...
            </Text>
            <Text fontSize="$5" color="$color" opacity={0.6}>
              Fetching companies from database
            </Text>
          </YStack>
        </YStack>
      </ClientOnly>
    )
  }

  // Error state
  if (companiesError) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh" space="$5">
          <Text fontSize="$10" fontWeight="700" color="$errorRed">
            ⚠️
          </Text>
          <YStack space="$3" alignItems="center" maxWidth={500}>
            <Text fontSize="$8" fontWeight="700" color="$color" textAlign="center">
              Failed to load dashboard
            </Text>
            <Text fontSize="$5" color="$color" opacity={0.6} textAlign="center">
              {companiesError.message || 'Unable to fetch companies from database'}
            </Text>
          </YStack>
          <Button
            theme="blue"
            size="$5"
            onPress={() => window.location.reload()}
          >
            <Text fontSize="$5" fontWeight="700">Retry</Text>
          </Button>
        </YStack>
      </ClientOnly>
    )
  }

  return (
    <ClientOnly>
      <YStack
        width="100%"
        maxWidth={1800}
        marginHorizontal="auto"
        space="$6"
        paddingHorizontal="$6"
        paddingTop="$4"
        paddingBottom="$6"
        $xs={{
          padding: '$3',
          space: '$4',
          maxWidth: '100%',
        }}
        $sm={{
          padding: '$4',
          space: '$5',
          maxWidth: '100%',
        }}
        $md={{
          padding: '$5',
          space: '$5',
          maxWidth: 1200,
        }}
        $lg={{
          padding: '$6',
          space: '$6',
          maxWidth: 1400,
        }}
        $xl={{
          padding: '$6',
          space: '$6',
          maxWidth: 1600,
        }}
        $xxl={{
          padding: '$7',
          space: '$7',
          maxWidth: 1800,
        }}
      >
        {/* Compact Company Count + Sync Card */}
        <YStack
          padding="$4"
          borderRadius="$4"
          borderWidth={2}
          borderColor="rgba(170, 64, 255, 0.3)"
          backgroundColor="rgba(170, 64, 255, 0.08)"
          space="$3"
          $xs={{ padding: '$3', space: '$2' }}
          $sm={{ padding: '$3.5', space: '$2.5' }}
          $md={{ padding: '$4', space: '$3' }}
          $lg={{ padding: '$4.5', space: '$3' }}
          $xl={{ padding: '$5', space: '$3.5' }}
        >
          <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$3">
            <XStack alignItems="center" space="$3" flex={1}>
              <YStack
                width={48}
                height={48}
                borderRadius="$3"
                backgroundColor="rgba(170, 64, 255, 0.2)"
                justifyContent="center"
                alignItems="center"
                borderWidth={2}
                borderColor="rgba(170, 64, 255, 0.4)"
                $xs={{ width: 38, height: 38 }}
                $sm={{ width: 42, height: 42 }}
                $md={{ width: 48, height: 48 }}
                $lg={{ width: 52, height: 52 }}
                $xl={{ width: 56, height: 56 }}
              >
                <Building2
                  size={24}
                  color="#AA40FF"
                  strokeWidth={2.5}
                  style={{
                    width: 'clamp(18px, 4vw, 28px)',
                    height: 'clamp(18px, 4vw, 28px)',
                  }}
                />
              </YStack>
              <YStack space="$1">
                <Text
                  fontSize="$8"
                  fontWeight="800"
                  color="$color"
                  lineHeight={36}
                  $xs={{ fontSize: '$6', lineHeight: 28 }}
                  $sm={{ fontSize: '$7', lineHeight: 32 }}
                  $md={{ fontSize: '$8', lineHeight: 36 }}
                  $lg={{ fontSize: '$9', lineHeight: 40 }}
                  $xl={{ fontSize: '$10', lineHeight: 44 }}
                >
                  {companies.length.toLocaleString()}
                </Text>
                <Text
                  fontSize="$3"
                  fontWeight="600"
                  color="$color"
                  opacity={0.7}
                  $xs={{ fontSize: '$2' }}
                  $sm={{ fontSize: '$2' }}
                  $md={{ fontSize: '$3' }}
                  $lg={{ fontSize: '$4' }}
                  $xl={{ fontSize: '$4' }}
                >
                  Companies in Database
                </Text>
              </YStack>
            </XStack>
          </XStack>
        </YStack>

        {/* Navigation Cards - Responsive Grid */}
        <YStack
          space="$6"
          alignItems="center"
          width="100%"
          $xs={{ space: '$4' }}
          $sm={{ space: '$5' }}
          $md={{ space: '$5' }}
          $lg={{ space: '$6' }}
          $xl={{ space: '$6' }}
          $xxl={{ space: '$7' }}
        >
          {/* All screens: 2x2 Grid (except mobile: 1 column) */}
          <XStack
            flexWrap="wrap"
            justifyContent="center"
            width="100%"
            maxWidth={1200}
            gap="$6"
            $xs={{ flexDirection: 'column', gap: '$4' }}
            $sm={{ flexDirection: 'column', gap: '$4' }}
            $md={{ flexDirection: 'row', gap: '$5', flexWrap: 'wrap' }}
            $lg={{ flexDirection: 'row', gap: '$6', flexWrap: 'wrap' }}
            $xl={{ flexDirection: 'row', gap: '$6', flexWrap: 'wrap' }}
            $xxl={{ flexDirection: 'row', gap: '$6', flexWrap: 'wrap' }}
          >
            {/* Google Business Profile Connections */}
            <Card
              flexBasis="calc(50% - 12px)"
              minWidth={280}
              height={225}
              elevate
              bordered
              backgroundColor="$background"
              borderColor="rgba(59, 130, 246, 0.3)"
              borderWidth={2}
              borderRadius="$5"
              padding="$5"
              pressStyle={{ scale: 0.98 }}
              hoverStyle={{ borderColor: 'rgba(59, 130, 246, 0.5)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
              animation="quick"
              onPress={() => router.push('/gbp')}
              cursor="pointer"
              $xs={{
                padding: '$4',
                flexBasis: '100%',
                height: 180,
              }}
              $sm={{
                padding: '$4',
                flexBasis: '100%',
                height: 200,
              }}
              $md={{
                padding: '$4.5',
                flexBasis: 'calc(50% - 10px)',
                height: 220,
              }}
              $lg={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 225,
              }}
              $xl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 230,
              }}
              $xxl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 240,
              }}
            >
              <YStack flex={1} justifyContent="center" space="$3">
                <Text
                  fontSize="$6"
                  fontWeight="800"
                  color="$color"
                  lineHeight={32}
                  $xs={{ fontSize: '$5', lineHeight: 26 }}
                  $sm={{ fontSize: '$5', lineHeight: 28 }}
                  $md={{ fontSize: '$6', lineHeight: 30 }}
                  $lg={{ fontSize: '$6', lineHeight: 32 }}
                  $xl={{ fontSize: '$7', lineHeight: 34 }}
                  $xxl={{ fontSize: '$6', lineHeight: 32 }}
                >
                  Google Business Profiles
                </Text>
                <Text
                  fontSize="$4"
                  color="$color"
                  opacity={0.7}
                  lineHeight={24}
                  $xs={{ fontSize: '$3', lineHeight: 20 }}
                  $sm={{ fontSize: '$3', lineHeight: 22 }}
                  $md={{ fontSize: '$4', lineHeight: 24 }}
                  $lg={{ fontSize: '$4', lineHeight: 24 }}
                  $xl={{ fontSize: '$5', lineHeight: 26 }}
                  $xxl={{ fontSize: '$4', lineHeight: 24 }}
                >
                  Manage customer Google Business Profiles
                </Text>
              </YStack>
            </Card>

            {/* Companies Database */}
            <Card
              flexBasis="calc(50% - 12px)"
              minWidth={280}
              height={225}
              elevate
              bordered
              backgroundColor="$background"
              borderColor="rgba(59, 130, 246, 0.3)"
              borderWidth={2}
              borderRadius="$5"
              padding="$5"
              pressStyle={{ scale: 0.98 }}
              hoverStyle={{ borderColor: 'rgba(59, 130, 246, 0.5)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
              animation="quick"
              onPress={() => router.push('/companies')}
              cursor="pointer"
              $xs={{
                padding: '$4',
                flexBasis: '100%',
                height: 180,
              }}
              $sm={{
                padding: '$4',
                flexBasis: '100%',
                height: 200,
              }}
              $md={{
                padding: '$4.5',
                flexBasis: 'calc(50% - 10px)',
                height: 220,
              }}
              $lg={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 225,
              }}
              $xl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 230,
              }}
              $xxl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 240,
              }}
            >
              <YStack flex={1} justifyContent="center" space="$3">
                <Text
                  fontSize="$6"
                  fontWeight="800"
                  color="$color"
                  lineHeight={32}
                  $xs={{ fontSize: '$5', lineHeight: 26 }}
                  $sm={{ fontSize: '$5', lineHeight: 28 }}
                  $md={{ fontSize: '$6', lineHeight: 30 }}
                  $lg={{ fontSize: '$6', lineHeight: 32 }}
                  $xl={{ fontSize: '$7', lineHeight: 34 }}
                  $xxl={{ fontSize: '$6', lineHeight: 32 }}
                >
                  Company Database
                </Text>
                <Text
                  fontSize="$4"
                  color="$color"
                  opacity={0.7}
                  lineHeight={24}
                  $xs={{ fontSize: '$3', lineHeight: 20 }}
                  $sm={{ fontSize: '$3', lineHeight: 22 }}
                  $md={{ fontSize: '$4', lineHeight: 24 }}
                  $lg={{ fontSize: '$4', lineHeight: 24 }}
                  $xl={{ fontSize: '$5', lineHeight: 26 }}
                  $xxl={{ fontSize: '$4', lineHeight: 24 }}
                >
                  View and manage all companies from HubSpot
                </Text>
              </YStack>
            </Card>

            {/* Enriched Businesses */}
            <Card
              flexBasis="calc(50% - 12px)"
              minWidth={280}
              height={225}
              elevate
              bordered
              backgroundColor="$background"
              borderColor="rgba(20, 184, 166, 0.3)"
              borderWidth={2}
              borderRadius="$5"
              padding="$5"
              pressStyle={{ scale: 0.98 }}
              hoverStyle={{ borderColor: 'rgba(20, 184, 166, 0.5)', backgroundColor: 'rgba(20, 184, 166, 0.05)' }}
              animation="quick"
              onPress={() => router.push('/enriched')}
              cursor="pointer"
              $xs={{
                padding: '$4',
                flexBasis: '100%',
                height: 180,
              }}
              $sm={{
                padding: '$4',
                flexBasis: '100%',
                height: 200,
              }}
              $md={{
                padding: '$4.5',
                flexBasis: 'calc(50% - 10px)',
                height: 220,
              }}
              $lg={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 225,
              }}
              $xl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 230,
              }}
              $xxl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 240,
              }}
            >
              <YStack flex={1} justifyContent="center" space="$3">
                <Text
                  fontSize="$6"
                  fontWeight="800"
                  color="$color"
                  lineHeight={32}
                  $xs={{ fontSize: '$5', lineHeight: 26 }}
                  $sm={{ fontSize: '$5', lineHeight: 28 }}
                  $md={{ fontSize: '$6', lineHeight: 30 }}
                  $lg={{ fontSize: '$6', lineHeight: 32 }}
                  $xl={{ fontSize: '$7', lineHeight: 34 }}
                  $xxl={{ fontSize: '$6', lineHeight: 32 }}
                >
                  Enriched Businesses
                </Text>
                <Text
                  fontSize="$4"
                  color="$color"
                  opacity={0.7}
                  lineHeight={24}
                  $xs={{ fontSize: '$3', lineHeight: 20 }}
                  $sm={{ fontSize: '$3', lineHeight: 22 }}
                  $md={{ fontSize: '$4', lineHeight: 24 }}
                  $lg={{ fontSize: '$4', lineHeight: 24 }}
                  $xl={{ fontSize: '$5', lineHeight: 26 }}
                  $xxl={{ fontSize: '$4', lineHeight: 24 }}
                >
                  Rich data for directory submissions
                </Text>
              </YStack>
            </Card>

            {/* Settings */}
            <Card
              flexBasis="calc(50% - 12px)"
              minWidth={280}
              height={225}
              elevate
              bordered
              backgroundColor="$background"
              borderColor="rgba(16, 185, 129, 0.3)"
              borderWidth={2}
              borderRadius="$5"
              padding="$5"
              pressStyle={{ scale: 0.98 }}
              hoverStyle={{ borderColor: 'rgba(16, 185, 129, 0.5)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
              animation="quick"
              onPress={() => router.push('/settings')}
              cursor="pointer"
              $xs={{
                padding: '$4',
                flexBasis: '100%',
                height: 180,
              }}
              $sm={{
                padding: '$4',
                flexBasis: '100%',
                height: 200,
              }}
              $md={{
                padding: '$4.5',
                flexBasis: 'calc(50% - 10px)',
                height: 220,
              }}
              $lg={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 225,
              }}
              $xl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 230,
              }}
              $xxl={{
                padding: '$5',
                flexBasis: 'calc(50% - 12px)',
                height: 240,
              }}
            >
              <YStack flex={1} justifyContent="center" space="$3">
                <Text
                  fontSize="$6"
                  fontWeight="800"
                  color="$color"
                  lineHeight={32}
                  $xs={{ fontSize: '$5', lineHeight: 26 }}
                  $sm={{ fontSize: '$5', lineHeight: 28 }}
                  $md={{ fontSize: '$6', lineHeight: 30 }}
                  $lg={{ fontSize: '$6', lineHeight: 32 }}
                  $xl={{ fontSize: '$7', lineHeight: 34 }}
                  $xxl={{ fontSize: '$6', lineHeight: 32 }}
                >
                  Settings
                </Text>
                <Text
                  fontSize="$4"
                  color="$color"
                  opacity={0.7}
                  lineHeight={24}
                  $xs={{ fontSize: '$3', lineHeight: 20 }}
                  $sm={{ fontSize: '$3', lineHeight: 22 }}
                  $md={{ fontSize: '$4', lineHeight: 24 }}
                  $lg={{ fontSize: '$4', lineHeight: 24 }}
                  $xl={{ fontSize: '$5', lineHeight: 26 }}
                  $xxl={{ fontSize: '$4', lineHeight: 24 }}
                >
                  System status and API connections
                </Text>
              </YStack>
            </Card>
          </XStack>
        </YStack>
      </YStack>
    </ClientOnly>
  )
}
