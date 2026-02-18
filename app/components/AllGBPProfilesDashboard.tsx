// @ts-nocheck
/**
 * All GBP Profiles Dashboard
 *
 * Comprehensive dashboard showing ALL Google Business Profile data
 * that Zing has access to through the connected manager account.
 *
 * Features:
 * - Stats overview (total profiles, verified count, linked count)
 * - Search and filter capabilities
 * - Rich location cards with full business details
 * - Quick actions (view details, open maps, link to HubSpot)
 * - Responsive grid layout
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  YStack,
  XStack,
  Card,
  Text,
  Input,
  Button,
  Spinner,
  Separator,
} from 'tamagui';
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  AlertCircle,
  Search,
  RefreshCw,
  Link2,
  XCircle,
  ShieldCheck,
  Tag,
  Map,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { formatPhoneNumber } from '@/app/utils/formatters';

// Types
interface GBPLocation {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  phoneNumbers?: {
    primaryPhone?: string;
    additionalPhones?: string[];
  };
  websiteUri?: string;
  regularHours?: {
    periods?: {
      openDay: string;
      openTime: { hours?: number; minutes?: number };
      closeDay: string;
      closeTime: { hours?: number; minutes?: number };
    }[];
  };
  categories?: {
    primaryCategory?: {
      name: string;
      displayName: string;
    };
    additionalCategories?: {
      name: string;
      displayName: string;
    }[];
  };
  metadata?: {
    mapsUri?: string;
    newReviewUri?: string;
    placeId?: string;
    canDelete?: boolean;
    hasVoiceOfMerchant?: boolean;
  };
  profile?: {
    description?: string;
  };
  hubspot_contact_id?: string;
}

interface GBPAccount {
  name: string;
  accountName: string;
  type: 'PERSONAL' | 'LOCATION_GROUP' | 'USER_GROUP' | 'ORGANIZATION';
  verificationState?: 'VERIFIED' | 'UNVERIFIED' | 'VERIFICATION_REQUESTED';
  role?: string;
}

interface AllGBPProfilesDashboardProps {
  pipedreamAccountId: string;
  onLocationClick?: (location: GBPLocation) => void;
}

// Helper function to format address
const formatAddress = (address?: GBPLocation['storefrontAddress']): string => {
  if (!address) return 'No address available';

  const parts = [
    address.addressLines?.join(', '),
    address.locality,
    address.administrativeArea,
    address.postalCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address available';
};

// Helper to extract location ID from resource name
const extractLocationId = (name: string): string => {
  const parts = name.split('/');
  return parts[parts.length - 1];
};

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card
      flex={1}
      minWidth={140}
      padding="$4"
      backgroundColor={bgColor}
      borderRadius="$4"
      borderWidth={1}
      borderColor={`${color}30`}
    >
      <YStack space="$2">
        <XStack alignItems="center" space="$2">
          <Icon size={20} color={color} strokeWidth={2.5} />
          <Text fontSize="$3" color={color} opacity={0.9} fontWeight="600">
            {label}
          </Text>
        </XStack>
        <Text fontSize="$8" fontWeight="800" color={color}>
          {value}
        </Text>
      </YStack>
    </Card>
  );
}

// Location Card Component
function LocationCard({
  location,
  accountId,
  onViewDetails,
}: {
  location: GBPLocation;
  accountId: string;
  onViewDetails?: () => void;
}) {
  const locationId = extractLocationId(location.name);
  const hasAddress = location.storefrontAddress && (
    location.storefrontAddress.addressLines?.length ||
    location.storefrontAddress.locality
  );
  const isLinkedToHubSpot = !!location.hubspot_contact_id;

  return (
    <Card
      backgroundColor="$background"
      borderRadius="$5"
      borderWidth={2}
      borderColor="rgba(59, 130, 246, 0.15)"
      padding="$5"
      shadowColor="rgba(0, 0, 0, 0.1)"
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 2 }}
      hoverStyle={{
        borderColor: 'rgba(59, 130, 246, 0.4)',
        shadowRadius: 12,
        scale: 1.01,
      }}
      pressStyle={{
        scale: 0.99,
      }}
      animation="quick"
    >
      <YStack space="$4">
        {/* Header - Business Name & Category */}
        <YStack space="$2">
          <XStack alignItems="flex-start" justifyContent="space-between">
            <YStack flex={1} space="$1">
              <Text fontSize="$6" fontWeight="800" color="$color" numberOfLines={2}>
                {location.title || 'Untitled Business'}
              </Text>
              {location.categories?.primaryCategory && (
                <XStack alignItems="center" space="$2">
                  <Tag size={14} color="#8b5cf6" strokeWidth={2} />
                  <Text fontSize="$3" color="#8b5cf6" fontWeight="600">
                    {location.categories.primaryCategory.displayName}
                  </Text>
                </XStack>
              )}
            </YStack>

            {/* Verification Badge */}
            <YStack
              backgroundColor={isLinkedToHubSpot ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)'}
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$3"
              borderWidth={1}
              borderColor={isLinkedToHubSpot ? 'rgba(16, 185, 129, 0.3)' : 'rgba(156, 163, 175, 0.3)'}
            >
              <XStack alignItems="center" space="$1.5">
                {isLinkedToHubSpot ? (
                  <>
                    <Link2 size={12} color="#10b981" strokeWidth={2.5} />
                    <Text fontSize="$3" color="#10b981" fontWeight="700">
                      Linked
                    </Text>
                  </>
                ) : (
                  <>
                    <XCircle size={12} color="#9ca3af" strokeWidth={2} />
                    <Text fontSize="$3" color="#9ca3af" fontWeight="600">
                      Not Linked
                    </Text>
                  </>
                )}
              </XStack>
            </YStack>
          </XStack>
        </YStack>

        <Separator borderColor="rgba(59, 130, 246, 0.1)" />

        {/* Contact Information */}
        <YStack space="$3">
          {/* Address */}
          {hasAddress && (
            <XStack alignItems="flex-start" space="$3">
              <YStack
                width={32}
                height={32}
                borderRadius="$2"
                backgroundColor="rgba(59, 130, 246, 0.1)"
                justifyContent="center"
                alignItems="center"
              >
                <MapPin size={16} color="#3b82f6" strokeWidth={2} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$3" color="$color" opacity={0.6} fontWeight="600">
                  ADDRESS
                </Text>
                <Text fontSize="$3" color="$color" opacity={0.9} lineHeight={20}>
                  {formatAddress(location.storefrontAddress)}
                </Text>
              </YStack>
            </XStack>
          )}

          {/* Phone */}
          {location.phoneNumbers?.primaryPhone && (
            <XStack alignItems="flex-start" space="$3">
              <YStack
                width={32}
                height={32}
                borderRadius="$2"
                backgroundColor="rgba(16, 185, 129, 0.1)"
                justifyContent="center"
                alignItems="center"
              >
                <Phone size={16} color="#10b981" strokeWidth={2} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$3" color="$color" opacity={0.6} fontWeight="600">
                  PHONE
                </Text>
                <Text
                  fontSize="$3"
                  color="#10b981"
                  fontWeight="600"
                  cursor="pointer"
                  hoverStyle={{ textDecorationLine: 'underline' }}
                  onPress={() => window.open(`tel:${location.phoneNumbers?.primaryPhone}`, '_self')}
                >
                  {formatPhoneNumber(location.phoneNumbers.primaryPhone)}
                </Text>
              </YStack>
            </XStack>
          )}

          {/* Website */}
          {location.websiteUri && (
            <XStack alignItems="flex-start" space="$3">
              <YStack
                width={32}
                height={32}
                borderRadius="$2"
                backgroundColor="rgba(139, 92, 246, 0.1)"
                justifyContent="center"
                alignItems="center"
              >
                <Globe size={16} color="#8b5cf6" strokeWidth={2} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$3" color="$color" opacity={0.6} fontWeight="600">
                  WEBSITE
                </Text>
                <Text
                  fontSize="$3"
                  color="#8b5cf6"
                  fontWeight="600"
                  cursor="pointer"
                  numberOfLines={1}
                  hoverStyle={{ textDecorationLine: 'underline' }}
                  onPress={() => window.open(location.websiteUri, '_blank')}
                >
                  {location.websiteUri.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </Text>
              </YStack>
            </XStack>
          )}

          {/* Description Preview */}
          {location.profile?.description && (
            <YStack
              backgroundColor="rgba(59, 130, 246, 0.05)"
              padding="$3"
              borderRadius="$3"
              borderLeftWidth={3}
              borderLeftColor="rgba(59, 130, 246, 0.3)"
            >
              <Text fontSize="$3" color="$color" opacity={0.7} numberOfLines={2} lineHeight={18}>
                {location.profile.description}
              </Text>
            </YStack>
          )}
        </YStack>

        <Separator borderColor="rgba(59, 130, 246, 0.1)" />

        {/* Actions */}
        <XStack space="$3" flexWrap="wrap">
          <Link href={`/gbp/${accountId}/locations/${locationId}`} style={{ flex: 1 }}>
            <Button
              flex={1}
              size="$3"
              backgroundColor="$zingBlue"
              borderRadius="$3"
              fontWeight="700"
              hoverStyle={{ opacity: 0.9 }}
            >
              <XStack space="$2" alignItems="center">
                <Text color="white" fontWeight="700" fontSize="$3">
                  View Details
                </Text>
                <ChevronRight size={16} color="white" strokeWidth={2.5} />
              </XStack>
            </Button>
          </Link>

          {location.metadata?.mapsUri && (
            <Button
              size="$3"
              variant="outlined"
              borderColor="rgba(59, 130, 246, 0.3)"
              borderRadius="$3"
              onPress={() => window.open(location.metadata?.mapsUri, '_blank')}
              hoverStyle={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              }}
            >
              <XStack space="$2" alignItems="center">
                <Map size={16} color="#3b82f6" strokeWidth={2} />
                <Text color="#3b82f6" fontWeight="600" fontSize="$3">
                  Maps
                </Text>
              </XStack>
            </Button>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

// Main Dashboard Component
export default function AllGBPProfilesDashboard({
  pipedreamAccountId,
  onLocationClick,
}: AllGBPProfilesDashboardProps) {
  const [locations, setLocations] = useState<GBPLocation[]>([]);
  const [gbpAccount, setGbpAccount] = useState<GBPAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch locations
  const fetchLocations = async () => {
    if (!pipedreamAccountId) {
      setError('No account connected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Dashboard] Fetching locations for account:', pipedreamAccountId);

      const response = await fetch(`/api/gbp/${pipedreamAccountId}/locations`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch locations');
      }

      console.log('[Dashboard] Fetched', data.locations?.length || 0, 'locations');

      setLocations(data.locations || []);
      setGbpAccount(data.gbpAccount || null);
    } catch (err: any) {
      console.error('[Dashboard] Error fetching locations:', err);
      setError(err.message || 'Failed to load GBP profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [pipedreamAccountId]);

  // Filter locations by search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;

    const query = searchQuery.toLowerCase();
    return locations.filter((loc) => {
      const title = loc.title?.toLowerCase() || '';
      const category = loc.categories?.primaryCategory?.displayName?.toLowerCase() || '';
      const address = formatAddress(loc.storefrontAddress).toLowerCase();
      const phone = loc.phoneNumbers?.primaryPhone || '';

      return (
        title.includes(query) ||
        category.includes(query) ||
        address.includes(query) ||
        phone.includes(query)
      );
    });
  }, [locations, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = locations.length;
    const withAddress = locations.filter(
      (l) => l.storefrontAddress?.addressLines?.length || l.storefrontAddress?.locality
    ).length;
    const withPhone = locations.filter((l) => l.phoneNumbers?.primaryPhone).length;
    const linkedToHubSpot = locations.filter((l) => l.hubspot_contact_id).length;

    return { total, withAddress, withPhone, linkedToHubSpot };
  }, [locations]);

  // Loading state
  if (loading) {
    return (
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(59, 130, 246, 0.2)"
        padding="$8"
      >
        <YStack alignItems="center" space="$4">
          <Spinner size="large" color="#3b82f6" />
          <Text fontSize="$4" color="$color" opacity={0.7}>
            Loading GBP profiles...
          </Text>
        </YStack>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card
        backgroundColor="rgba(239, 68, 68, 0.05)"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(239, 68, 68, 0.2)"
        padding="$6"
      >
        <YStack space="$4" alignItems="center">
          <AlertCircle size={48} color="#ef4444" strokeWidth={1.5} />
          <Text fontSize="$5" fontWeight="700" color="#ef4444" textAlign="center">
            Failed to Load Profiles
          </Text>
          <Text fontSize="$3" color="$color" opacity={0.7} textAlign="center">
            {error}
          </Text>
          <Button
            backgroundColor="#ef4444"
            borderRadius="$3"
            onPress={fetchLocations}
            marginTop="$2"
          >
            <XStack space="$2" alignItems="center">
              <RefreshCw size={16} color="white" />
              <Text color="white" fontWeight="700">
                Try Again
              </Text>
            </XStack>
          </Button>
        </YStack>
      </Card>
    );
  }

  return (
    <YStack space="$5">
      {/* Account Info Banner */}
      {gbpAccount && (
        <Card
          backgroundColor="rgba(139, 92, 246, 0.08)"
          borderRadius="$4"
          borderWidth={1}
          borderColor="rgba(139, 92, 246, 0.2)"
          padding="$4"
        >
          <XStack alignItems="center" space="$3" flexWrap="wrap">
            <ShieldCheck size={24} color="#8b5cf6" strokeWidth={2} />
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="700" color="#8b5cf6">
                {gbpAccount.accountName}
              </Text>
              <XStack space="$3" flexWrap="wrap">
                <Text fontSize="$3" color="$color" opacity={0.7}>
                  Type: {gbpAccount.type}
                </Text>
                {gbpAccount.verificationState && (
                  <Text fontSize="$3" color="$color" opacity={0.7}>
                    • Status: {gbpAccount.verificationState}
                  </Text>
                )}
              </XStack>
            </YStack>
          </XStack>
        </Card>
      )}

      {/* Stats Row */}
      <XStack space="$3" flexWrap="wrap">
        <StatCard
          icon={Building2}
          label="Total Profiles"
          value={stats.total}
          color="#3b82f6"
          bgColor="rgba(59, 130, 246, 0.08)"
        />
        <StatCard
          icon={MapPin}
          label="With Address"
          value={stats.withAddress}
          color="#10b981"
          bgColor="rgba(16, 185, 129, 0.08)"
        />
        <StatCard
          icon={Phone}
          label="With Phone"
          value={stats.withPhone}
          color="#f59e0b"
          bgColor="rgba(245, 158, 11, 0.08)"
        />
        <StatCard
          icon={Link2}
          label="HubSpot Linked"
          value={stats.linkedToHubSpot}
          color="#8b5cf6"
          bgColor="rgba(139, 92, 246, 0.08)"
        />
      </XStack>

      {/* Search & Filter Bar */}
      <Card
        backgroundColor="$background"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(59, 130, 246, 0.15)"
        padding="$4"
      >
        <XStack alignItems="center" space="$3" flexWrap="wrap">
          <XStack
            flex={1}
            minWidth={250}
            alignItems="center"
            backgroundColor="$backgroundHover"
            borderRadius="$3"
            paddingHorizontal="$3"
            borderWidth={1}
            borderColor="rgba(59, 130, 246, 0.2)"
          >
            <Search size={18} color="#6b7280" strokeWidth={2} />
            <Input
              flex={1}
              placeholder="Search by name, category, address, or phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              backgroundColor="transparent"
              borderWidth={0}
              fontSize="$3"
              placeholderTextColor="#9ca3af"
            />
          </XStack>

          <XStack space="$2">
            <Button
              size="$3"
              variant={viewMode === 'grid' ? 'outlined' : undefined}
              backgroundColor={viewMode === 'grid' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
              borderColor={viewMode === 'grid' ? '#3b82f6' : 'transparent'}
              onPress={() => setViewMode('grid')}
              borderRadius="$2"
            >
              <LayoutGrid size={18} color={viewMode === 'grid' ? '#3b82f6' : '#9ca3af'} />
            </Button>
            <Button
              size="$3"
              variant={viewMode === 'list' ? 'outlined' : undefined}
              backgroundColor={viewMode === 'list' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
              borderColor={viewMode === 'list' ? '#3b82f6' : 'transparent'}
              onPress={() => setViewMode('list')}
              borderRadius="$2"
            >
              <List size={18} color={viewMode === 'list' ? '#3b82f6' : '#9ca3af'} />
            </Button>
          </XStack>

          <Button
            size="$3"
            backgroundColor="$zingBlue"
            borderRadius="$3"
            onPress={fetchLocations}
          >
            <XStack space="$2" alignItems="center">
              <RefreshCw size={16} color="white" strokeWidth={2.5} />
              <Text color="white" fontWeight="700" fontSize="$3">
                Refresh
              </Text>
            </XStack>
          </Button>
        </XStack>
      </Card>

      {/* Results Count */}
      {searchQuery && (
        <Text fontSize="$3" color="$color" opacity={0.7}>
          Showing {filteredLocations.length} of {locations.length} profiles
          {searchQuery && ` matching "${searchQuery}"`}
        </Text>
      )}

      {/* Locations Grid */}
      {filteredLocations.length === 0 ? (
        <Card
          backgroundColor="$background"
          borderRadius="$5"
          borderWidth={2}
          borderColor="rgba(59, 130, 246, 0.15)"
          padding="$8"
        >
          <YStack alignItems="center" space="$4">
            <Building2 size={48} color="#9ca3af" strokeWidth={1.5} />
            <Text fontSize="$5" fontWeight="600" color="$color" opacity={0.7} textAlign="center">
              {searchQuery ? 'No profiles match your search' : 'No GBP profiles found'}
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.5} textAlign="center">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Connect your Google Business Profile to get started'}
            </Text>
          </YStack>
        </Card>
      ) : (
        <YStack
          space="$4"
          $gtSm={{
            flexDirection: viewMode === 'grid' ? 'row' : 'column',
            flexWrap: 'wrap',
          }}
        >
          {filteredLocations.map((location) => (
            <YStack
              key={location.name}
              $gtSm={{
                width: viewMode === 'grid' ? '48%' : '100%',
              }}
              $gtMd={{
                width: viewMode === 'grid' ? '31.5%' : '100%',
              }}
            >
              <LocationCard
                location={location}
                accountId={pipedreamAccountId}
                onViewDetails={() => onLocationClick?.(location)}
              />
            </YStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}
