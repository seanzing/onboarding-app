// @ts-nocheck
/**
 * GBP Locations List Page
 *
 * Displays all Google Business Profile locations for a connected account.
 * Click on a location to view/edit details.
 */

'use client';

import { useParams } from 'next/navigation';
import { MapPin, Phone, Globe, ExternalLink, AlertCircle } from 'lucide-react';
import {
  YStack,
  XStack,
  Card,
  Text,
  H1,
  H2,
  Button,
  Spinner,
} from 'tamagui';
import { useGBPLocations } from '@/app/hooks/useGBPLocations';
import Link from 'next/link';

export default function GBPLocationsPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const { locations, loading, error, warning, accountInfo, refetch } = useGBPLocations(accountId);

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Spinner size="large" color="$color" />
        <Text marginTop="$4" color="$color" opacity={0.7}>
          Loading locations...
        </Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Card
          size="$4"
          bordered
          padding="$4"
          backgroundColor="$red2"
          borderColor="$red6"
          maxWidth={600}
        >
          <XStack alignItems="center" gap="$3">
            <AlertCircle size={24} color="$red10" />
            <YStack flex={1}>
              <Text fontSize="$5" fontWeight="600" color="$red11">
                Failed to Load Locations
              </Text>
              <Text fontSize="$3" color="$red11" marginTop="$2">
                {error}
              </Text>
            </YStack>
          </XStack>
          <Button
            marginTop="$4"
            onPress={refetch}
            backgroundColor="$red10"
            color="white"
          >
            Try Again
          </Button>
        </Card>
      </YStack>
    );
  }

  return (
    <YStack
      flex={1}
      padding="$6"
      gap="$4"
      maxWidth={1200}
      marginHorizontal="auto"
      width="100%"
      $sm={{
        padding: '$4',
        gap: '$3',
      }}
      $md={{
        padding: '$5',
      }}
    >
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
        <YStack gap="$2" flex={1} minWidth={200}>
          <H1
            fontSize="$9"
            color="$color"
            $sm={{
              fontSize: '$7',
            }}
            $md={{
              fontSize: '$8',
            }}
          >
            Google Business Profile Locations
          </H1>
          <Text
            fontSize="$4"
            color="$color"
            opacity={0.7}
            $sm={{
              fontSize: '$3',
            }}
          >
            Manage your business listings on Google Maps and Search
          </Text>
        </YStack>
        <Link href={`/gbp/${accountId}/locations/new`} passHref>
          <Button
            size="$4"
            backgroundColor="$zingPurple"
            color="white"
            fontWeight="600"
            paddingHorizontal="$6"
            $sm={{
              size: '$3',
              paddingHorizontal: '$4',
            }}
          >
            + New Location
          </Button>
        </Link>
      </XStack>

      {/* Account Info Card (when available) */}
      {accountInfo && (
        <Card
          size="$4"
          bordered
          padding="$4"
          backgroundColor="$purple2"
          borderColor="$purple6"
          $sm={{
            padding: '$3',
          }}
        >
          <YStack gap="$2" $sm={{ gap: '$1.5' }}>
            <Text fontSize="$5" fontWeight="600" color="$purple11" $sm={{ fontSize: '$4' }}>
              Google Business Account
            </Text>
            <XStack gap="$4" flexWrap="wrap" $sm={{ gap: '$3' }}>
              <YStack gap="$1" minWidth={120}>
                <Text fontSize="$2" color="$purple11" opacity={0.7} $sm={{ fontSize: '$1' }}>
                  Account Name
                </Text>
                <Text fontSize="$3" color="$purple11" fontWeight="600" $sm={{ fontSize: '$2' }}>
                  {accountInfo.accountName || 'N/A'}
                </Text>
              </YStack>
              <YStack gap="$1" minWidth={120}>
                <Text fontSize="$2" color="$purple11" opacity={0.7} $sm={{ fontSize: '$1' }}>
                  Account Type
                </Text>
                <Text fontSize="$3" color="$purple11" fontWeight="600" $sm={{ fontSize: '$2' }}>
                  {accountInfo.type || 'N/A'}
                </Text>
              </YStack>
              <YStack gap="$1" minWidth={120}>
                <Text fontSize="$2" color="$purple11" opacity={0.7} $sm={{ fontSize: '$1' }}>
                  Verification Status
                </Text>
                <Text fontSize="$3" color="$purple11" fontWeight="600" $sm={{ fontSize: '$2' }}>
                  {accountInfo.verificationState || 'N/A'}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Warning Card (when locations can't be fetched) */}
      {warning && (
        <Card
          size="$4"
          bordered
          padding="$4"
          backgroundColor="$yellow2"
          borderColor="$yellow6"
          $sm={{
            padding: '$3',
          }}
        >
          <XStack alignItems="flex-start" gap="$3">
            <AlertCircle size={24} color="$yellow10" style={{ flexShrink: 0, marginTop: 2 }} />
            <YStack flex={1} gap="$2" $sm={{ gap: '$1.5' }}>
              <Text fontSize="$5" fontWeight="600" color="$yellow11" $sm={{ fontSize: '$4' }}>
                {warning.message}
              </Text>
              <Text fontSize="$3" color="$yellow11" $sm={{ fontSize: '$2' }}>
                {warning.reason}
              </Text>
              {warning.verificationState === 'UNVERIFIED' && (
                <Button
                  marginTop="$2"
                  size="$3"
                  backgroundColor="$yellow10"
                  color="white"
                  onPress={() => window.open('https://business.google.com', '_blank')}
                  iconAfter={<ExternalLink size={14} />}
                  alignSelf="flex-start"
                  $sm={{
                    size: '$2',
                    paddingHorizontal: '$3',
                  }}
                >
                  Verify Account on Google
                </Button>
              )}
            </YStack>
          </XStack>
        </Card>
      )}

      {/* Locations Count */}
      <Card
        size="$4"
        bordered
        padding="$4"
        backgroundColor="$blue2"
        borderColor="$blue6"
        $sm={{
          padding: '$3',
        }}
      >
        <Text fontSize="$4" color="$blue11" fontWeight="600" $sm={{ fontSize: '$3' }}>
          {locations.length} location{locations.length !== 1 ? 's' : ''} found
        </Text>
      </Card>

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <Card
          size="$4"
          bordered
          padding="$6"
          alignItems="center"
          $sm={{
            padding: '$4',
          }}
        >
          <Text fontSize="$5" color="$color" textAlign="center" $sm={{ fontSize: '$4' }}>
            No locations found for this account.
          </Text>
          <Text fontSize="$3" color="$color" opacity={0.7} marginTop="$2" textAlign="center" $sm={{ fontSize: '$2' }}>
            Create a business profile on Google Business Profile to get started.
          </Text>
        </Card>
      ) : (
        <YStack gap="$4" $sm={{ gap: '$3' }}>
          {locations.map((location) => {
            // Extract location ID from name (e.g., "locations/ChIJxxx" → "ChIJxxx")
            const locationId = location.name?.split('/').pop() || '';
            const address = location.storefrontAddress;
            const phone = location.phoneNumbers?.primaryPhone;
            const website = location.websiteUri;

            return (
              <Card
                key={location.name}
                size="$4"
                bordered
                padding="$4"
                hoverStyle={{
                  borderColor: '$zingPurple',
                  scale: 1.01,
                }}
                animation="quick"
              >
                <YStack gap="$3">
                  {/* Title */}
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack gap="$1" flex={1}>
                      <H2 fontSize="$7" color="$color">
                        {location.title || 'Untitled Location'}
                      </H2>
                      {location.categories?.primaryCategory && (
                        <Text fontSize="$3" color="$color" opacity={0.7}>
                          {location.categories.primaryCategory.displayName}
                        </Text>
                      )}
                    </YStack>
                    <Link href={`/gbp/${accountId}/locations/${locationId}`} passHref>
                      <Button
                        size="$3"
                        backgroundColor="$zingPurple"
                        color="white"
                        iconAfter={<ExternalLink size={16} />}
                      >
                        View/Edit
                      </Button>
                    </Link>
                  </XStack>

                  {/* Contact Info */}
                  <YStack gap="$2">
                    {address && (
                      <XStack gap="$2" alignItems="flex-start">
                        <MapPin size={18} color="$color" style={{ flexShrink: 0, marginTop: 2 }} />
                        <Text fontSize="$3" color="$color" flex={1}>
                          {[
                            address.addressLines?.join(', '),
                            address.locality,
                            address.administrativeArea,
                            address.postalCode,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      </XStack>
                    )}

                    {phone && (
                      <XStack gap="$2" alignItems="center">
                        <Phone size={18} color="$color" style={{ flexShrink: 0 }} />
                        <Text fontSize="$3" color="$color">
                          {phone}
                        </Text>
                      </XStack>
                    )}

                    {website && (
                      <XStack gap="$2" alignItems="center">
                        <Globe size={18} color="$color" style={{ flexShrink: 0 }} />
                        <Text
                          fontSize="$3"
                          color="$zingPurple"
                          textDecorationLine="underline"
                          onPress={() => window.open(website, '_blank')}
                          cursor="pointer"
                        >
                          {website}
                        </Text>
                      </XStack>
                    )}
                  </YStack>

                  {/* Maps Link */}
                  {location.metadata?.mapsUri && (
                    <XStack>
                      <Button
                        size="$2"
                        variant="outlined"
                        borderColor="$gray8"
                        color="$color"
                        onPress={() => window.open(location.metadata?.mapsUri, '_blank')}
                        iconAfter={<ExternalLink size={14} />}
                      >
                        View on Google Maps
                      </Button>
                    </XStack>
                  )}
                </YStack>
              </Card>
            );
          })}
        </YStack>
      )}
    </YStack>
  );
}
