/**
 * Related Profiles Component
 *
 * Displays cross-links to all related profiles for a company/contact
 * Uses hubspot_contact_id as the universal identifier
 */

'use client';

import { useEffect, useState } from 'react';
import { YStack, XStack, Card, Text, Spinner } from 'tamagui';
import { Building2, MapPin, ExternalLink, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RelatedProfilesData {
  hubspot_contact_id: string;
  contact: {
    id: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    email?: string;
  } | null;
  client: {
    id: string;
    name?: string;
    business_name?: string;
  } | null;
  enriched_business: {
    id: string;
    business_name?: string;
    city?: string;
    state?: string;
  } | null;
  brightlocal_locations: Array<{
    id: string;
    business_name?: string;
  }>;
  counts: {
    contact: number;
    client: number;
    enriched: number;
    brightlocal: number;
    total: number;
  };
}

interface RelatedProfilesProps {
  hubspotContactId: string | null;
  currentPage?: 'hubspot' | 'brightlocal' | 'gbp' | 'admin';
}

export function RelatedProfiles({ hubspotContactId, currentPage }: RelatedProfilesProps) {
  const router = useRouter();
  const [data, setData] = useState<RelatedProfilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelatedProfiles() {
      if (!hubspotContactId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/profiles/related?hubspot_contact_id=${hubspotContactId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch related profiles');
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        console.error('[RelatedProfiles] Error:', err);
        setError(err.message || 'Failed to load related profiles');
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedProfiles();
  }, [hubspotContactId]);

  if (!hubspotContactId) {
    return null;
  }

  if (loading) {
    return (
      <Card
        size="$4"
        bordered
        padding="$5"
        backgroundColor="rgba(168, 85, 247, 0.03)"
        borderColor="rgba(168, 85, 247, 0.2)"
      >
        <XStack gap="$3" alignItems="center">
          <Spinner size="small" color="rgba(168, 85, 247, 0.9)" />
          <Text fontSize="$4" color="$color">
            Loading related profiles...
          </Text>
        </XStack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        size="$4"
        bordered
        padding="$5"
        backgroundColor="rgba(239, 68, 68, 0.05)"
        borderColor="rgba(239, 68, 68, 0.2)"
      >
        <Text fontSize="$4" color="#DC2626">
          {error}
        </Text>
      </Card>
    );
  }

  if (!data || data.counts.total === 0) {
    return null;
  }

  // Don't show if only the current page's profile exists
  if (
    (currentPage === 'hubspot' && data.counts.total === 1 && data.contact) ||
    (currentPage === 'brightlocal' && data.counts.total === 1 && data.counts.brightlocal === 1)
  ) {
    return null;
  }

  return (
    <Card
      size="$4"
      bordered
      padding="$6"
      backgroundColor="rgba(168, 85, 247, 0.05)"
      borderColor="rgba(168, 85, 247, 0.3)"
      borderTopWidth={3}
      $sm={{
        padding: '$5',
      }}
    >
      <YStack gap="$5">
        <XStack alignItems="center" gap="$3">
          <ExternalLink size={24} color="rgba(168, 85, 247, 0.9)" />
          <YStack gap="$1">
            <Text fontSize="$7" fontWeight="700" color="$color">
              Related Profiles
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              View this company on other platforms
            </Text>
          </YStack>
        </XStack>

        <YStack gap="$3">
          {/* HubSpot Contact */}
          {data.contact && currentPage !== 'hubspot' && (
            <XStack
              gap="$3"
              alignItems="center"
              padding="$3"
              borderRadius="$3"
              backgroundColor="rgba(0, 0, 0, 0.02)"
              hoverStyle={{
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
              }}
              cursor="pointer"
              onPress={() => {
                const hubspotUrl = `https://app.hubspot.com/contacts/${data.hubspot_contact_id}`;
                window.open(hubspotUrl, '_blank');
              }}
            >
              <Building2 size={20} color="rgba(168, 85, 247, 0.9)" />
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="600" color="$color">
                  HubSpot Contact
                </Text>
                <Text fontSize="$3" color="$color" opacity={0.7}>
                  {data.contact.company ||
                    `${data.contact.firstname || ''} ${data.contact.lastname || ''}`.trim() ||
                    'View in HubSpot'}
                </Text>
              </YStack>
              <ExternalLink size={16} color="rgba(168, 85, 247, 0.7)" />
            </XStack>
          )}

          {/* BrightLocal Locations */}
          {data.brightlocal_locations.length > 0 && currentPage !== 'brightlocal' && (
            <>
              {data.brightlocal_locations.map((location) => (
                <XStack
                  key={location.id}
                  gap="$3"
                  alignItems="center"
                  padding="$3"
                  borderRadius="$3"
                  backgroundColor="rgba(0, 0, 0, 0.02)"
                  hoverStyle={{
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  }}
                  cursor="pointer"
                  onPress={() => router.push('/brightlocal')}
                >
                  <MapPin size={20} color="rgba(168, 85, 247, 0.9)" />
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="600" color="$color">
                      BrightLocal Location
                    </Text>
                    <Text fontSize="$3" color="$color" opacity={0.7}>
                      {location.business_name || 'View location'}
                    </Text>
                  </YStack>
                  <ExternalLink size={16} color="rgba(168, 85, 247, 0.7)" />
                </XStack>
              ))}
            </>
          )}

          {/* Enriched Business Profile */}
          {data.enriched_business && (
            <XStack
              gap="$3"
              alignItems="center"
              padding="$3"
              borderRadius="$3"
              backgroundColor="rgba(0, 0, 0, 0.02)"
              hoverStyle={{
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
              }}
              cursor="pointer"
              onPress={() => router.push('/brightlocal')}
            >
              <Building2 size={20} color="rgba(59, 130, 246, 0.9)" />
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Enriched Business
                </Text>
                <Text fontSize="$3" color="$color" opacity={0.7}>
                  {data.enriched_business.business_name || 'View business profile'}
                  {data.enriched_business.city && data.enriched_business.state &&
                    ` - ${data.enriched_business.city}, ${data.enriched_business.state}`}
                </Text>
              </YStack>
              <ExternalLink size={16} color="rgba(59, 130, 246, 0.7)" />
            </XStack>
          )}

          {/* Admin Client */}
          {data.client && currentPage !== 'admin' && (
            <XStack
              gap="$3"
              alignItems="center"
              padding="$3"
              borderRadius="$3"
              backgroundColor="rgba(0, 0, 0, 0.02)"
              hoverStyle={{
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
              }}
              cursor="pointer"
              onPress={() => router.push('/settings/clients')}
            >
              <Users size={20} color="rgba(16, 185, 129, 0.9)" />
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Connection
                </Text>
                <Text fontSize="$3" color="$color" opacity={0.7}>
                  {data.client.business_name || data.client.name || 'View connection'}
                </Text>
              </YStack>
              <ExternalLink size={16} color="rgba(16, 185, 129, 0.7)" />
            </XStack>
          )}
        </YStack>

      </YStack>
    </Card>
  );
}
