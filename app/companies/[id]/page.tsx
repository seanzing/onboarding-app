// @ts-nocheck
'use client'

import { use, useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { YStack, XStack, Text, Button, Card, Tabs, AnimatePresence, Spinner } from 'tamagui'
import { ArrowLeft, Edit, Building2, MapPin, Bot, FileText, Globe } from 'lucide-react'
import { useCompanies } from '../../hooks/useCompanies'
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus'
import { EmptyState, ErrorState, LoadingState } from '../../components/tamagui'
import ClientOnly from '../../components/ClientOnly'
import { getCompanyDisplayName } from '../../utils/companyNameHelper'
import OverviewTab from './tabs/OverviewTab'
import FoursquareTab from './tabs/FoursquareTab'
import ChatbotTab from './tabs/ChatbotTab'
import BlogsTab from './tabs/BlogsTab'
import LandingPagesTab from './tabs/LandingPagesTab'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>
}

// Tab configuration with colors
const TABS = [
  { value: 'overview', label: 'Overview', icon: Building2, color: '#3B82F6', bgActive: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { value: 'foursquare', label: 'Foursquare', icon: MapPin, color: '#A855F7', bgActive: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)' },
  { value: 'chatbot', label: 'Chatbot', icon: Bot, color: '#00AEFF', bgActive: 'rgba(0,174,255,0.1)', border: 'rgba(0,174,255,0.3)' },
  { value: 'blogs', label: 'Blogs', icon: FileText, color: '#E95614', bgActive: 'rgba(233,86,20,0.1)', border: 'rgba(233,86,20,0.3)' },
  { value: 'landing-pages', label: 'Landing Pages', icon: Globe, color: '#10B981', bgActive: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
]

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { companies, loading, error, refetch } = useCompanies()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [hasSynced, setHasSynced] = useState(false)
  const [navigatingToEdit, setNavigatingToEdit] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Find the company by ID
  const company = useMemo(() => {
    return companies.find((c) =>
      c.hs_object_id === resolvedParams.id || c.id === resolvedParams.id
    )
  }, [companies, resolvedParams.id])

  const hubspotObjectId = company?.hs_object_id || resolvedParams.id

  // Onboarding status hook
  const {
    onboarding,
    loading: onboardingLoading,
    refetch: refetchOnboarding,
  } = useOnboardingStatus(hubspotObjectId)

  // Sync data from HubSpot when page loads
  useEffect(() => {
    const syncFromHubSpot = async () => {
      if (hasSynced || isSyncing) return

      try {
        setIsSyncing(true)
        setSyncError(null)

        const response = await fetch(`/api/hubspot/contacts/${resolvedParams.id}/sync`)
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.message || 'Failed to sync from HubSpot')
        }

        if (refetch) await refetch()
        setHasSynced(true)
      } catch (err: any) {
        console.error('[CompanyDetail] Sync error:', err)
        setSyncError(err.message)
        setHasSynced(true)
      } finally {
        setIsSyncing(false)
      }
    }

    if (!loading && !hasSynced) {
      syncFromHubSpot()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id, loading])

  // Loading state
  if (loading || isSyncing || !hasSynced) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh">
          <LoadingState
            title={isSyncing ? "Syncing from HubSpot..." : "Loading company..."}
            description={isSyncing ? "Fetching latest data from HubSpot" : "Loading company details"}
          />
        </YStack>
      </ClientOnly>
    )
  }

  if (error) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh">
          <ErrorState error={error} title="Failed to load company" onRetry={() => window.location.reload()} />
        </YStack>
      </ClientOnly>
    )
  }

  if (!company) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh">
          <EmptyState
            title="Company not found"
            description="The company you're looking for doesn't exist or has been removed."
            action={{ label: 'Back to Companies', onClick: () => router.push('/companies') }}
          />
        </YStack>
      </ClientOnly>
    )
  }

  const displayName = getCompanyDisplayName(
    company.properties.company,
    company.properties.website,
    company.id,
    company.properties.firstname,
    company.properties.lastname,
    company.properties.email
  )

  return (
    <ClientOnly>
      <YStack
        width="100%"
        maxWidth="100%"
        gap="$6"
        padding="$6"
        $sm={{ padding: '$4', gap: '$5' }}
        $md={{ padding: '$5', gap: '$6' }}
        $gtLg={{ padding: '$7', gap: '$7' }}
      >
        {/* Breadcrumb Navigation */}
        <XStack gap={8} alignItems="center">
          <Text
            fontSize={13}
            color="$color"
            opacity={0.6}
            cursor="pointer"
            onPress={() => router.push('/companies')}
            hoverStyle={{ opacity: 1 }}
          >
            Companies
          </Text>
          <Text fontSize={13} color="$color" opacity={0.4}>/</Text>
          <Text fontSize={13} color="$color" fontWeight="600">
            {displayName}
          </Text>
        </XStack>

        {/* Page Header */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack gap="$2" flex={1}>
              <Text fontSize={28} fontWeight="700" color="$color">
                {displayName}
              </Text>
              {company.properties.website && (
                <Text fontSize={14} color="$color" opacity={0.6}>
                  {company.properties.website}
                </Text>
              )}
            </YStack>

            <XStack gap={8}>
              <Button
                size="$4"
                onPress={() => {
                  setNavigatingToEdit(true)
                  router.push(`/companies/${company.id}/edit`)
                }}
                disabled={navigatingToEdit}
                backgroundColor="$zingBlue"
                borderWidth={0}
                color="white"
                fontWeight="600"
                fontSize={14}
                paddingHorizontal={16}
                height={36}
                opacity={navigatingToEdit ? 0.7 : 1}
                hoverStyle={navigatingToEdit ? {} : { opacity: 0.9 }}
                pressStyle={navigatingToEdit ? {} : { opacity: 0.8 }}
              >
                <XStack gap={8} alignItems="center">
                  {navigatingToEdit ? (
                    <Spinner size="small" color="white" />
                  ) : (
                    <Edit size={16} color="white" strokeWidth={2} />
                  )}
                  <Text color="white" fontWeight="600" fontSize={14}>
                    {navigatingToEdit ? 'Loading...' : 'Edit Properties'}
                  </Text>
                </XStack>
              </Button>

              <Button
                size="$4"
                onPress={() => router.push('/companies')}
                backgroundColor="$background"
                borderWidth={1}
                borderColor="$borderColor"
                color="$color"
                fontWeight="600"
                fontSize={14}
                paddingHorizontal={16}
                height={36}
                hoverStyle={{ backgroundColor: '$backgroundHover', borderColor: '$borderColorHover' }}
                pressStyle={{ opacity: 0.8 }}
              >
                <XStack gap={8} alignItems="center">
                  <ArrowLeft size={16} color="currentColor" strokeWidth={2} />
                  <Text color="$color" fontWeight="600" fontSize={14}>Back</Text>
                </XStack>
              </Button>
            </XStack>
          </XStack>
        </YStack>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="horizontal"
          flexDirection="column"
          width="100%"
        >
          <Card
            backgroundColor="$background"
            borderRadius="$5"
            borderWidth={1}
            borderColor="rgba(0, 0, 0, 0.08)"
            padding="$2"
            marginBottom="$5"
            shadowColor="rgba(0, 0, 0, 0.03)"
            shadowRadius={8}
            shadowOffset={{ width: 0, height: 2 }}
          >
            <Tabs.List backgroundColor="transparent" borderRadius="$4">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.value
                return (
                  <Tabs.Tab
                    key={tab.value}
                    flex={1}
                    value={tab.value}
                    backgroundColor={isActive ? tab.bgActive : 'transparent'}
                    borderRadius="$4"
                    paddingVertical="$3"
                    borderWidth={isActive ? 2 : 0}
                    borderColor={tab.border}
                    hoverStyle={{ backgroundColor: isActive ? tab.bgActive : 'rgba(0, 0, 0, 0.03)' }}
                  >
                    <XStack gap="$2" alignItems="center" justifyContent="center">
                      <Icon size={18} color={isActive ? tab.color : '#6b7280'} strokeWidth={2} />
                      <Text fontWeight="700" color={isActive ? tab.color : '$color'} fontSize="$3" $sm={{ display: 'none' }}>
                        {tab.label}
                      </Text>
                    </XStack>
                  </Tabs.Tab>
                )
              })}
            </Tabs.List>
          </Card>

          {/* Tab Content */}
          <AnimatePresence>
            <Tabs.Content
              value="overview"
              animation="quick"
              enterStyle={{ opacity: 0, y: 10 }}
              exitStyle={{ opacity: 0, y: -10 }}
            >
              <OverviewTab
                company={company}
                displayName={displayName}
                hubspotObjectId={hubspotObjectId}
                onboarding={onboarding}
                onboardingLoading={onboardingLoading}
                onRefreshOnboarding={refetchOnboarding}
              />
            </Tabs.Content>

            <Tabs.Content
              value="foursquare"
              animation="quick"
              enterStyle={{ opacity: 0, y: 10 }}
              exitStyle={{ opacity: 0, y: -10 }}
            >
              <FoursquareTab
                contactId={hubspotObjectId}
                foursquareVenueId={onboarding?.identity?.foursquare_venue_id ?? null}
                company={company}
                serviceStatus={onboarding?.services?.foursquare}
                onRefresh={refetchOnboarding}
              />
            </Tabs.Content>

            <Tabs.Content
              value="chatbot"
              animation="quick"
              enterStyle={{ opacity: 0, y: 10 }}
              exitStyle={{ opacity: 0, y: -10 }}
            >
              <ChatbotTab
                contactId={hubspotObjectId}
                chatbotSlug={onboarding?.identity?.chatbot_slug ?? null}
                serviceStatus={onboarding?.services?.chatbot}
                onRefresh={refetchOnboarding}
              />
            </Tabs.Content>

            <Tabs.Content
              value="blogs"
              animation="quick"
              enterStyle={{ opacity: 0, y: 10 }}
              exitStyle={{ opacity: 0, y: -10 }}
            >
              <BlogsTab
                contactId={hubspotObjectId}
                dudaSiteCode={onboarding?.identity?.duda_site_code ?? null}
                serviceStatus={onboarding?.services?.blogs}
                onRefresh={refetchOnboarding}
              />
            </Tabs.Content>

            <Tabs.Content
              value="landing-pages"
              animation="quick"
              enterStyle={{ opacity: 0, y: 10 }}
              exitStyle={{ opacity: 0, y: -10 }}
            >
              <LandingPagesTab
                contactId={hubspotObjectId}
                dudaSiteCode={onboarding?.identity?.duda_site_code ?? null}
                serviceStatus={onboarding?.services?.landing_pages}
                onRefresh={refetchOnboarding}
              />
            </Tabs.Content>
          </AnimatePresence>
        </Tabs>
      </YStack>
    </ClientOnly>
  )
}
