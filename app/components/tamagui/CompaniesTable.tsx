// @ts-nocheck
'use client'

import { useState, useMemo } from 'react'
import { Card, YStack, XStack, Text, Separator, Stack, useMedia, Spinner } from 'tamagui'
import { ArrowUpDown, ArrowUp, ArrowDown, Building2 } from 'lucide-react'
import { NoDataYet } from './StateComponents'

// ============================================================
// TYPES
// ============================================================

export interface CompanyData {
  id: string
  name: string
  email?: string
  phone?: string
  city?: string
  state?: string
  location?: string
  lastSync?: string
}

export interface CompaniesTableProps {
  companies: CompanyData[]
  onRowClick?: (company: CompanyData) => void
  onSync?: (companyId: string) => void
  onView?: (companyId: string) => void
  onEdit?: (companyId: string) => void
  showActions?: boolean
  /** ID of company currently being navigated to - shows loading state on that row */
  navigatingTo?: string | null
}

type SortField = 'name' | 'location' | 'lastSync'
type SortDirection = 'asc' | 'desc'

// ============================================================
// HELPERS
// ============================================================

/**
 * Format phone number to US format: (555) 123-4567
 */
function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * Sortable Column Header
 */
function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
  width,
  align = 'center',
}: {
  label: string
  field: SortField
  currentSort: SortField
  currentDirection: SortDirection
  onSort: (field: SortField) => void
  width: string
  align?: 'left' | 'center' | 'right'
}) {
  const isActive = currentSort === field

  return (
    <YStack
      width={width}
      minWidth={0}
      maxWidth={width}
      justifyContent="center"
      alignItems={align}
      cursor="pointer"
      onPress={() => onSort(field)}
      hoverStyle={{ opacity: 0.8 }}
      pressStyle={{ opacity: 0.6 }}
    >
      <XStack alignItems="center" gap="$1.5">
        <Text
          fontSize="$3"
          fontWeight="700"
          color={isActive ? '#3B82F6' : '$color'}
          opacity={isActive ? 1 : 0.7}
          textTransform="uppercase"
          letterSpacing={1}
          textAlign={align}
        >
          {label}
        </Text>
        {isActive ? (
          currentDirection === 'asc' ? (
            <ArrowUp size={14} color="#3B82F6" strokeWidth={2.5} />
          ) : (
            <ArrowDown size={14} color="#3B82F6" strokeWidth={2.5} />
          )
        ) : (
          <ArrowUpDown size={14} color="currentColor" opacity={0.4} strokeWidth={2} />
        )}
      </XStack>
    </YStack>
  )
}

/**
 * Mobile Card View
 */
function CompanyCard({
  company,
  onRowClick,
  isNavigating,
}: {
  company: CompanyData
  onRowClick?: (company: CompanyData) => void
  isNavigating?: boolean
}) {
  const formattedPhone = formatPhoneNumber(company.phone)

  return (
    <Stack
      width="100%"
      maxWidth="100%"
      padding="$4"
      $sm={{ padding: '$5' }}
      cursor={isNavigating ? 'wait' : 'pointer'}
      onPress={() => !isNavigating && onRowClick?.(company)}
      hoverStyle={isNavigating ? {} : {
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(59, 130, 246, 0.6)',
      }}
      pressStyle={isNavigating ? {} : {
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
      }}
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      animation="quick"
      backgroundColor={isNavigating ? 'rgba(59, 130, 246, 0.12)' : 'transparent'}
      borderLeftWidth={isNavigating ? 3 : 0}
      borderLeftColor={isNavigating ? '#3B82F6' : 'transparent'}
      position="relative"
    >
      {/* Loading Overlay for Mobile */}
      {isNavigating && (
        <XStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(59, 130, 246, 0.08)"
          justifyContent="center"
          alignItems="center"
          zIndex={10}
        >
          <XStack alignItems="center" gap="$2">
            <Spinner size="small" color="#3B82F6" />
            <Text fontSize="$3" color="#3B82F6" fontWeight="600">
              Loading...
            </Text>
          </XStack>
        </XStack>
      )}
      <YStack space="$3">
        {/* Company Name */}
        <Text
          fontSize="$5"
          $sm={{ fontSize: '$6' }}
          fontWeight="700"
          color="$color"
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {company.name}
        </Text>

        {/* Info Grid */}
        <XStack flexWrap="wrap" gap="$4">
          {/* Location */}
          {company.location && (
            <YStack space="$1" minWidth={100}>
              <Text
                fontSize="$2"
                color="$color"
                opacity={0.5}
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                Location
              </Text>
              <Text fontSize="$3" color="$color" opacity={0.85} fontWeight="500">
                {company.location}
              </Text>
            </YStack>
          )}

          {/* Phone */}
          {formattedPhone && (
            <YStack space="$1" minWidth={120}>
              <Text
                fontSize="$2"
                color="$color"
                opacity={0.5}
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                Phone
              </Text>
              <Text fontSize="$3" color="$color" opacity={0.85} fontWeight="500">
                {formattedPhone}
              </Text>
            </YStack>
          )}

          {/* Last Sync */}
          <YStack space="$1" minWidth={100}>
            <Text
              fontSize="$2"
              color="$color"
              opacity={0.5}
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              Last Sync
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.85} fontWeight="500">
              {company.lastSync || 'Never'}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </Stack>
  )
}

/**
 * Desktop Table Header
 */
