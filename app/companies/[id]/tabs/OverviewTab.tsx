// @ts-nocheck
'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Card, Separator, Stack, Spinner } from 'tamagui'
import { Phone, Globe, MapPin, Building2 } from 'lucide-react'
import { useGBPConnection } from '@/app/hooks/useGBPConnection'
import ConnectGBPButton from '@/app/components/ConnectGBPButton'
import { formatPhoneNumber } from '@/app/utils/formatters'
import type { CustomerOnboarding } from '@/app/types/onboarding'
import OnboardingStatusBar from './OnboardingStatusBar'
import IdentityPanel from './IdentityPanel'

interface OverviewTabProps {
  company: any
  displayName: string
  hubspotObjectId: string
  onboarding: CustomerOnboarding | null
  onboardingLoading: boolean
  onRefreshOnboarding: () => void
}

export default function OverviewTab({
  company,
  displayName,
  hubspotObjectId,
  onboarding,
  onboardingLoading,
  onRefreshOnboarding,
}: OverviewTabProps) {
  const { connection: gbpConnection, loading: gbpLoading, refetch: refetchGBP, isConnected } = useGBPConnection(hubspotObjectId)
  const hasAddress = company.properties.city || company.properties.state || company.properties.zip || company.properties.country

  return (
    <YStack gap="$6">
      {/* Onboarding Status Bar */}
      <OnboardingStatusBar onboarding={onboarding} loading={onboardingLoading} />

      <XStack
        gap={24}
        $sm={{ flexDirection: 'column' }}
        $md={{ flexDirection: 'row' }}
        alignItems="flex-start"
      >
        {/* Left Column - Company Information */}
        <YStack flex={2} gap="$6">
          {/* Company Information Card */}
          <Card
            elevate
            bordered
            backgroundColor="$background"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={12}
            shadowColor="$shadowColor"
            shadowRadius={2}
            shadowOffset={{ width: 0, height: 1 }}
            padding="$6"
          >
            <YStack gap="$6">
              <Text fontSize={18} fontWeight="600" color="$color">
                Company Information
              </Text>

              {/* Contact Information */}
              <YStack gap="$4">
                <Text fontSize={13} fontWeight="600" color="$color" opacity={0.7} textTransform="uppercase" letterSpacing={0.8}>
                  Contact Information
                </Text>
                <YStack gap="$3">
                  {company.properties.phone && (
                    <XStack gap={12} alignItems="center">
                      <Stack width={32} height={32} borderRadius={16} backgroundColor="$backgroundHover" justifyContent="center" alignItems="center">
                        <Phone size={16} color="#3B82F6" strokeWidth={2} />
                      </Stack>
                      <YStack flex={1}>
                        <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Phone</Text>
                        <Text fontSize={14} color="$color" fontWeight="500">{formatPhoneNumber(company.properties.phone)}</Text>
                      </YStack>
                    </XStack>
                  )}

                  {company.properties.website && (
                    <XStack gap={12} alignItems="center">
                      <Stack width={32} height={32} borderRadius={16} backgroundColor="$backgroundHover" justifyContent="center" alignItems="center">
                        <Globe size={16} color="#3B82F6" strokeWidth={2} />
                      </Stack>
                      <YStack flex={1}>
                        <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Website</Text>
                        <Text fontSize={14} color="$color" fontWeight="500">{company.properties.website}</Text>
                      </YStack>
                    </XStack>
                  )}

                  {!company.properties.phone && !company.properties.website && (
                    <Text fontSize={13} color="$color" opacity={0.5} textAlign="center" paddingVertical="$4">
                      No contact information available
                    </Text>
                  )}
                </YStack>
              </YStack>

              {/* Address */}
              {hasAddress && (
                <>
                  <Separator borderColor="$borderColor" />
                  <YStack gap="$4">
                    <Text fontSize={13} fontWeight="600" color="$color" opacity={0.7} textTransform="uppercase" letterSpacing={0.8}>
                      Address
                    </Text>
                    <XStack gap={12} alignItems="flex-start">
                      <Stack width={32} height={32} borderRadius={16} backgroundColor="$backgroundHover" justifyContent="center" alignItems="center">
                        <MapPin size={16} color="#3B82F6" strokeWidth={2} />
                      </Stack>
                      <YStack flex={1}>
                        <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Location</Text>
                        <YStack gap="$1">
                          {company.properties.address && <Text fontSize={14} color="$color" fontWeight="500">{company.properties.address}</Text>}
                          <Text fontSize={14} color="$color" fontWeight="500">
                            {company.properties.city}{company.properties.city && company.properties.state && ', '}{company.properties.state} {company.properties.zip}
                          </Text>
                          {company.properties.country && <Text fontSize={14} color="$color" fontWeight="500">{company.properties.country}</Text>}
                        </YStack>
                      </YStack>
                    </XStack>
                  </YStack>
                </>
              )}
            </YStack>
          </Card>

          {/* Service Identifiers */}
          <IdentityPanel
            contactId={hubspotObjectId}
            identity={onboarding?.identity ?? null}
            onUpdate={onRefreshOnboarding}
          />
        </YStack>

        {/* Right Column - Details & GBP Connection */}
        <YStack flex={1} gap="$6" minWidth={280}>
          {/* Google Business Profile Connection Card */}
          <Card
            elevate
            bordered
            backgroundColor="$background"
            borderColor={isConnected ? 'rgba(16, 185, 129, 0.3)' : '$borderColor'}
            borderWidth={1}
            borderRadius={12}
            shadowColor="$shadowColor"
            shadowRadius={2}
            shadowOffset={{ width: 0, height: 1 }}
            padding="$6"
          >
            <YStack gap="$5">
              <Text fontSize={18} fontWeight="600" color="$color">
                Google Business Profile
              </Text>

              {gbpLoading ? (
                <YStack alignItems="center" paddingVertical="$4">
                  <Spinner size="small" color="$zingBlue" />
                  <Text fontSize={12} color="$color" opacity={0.6} marginTop="$2">
                    Checking connection...
                  </Text>
                </YStack>
              ) : isConnected && gbpConnection ? (
                <YStack gap="$4">
                  <XStack gap={12} alignItems="center">
                    <Stack
                      width={32}
                      height={32}
                      borderRadius={16}
                      backgroundColor="rgba(16, 185, 129, 0.1)"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Building2 size={16} color="#10b981" strokeWidth={2} />
                    </Stack>
                    <YStack flex={1}>
                      <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Status</Text>
                      <Text fontSize={14} color="#10b981" fontWeight="600">Connected</Text>
                    </YStack>
                  </XStack>

                  <Separator borderColor="$borderColor" />

                  {gbpConnection.account_name && (
                    <YStack gap="$1">
                      <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Account Name</Text>
                      <Text fontSize={13} color="$color" fontWeight="500">{gbpConnection.account_name}</Text>
                    </YStack>
                  )}

                  {gbpConnection.account_email && (
                    <>
                      <Separator borderColor="$borderColor" />
                      <YStack gap="$1">
                        <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Account Email</Text>
                        <Text fontSize={13} color="$color" fontWeight="500">{gbpConnection.account_email}</Text>
                      </YStack>
                    </>
                  )}

                  <Separator borderColor="$borderColor" />

                  <YStack gap="$1">
                    <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Connected</Text>
                    <Text fontSize={13} color="$color" fontWeight="500">
                      {new Date(gbpConnection.created_at).toLocaleDateString()}
                    </Text>
                  </YStack>
                </YStack>
              ) : (
                <YStack gap="$4">
                  <Text fontSize={13} color="$color" opacity={0.7} textAlign="center" paddingVertical="$3">
                    No Google Business Profile connected yet
                  </Text>
                  <ConnectGBPButton
                    hubspotObjectId={hubspotObjectId}
                    companyName={displayName}
                    onSuccess={() => refetchGBP()}
                    onError={(error) => console.error('[OverviewTab] GBP error:', error)}
                  />
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Details Card */}
          <Card
            elevate
            bordered
            backgroundColor="$background"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={12}
            shadowColor="$shadowColor"
            shadowRadius={2}
            shadowOffset={{ width: 0, height: 1 }}
            padding="$6"
          >
            <YStack gap="$5">
              <Text fontSize={18} fontWeight="600" color="$color">
                Details
              </Text>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Created</Text>
                  <Text fontSize={13} color="$color" fontWeight="500">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </Text>
                </YStack>
                <Separator borderColor="$borderColor" />
                <YStack gap="$1">
                  <Text fontSize={13} color="$color" opacity={0.6} fontWeight="500">Last Updated</Text>
                  <Text fontSize={13} color="$color" fontWeight="500">
                    {new Date(company.updatedAt).toLocaleDateString()}
                  </Text>
                </YStack>
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </XStack>
    </YStack>
  )
}
