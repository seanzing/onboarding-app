/**
 * Places Search Card Component
 *
 * Allows searching for ANY business on Google Maps using the Places API.
 * Perfect for prospect research and pre-client lookup.
 *
 * Uses the existing usePlacesSearch hook and /api/places/search endpoint.
 */

'use client';

import { useState, useCallback } from 'react';
import { YStack, XStack, Card, Text, Input, Button, Spinner, ScrollView, Separator } from 'tamagui';
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  Building2,
  ExternalLink,
  AlertCircle,
  X,
  Navigation,
} from 'lucide-react';
import { usePlacesSearch, type PlacesSearchResult } from '@/app/hooks/usePlacesSearch';

interface PlacesSearchCardProps {
  onSelectBusiness?: (business: PlacesSearchResult) => void;
}

/**
 * Business Result Card - Displays a single search result
 */
function BusinessResultCard({
  business,
  onSelect,
}: {
  business: PlacesSearchResult;
  onSelect?: () => void;
}) {
  return (
    <Card
      backgroundColor="$background"
      borderRadius="$4"
      borderWidth={1}
      borderColor="rgba(59, 130, 246, 0.2)"
      padding="$4"
      hoverStyle={{
        borderColor: 'rgba(59, 130, 246, 0.5)',
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
      }}
      pressStyle={{
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
      }}
      cursor="pointer"
      onPress={onSelect}
    >
      <YStack space="$3">
        {/* Header */}
        <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
          <YStack flex={1} space="$1">
            <XStack alignItems="center" space="$2">
              <Building2 size={18} color="#3b82f6" strokeWidth={2} />
              <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={1}>
                {business.name}
              </Text>
            </XStack>
            {business.category && (
              <Text fontSize="$2" color="#8b5cf6" fontWeight="600">
                {business.category}
              </Text>
            )}
          </YStack>

          {/* Rating */}
          {business.rating && (
            <XStack
              backgroundColor="rgba(245, 158, 11, 0.1)"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              alignItems="center"
              space="$1"
            >
              <Star size={14} fill="#f59e0b" color="#f59e0b" strokeWidth={0} />
              <Text fontSize="$3" fontWeight="700" color="#f59e0b">
                {business.rating.toFixed(1)}
              </Text>
              {business.totalReviews && (
                <Text fontSize="$2" color="#f59e0b" opacity={0.7}>
                  ({business.totalReviews})
                </Text>
              )}
            </XStack>
          )}
        </XStack>

        {/* Address */}
        {business.address && (
          <XStack alignItems="flex-start" space="$2">
            <MapPin size={14} color="#6b7280" strokeWidth={2} style={{ marginTop: 2 }} />
            <Text fontSize="$3" color="$color" opacity={0.7} flex={1} numberOfLines={2}>
              {business.address}
            </Text>
          </XStack>
        )}

        {/* Contact Info Row */}
        <XStack flexWrap="wrap" gap="$3">
          {business.phone && (
            <XStack alignItems="center" space="$1">
              <Phone size={12} color="#6b7280" strokeWidth={2} />
              <Text fontSize="$2" color="$color" opacity={0.7}>
                {business.phone}
              </Text>
            </XStack>
          )}
          {business.website && (
            <XStack alignItems="center" space="$1">
              <Globe size={12} color="#3b82f6" strokeWidth={2} />
              <Text
                fontSize="$2"
                color="#3b82f6"
                numberOfLines={1}
                onPress={(e) => {
                  e.stopPropagation();
                  window.open(business.website, '_blank');
                }}
                cursor="pointer"
              >
                {business.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)}
                {business.website.length > 40 ? '...' : ''}
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Status & Actions */}
        <XStack justifyContent="space-between" alignItems="center">
          {/* Business Status */}
          {business.businessStatus && (
            <XStack
              backgroundColor={
                business.businessStatus === 'OPERATIONAL'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)'
              }
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text
                fontSize="$2"
                fontWeight="600"
                color={business.businessStatus === 'OPERATIONAL' ? '#10b981' : '#ef4444'}
              >
                {business.businessStatus === 'OPERATIONAL' ? 'Open' : business.businessStatus}
              </Text>
            </XStack>
          )}

          {/* View on Maps Link */}
          {business.googleMapsUrl && (
            <XStack
              alignItems="center"
              space="$1"
              opacity={0.7}
              hoverStyle={{ opacity: 1 }}
              cursor="pointer"
              onPress={(e) => {
                e.stopPropagation();
                window.open(business.googleMapsUrl, '_blank');
              }}
            >
              <Navigation size={12} color="#3b82f6" strokeWidth={2} />
              <Text fontSize="$2" color="#3b82f6" fontWeight="600">
                View on Maps
              </Text>
              <ExternalLink size={10} color="#3b82f6" strokeWidth={2} />
            </XStack>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

/**
 * PlacesSearchCard - Main search card component
 */
export default function PlacesSearchCard({ onSelectBusiness }: PlacesSearchCardProps) {
  const { search, results, loading, error, clear } = usePlacesSearch();
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setHasSearched(true);
    await search(query.trim());
  }, [query, search]);

  const handleClear = useCallback(() => {
    setQuery('');
    setHasSearched(false);
    clear();
  }, [clear]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <Card
      backgroundColor="$background"
      borderRadius="$5"
      borderWidth={2}
      borderColor="rgba(16, 185, 129, 0.2)"
      padding="$5"
      shadowColor="rgba(0, 0, 0, 0.08)"
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 2 }}
    >
      <YStack space="$4">
        {/* Header */}
        <XStack alignItems="center" space="$3">
          <YStack
            width={48}
            height={48}
            borderRadius="$4"
            backgroundColor="rgba(16, 185, 129, 0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(16, 185, 129, 0.3)"
          >
            <Search size={24} color="#10b981" strokeWidth={2} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$5" fontWeight="800" color="$color">
              Business Lookup
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              Search any business on Google Maps
            </Text>
          </YStack>
        </XStack>

        <Separator borderColor="rgba(16, 185, 129, 0.15)" />

        {/* Search Input */}
        <XStack space="$3" alignItems="center">
          <XStack
            flex={1}
            backgroundColor="$backgroundHover"
            borderRadius="$3"
            borderWidth={1}
            borderColor="rgba(16, 185, 129, 0.2)"
            paddingHorizontal="$3"
            alignItems="center"
          >
            <Search size={18} color="#6b7280" strokeWidth={2} />
            <Input
              flex={1}
              placeholder="Search by name, type, or location..."
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={setQuery}
              onKeyPress={handleKeyPress as any}
              backgroundColor="transparent"
              borderWidth={0}
              fontSize="$4"
              paddingVertical="$3"
            />
            {query && (
              <X
                size={18}
                color="#6b7280"
                strokeWidth={2}
                cursor="pointer"
                onClick={handleClear}
              />
            )}
          </XStack>
          <Button
            backgroundColor="#10b981"
            borderRadius="$3"
            onPress={handleSearch}
            disabled={loading || !query.trim()}
            opacity={loading || !query.trim() ? 0.6 : 1}
          >
            {loading ? (
              <Spinner size="small" color="white" />
            ) : (
              <XStack space="$2" alignItems="center">
                <Search size={16} color="white" strokeWidth={2} />
                <Text color="white" fontWeight="700">
                  Search
                </Text>
              </XStack>
            )}
          </Button>
        </XStack>

        {/* Search Tips */}
        {!hasSearched && (
          <YStack
            backgroundColor="rgba(16, 185, 129, 0.08)"
            padding="$3"
            borderRadius="$3"
          >
            <Text fontSize="$3" color="#10b981" fontWeight="600" marginBottom="$2">
              Search Tips:
            </Text>
            <YStack space="$1">
              <Text fontSize="$2" color="$color" opacity={0.7}>
                &bull; Include city/state for better results: "Route36 Portland OR"
              </Text>
              <Text fontSize="$2" color="$color" opacity={0.7}>
                &bull; Search by business type: "plumbers near Denver"
              </Text>
              <Text fontSize="$2" color="$color" opacity={0.7}>
                &bull; Use specific names for exact matches
              </Text>
            </YStack>
          </YStack>
        )}

        {/* Error State */}
        {error && (
          <Card
            backgroundColor="rgba(239, 68, 68, 0.08)"
            borderRadius="$4"
            borderWidth={1}
            borderColor="rgba(239, 68, 68, 0.2)"
            padding="$4"
          >
            <XStack space="$3" alignItems="center">
              <AlertCircle size={24} color="#ef4444" strokeWidth={2} />
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="700" color="#ef4444">
                  Search Failed
                </Text>
                <Text fontSize="$3" color="$color" opacity={0.7}>
                  {error}
                </Text>
              </YStack>
            </XStack>
          </Card>
        )}

        {/* Results */}
        {hasSearched && !loading && !error && (
          <YStack space="$3">
            {/* Results Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$4" fontWeight="700" color="$color">
                Results ({results.length})
              </Text>
              {results.length > 0 && (
                <Text fontSize="$2" color="$color" opacity={0.5}>
                  Click to select
                </Text>
              )}
            </XStack>

            {/* No Results */}
            {results.length === 0 && (
              <Card
                backgroundColor="rgba(245, 158, 11, 0.08)"
                borderRadius="$4"
                borderWidth={1}
                borderColor="rgba(245, 158, 11, 0.2)"
                borderStyle="dashed"
                padding="$5"
              >
                <YStack alignItems="center" space="$3">
                  <Search size={32} color="#f59e0b" strokeWidth={1.5} />
                  <YStack alignItems="center" space="$1">
                    <Text fontSize="$4" fontWeight="700" color="#f59e0b">
                      No Businesses Found
                    </Text>
                    <Text fontSize="$3" color="$color" opacity={0.6} textAlign="center">
                      Try a different search term or add location details
                    </Text>
                  </YStack>
                </YStack>
              </Card>
            )}

            {/* Results List */}
            {results.length > 0 && (
              <ScrollView maxHeight={500} showsVerticalScrollIndicator>
                <YStack space="$3">
                  {results.map((business) => (
                    <BusinessResultCard
                      key={business.placeId}
                      business={business}
                      onSelect={() => onSelectBusiness?.(business)}
                    />
                  ))}
                </YStack>
              </ScrollView>
            )}
          </YStack>
        )}

        {/* Loading State */}
        {loading && (
          <YStack alignItems="center" padding="$6" space="$3">
            <Spinner size="large" color="#10b981" />
            <Text fontSize="$3" color="$color" opacity={0.6}>
              Searching Google Maps...
            </Text>
          </YStack>
        )}
      </YStack>
    </Card>
  );
}
