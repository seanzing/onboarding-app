// @ts-nocheck
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { YStack, XStack, Text, Button, Input } from 'tamagui'
import { ChevronLeft, ChevronRight, Database, RefreshCw } from 'lucide-react'
import { useCompanies } from '../hooks/useCompanies'
import {
  CompaniesTable,
  EmptyState,
  ErrorState,
  LoadingState,
  type CompanyData,
} from '../components/tamagui'
import ClientOnly from '../components/ClientOnly'
import { getCompanyDisplayName, getCompanySubtitle } from '../utils/companyNameHelper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Companies List Page - Professional Tamagui version
 *
 * Features:
 * - Search by name, location, or ID
 * - Professional table display with pagination
 * - Tamagui components throughout
 * - Consistent styling with dashboard
 */
const ITEMS_PER_PAGE = 20

export default function CompaniesPage() {
  const router = useRouter()
  const { companies, loading, error } = useCompanies()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Handle row click with instant loading feedback
  const handleRowClick = useCallback((company: CompanyData) => {
    setNavigatingTo(company.id) // Show loading overlay IMMEDIATELY
    router.push(`/companies/${company.id}`)
  }, [router])

  // Transform companies to table data and sort alphabetically by name
  const allTableData: CompanyData[] = useMemo(() => {
    const data = companies.map((company) => {
      // Handle date properly
      let lastSync = 'Never'
      if (company.updatedAt) {
        const date = new Date(company.updatedAt)
        const isValidDate = !isNaN(date.getTime()) && date.getFullYear() > 1970
        if (isValidDate) {
          lastSync = date.toLocaleDateString()
        }
      }

      return {
        id: company.id,
        name: getCompanyDisplayName(
          company.properties.company,
          company.properties.website,
          company.id,
          company.properties.firstname,
          company.properties.lastname,
          company.properties.email
        ),
        location: getCompanySubtitle(
          company.properties.website,
          company.properties.city,
          company.properties.state
        ) || 'N/A',
        lastSync,
        locationCount: 1,
      }
    })

    // Sort alphabetically by name (A-Z) - sorting happens here BEFORE pagination
    return data.sort((a, b) => a.name.localeCompare(b.name))
  }, [companies])

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return allTableData
    }

    const query = searchQuery.toLowerCase().trim()
    return allTableData.filter((company) => {
      return (
        company.name.toLowerCase().includes(query) ||
        (company.location && company.location.toLowerCase().includes(query)) ||
        company.id.toLowerCase().includes(query)
      )
    })
  }, [allTableData, searchQuery])

  // Paginate data
  const displayedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage])

  // Calculate pagination info
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE - 1, filteredData.length)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Loading state
  if (loading) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh">
          <LoadingState
            title="Loading companies..."
            description="Fetching all contacts from database"
          />
        </YStack>
      </ClientOnly>
    )
  }

  // Error state
  if (error) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh">
          <ErrorState
            error={error}
            title="Failed to load companies"
            onRetry={() => window.location.reload()}
          />
        </YStack>
      </ClientOnly>
    )
  }

  return (
    <ClientOnly>
      <YStack
        width="100%"
        maxWidth="100%"
        space="$6"
        padding="$6"
        $sm={{ padding: '$4', space: '$5' }}
        $md={{ padding: '$5', space: '$6' }}
        $gtLg={{ padding: '$7', space: '$7' }}
      >
        {/* Header */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
            <YStack gap="$2" flex={1}>
              <XStack alignItems="center" gap="$3">
                <YStack
                  width={52}
                  height={52}
                  borderRadius="$4"
                  backgroundColor="rgba(59, 130, 246, 0.15)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Database size={26} color="#3B82F6" />
                </YStack>
                <YStack>
                  <Text fontSize="$4" color="$color" opacity={0.7}>
                    Customer contacts from your database
                  </Text>
                </YStack>
              </XStack>
            </YStack>
            <Button
              size="$4"
              backgroundColor="rgba(59, 130, 246, 0.2)"
              borderColor="#3B82F6"
              borderWidth={1}
              onPress={() => window.location.reload()}
              icon={<RefreshCw size={18} color="#3B82F6" />}
              hoverStyle={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }}
            >
              <Text color="#3B82F6" fontWeight="600">
                Refresh
              </Text>
            </Button>
          </XStack>
        </YStack>

        {/* Search Bar - Enhanced */}
        <XStack
          width="100%"
          maxWidth={600}
          alignItems="center"
          gap="$3"
          backgroundColor="rgba(30, 40, 71, 0.5)"
          borderRadius="$5"
          borderWidth={1}
          borderColor="rgba(59, 130, 246, 0.3)"
          paddingHorizontal="$4"
          paddingVertical="$3.5"
          shadowColor="rgba(59, 130, 246, 0.1)"
          shadowRadius={4}
          shadowOffset={{ width: 0, height: 2 }}
          animation="quick"
          hoverStyle={{
            borderColor: 'rgba(59, 130, 246, 0.5)',
            backgroundColor: 'rgba(30, 40, 71, 0.7)',
          }}
          $sm={{
            maxWidth: '100%',
          }}
        >
          <Input
            flex={1}
            placeholder="Search companies by name, location, or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            backgroundColor="transparent"
            borderWidth={0}
            fontSize="$4"
            color="$color"
            paddingHorizontal={0}
            paddingVertical={0}
            height={28}
            $sm={{
              fontSize: '$3',
            }}
          />
          {searchQuery && (
            <Text
              fontSize="$3"
              color="$color"
              opacity={0.5}
              cursor="pointer"
              onPress={() => setSearchQuery('')}
              fontWeight="600"
              hoverStyle={{
                opacity: 0.8,
              }}
            >
              ✕
            </Text>
          )}
        </XStack>

        {/* Companies Table */}
        {filteredData.length > 0 ? (
          <YStack space="$4">
            {/* Pagination Info */}
            <XStack
              justifyContent="flex-start"
              alignItems="center"
              paddingVertical="$3"
            >
              <Text color="$color" opacity={0.7} fontSize="$3" fontWeight="600">
                Showing {startIndex}-{endIndex} of {filteredData.length} companies
              </Text>
            </XStack>

            <CompaniesTable
              companies={displayedData}
              onRowClick={handleRowClick}
              navigatingTo={navigatingTo}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <XStack justifyContent="center" alignItems="center" gap="$3" paddingVertical="$4" flexWrap="wrap">
                <Button
                  size="$3"
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!hasPrevPage}
                  backgroundColor="rgba(59, 130, 246, 0.1)"
                  borderWidth={1}
                  borderColor="rgba(59, 130, 246, 0.3)"
                  color="$zingBlue"
                  fontWeight="700"
                  fontSize={13}
                  paddingHorizontal={20}
                  height={38}
                  borderRadius="$4"
                  opacity={hasPrevPage ? 1 : 0.5}
                  animation="quick"
                  hoverStyle={hasPrevPage ? {
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    scale: 1.03,
                  } : {}}
                  pressStyle={hasPrevPage ? {
                    scale: 0.97,
                  } : {}}
                  icon={<ChevronLeft size={16} />}
                >
                  <Text color="$zingBlue" fontWeight="700" fontSize={13}>
                    Previous
                  </Text>
                </Button>

                <Text color="$color" fontWeight="600" fontSize="$4">
                  Page {currentPage} of {totalPages}
                </Text>

                <Button
                  size="$3"
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={!hasNextPage}
                  backgroundColor="rgba(59, 130, 246, 0.1)"
                  borderWidth={1}
                  borderColor="rgba(59, 130, 246, 0.3)"
                  color="$zingBlue"
                  fontWeight="700"
                  fontSize={13}
                  paddingHorizontal={20}
                  height={38}
                  borderRadius="$4"
                  opacity={hasNextPage ? 1 : 0.5}
                  animation="quick"
                  hoverStyle={hasNextPage ? {
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    scale: 1.03,
                  } : {}}
                  pressStyle={hasNextPage ? {
                    scale: 0.97,
                  } : {}}
                  iconAfter={<ChevronRight size={16} />}
                >
                  <Text color="$zingBlue" fontWeight="700" fontSize={13}>
                    Next
                  </Text>
                </Button>
              </XStack>
            )}
          </YStack>
        ) : (
          <EmptyState
            title={searchQuery ? 'No matching companies' : 'No companies found'}
            description={
              searchQuery
                ? `No companies match "${searchQuery}". Try a different search term.`
                : 'No contacts found in the database.'
            }
            action={
              searchQuery
                ? {
                    label: 'Clear Search',
                    onClick: () => setSearchQuery(''),
                  }
                : undefined
            }
          />
        )}
      </YStack>
    </ClientOnly>
  )
}