function TableHeader({
  sortField,
  sortDirection,
  onSort,
}: {
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}) {
  return (
    <XStack
      paddingHorizontal={20}
      paddingVertical={16}
      backgroundColor="$backgroundStrong"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      width="100%"
      alignItems="center"
    >
      <SortableHeader
        label="Company"
        field="name"
        currentSort={sortField}
        currentDirection={sortDirection}
        onSort={onSort}
        width="45%"
        align="left"
      />
      <SortableHeader
        label="Location"
        field="location"
        currentSort={sortField}
        currentDirection={sortDirection}
        onSort={onSort}
        width="30%"
        align="center"
      />
      <SortableHeader
        label="Last Sync"
        field="lastSync"
        currentSort={sortField}
        currentDirection={sortDirection}
        onSort={onSort}
        width="25%"
        align="center"
      />
    </XStack>
  )
}

/**
 * Desktop Table Row
 */
function TableRow({
  company,
  onRowClick,
  isNavigating,
}: {
  company: CompanyData
  onRowClick?: (company: CompanyData) => void
  isNavigating?: boolean
}) {
  return (
    <>
      <Stack
        paddingHorizontal={20}
        paddingVertical={18}
        cursor={isNavigating ? 'wait' : 'pointer'}
        onPress={() => !isNavigating && onRowClick?.(company)}
        hoverStyle={isNavigating ? {} : {
          backgroundColor: 'rgba(59, 130, 246, 0.06)',
          borderLeftWidth: 3,
          borderLeftColor: 'rgba(59, 130, 246, 0.5)',
        }}
        pressStyle={isNavigating ? {} : {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        }}
        animation="quick"
        backgroundColor={isNavigating ? 'rgba(59, 130, 246, 0.12)' : 'transparent'}
        borderLeftWidth={isNavigating ? 3 : 0}
        borderLeftColor={isNavigating ? '#3B82F6' : 'transparent'}
        position="relative"
      >
        {/* Loading Overlay */}
        {isNavigating && (
          <XStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(59, 130, 246, 0.08)"
            justifyContent="flex-end"
            alignItems="center"
            paddingRight={20}
            zIndex={10}
          >
            <XStack alignItems="center" gap="$2">
              <Spinner size="small" color="#3B82F6" />
              <Text fontSize="$3" color="#3B82F6" fontWeight="600">
                Loading...
              </Text>
            </XStack>
          </XStack>
        )}

        <XStack alignItems="center" width="100%" opacity={isNavigating ? 0.5 : 1}>
          {/* Company Name */}
          <YStack width="45%" minWidth={0} maxWidth="45%" justifyContent="center" alignItems="flex-start">
            <Text
              fontSize="$4"
              fontWeight="600"
              color="$color"
              numberOfLines={1}
              ellipsizeMode="tail"
              width="100%"
            >
              {company.name}
            </Text>
            {company.email && (
              <Text
                fontSize="$2"
                color="$color"
                opacity={0.5}
                numberOfLines={1}
                ellipsizeMode="tail"
                width="100%"
              >
                {company.email}
              </Text>
            )}
          </YStack>

          {/* Location */}
          <YStack width="30%" minWidth={0} maxWidth="30%" justifyContent="center" alignItems="center">
            <Text
              fontSize="$3"
              color="$color"
              opacity={0.8}
              textAlign="center"
              numberOfLines={1}
            >
              {company.location || '—'}
            </Text>
          </YStack>

          {/* Last Sync */}
          <YStack width="25%" minWidth={0} maxWidth="25%" justifyContent="center" alignItems="center">
            <Text
              fontSize="$3"
              color="$color"
              opacity={0.7}
              textAlign="center"
              numberOfLines={1}
            >
              {company.lastSync || 'Never'}
            </Text>
          </YStack>
        </XStack>
      </Stack>
      <Separator borderColor="$borderColor" />
    </>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CompaniesTable({ companies, onRowClick, navigatingTo }: CompaniesTableProps) {
  const media = useMedia()
  const isMobile = !media.gtMd

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort companies
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'location':
          comparison = (a.location || '').localeCompare(b.location || '')
          break
        case 'lastSync':
          // Sort by date - "Never" should come last
          const dateA = a.lastSync === 'Never' ? '0000-00-00' : a.lastSync || '0000-00-00'
          const dateB = b.lastSync === 'Never' ? '0000-00-00' : b.lastSync || '0000-00-00'
          comparison = dateA.localeCompare(dateB)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [companies, sortField, sortDirection])

  // Empty state
  if (companies.length === 0) {
    return (
      <NoDataYet
        icon={<Building2 size={36} color="#3B82F6" strokeWidth={1.5} />}
        title="No Companies Found"
        description="Companies from HubSpot will appear here once synced. Make sure your HubSpot integration is connected."
        variant="info"
      />
    )
  }

  return (
    <Card
      elevate
      bordered
      backgroundColor="$background"
      borderColor="rgba(59, 130, 246, 0.2)"
      borderWidth={1}
      borderRadius={12}
      shadowColor="rgba(59, 130, 246, 0.1)"
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 2 }}
      padding={0}
      overflow="hidden"
      width="100%"
      maxWidth="100%"
    >
      {isMobile ? (
        // Mobile Card View
        <YStack>
          {sortedCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onRowClick={onRowClick}
              isNavigating={navigatingTo === company.id}
            />
          ))}
        </YStack>
      ) : (
        // Desktop Table View
        <YStack width="100%">
          <TableHeader
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <YStack width="100%">
            {sortedCompanies.map((company) => (
              <TableRow
                key={company.id}
                company={company}
                onRowClick={onRowClick}
                isNavigating={navigatingTo === company.id}
              />
            ))}
          </YStack>
        </YStack>
      )}
    </Card>
  )
}
