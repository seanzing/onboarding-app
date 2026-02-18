// @ts-nocheck
/**
 * GBP Location Detail & Edit Page - ENHANCED VERSION
 *
 * Professional UI for viewing and editing Google Business Profile location details.
 * Uses Pipedream API for all operations.
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, AlertCircle, MapPin, Phone, Globe, Building2, FileText } from 'lucide-react';
import {
  YStack,
  XStack,
  Card,
  Text,
  H1,
  H2,
  Button,
  Spinner,
  Input,
  Label,
  TextArea,
  Separator,
} from 'tamagui';
import { useGBPLocation } from '@/app/hooks/useGBPLocations';
import { toast } from 'sonner';
import { BackButton } from '@/app/components/tamagui';
import { RelatedProfiles } from '@/app/components/RelatedProfiles';
import { formatPhoneNumber } from '@/app/utils/formatters';

export default function GBPLocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const locationId = params.locationId as string;

  const { location, loading, error, updating, updateLocation, refetch } = useGBPLocation(
    accountId,
    locationId
  );

  // Form state
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form when location loads
  useEffect(() => {
    if (location) {
      setTitle(location.title || '');
      setPhone(location.phoneNumbers?.primaryPhone || '');
      setWebsite(location.websiteUri || '');
      setDescription(location.profile?.description || '');
    }
  }, [location]);

  const handleSave = async () => {
    try {
      console.log('[LocationDetail] Saving changes...');

      const updates: any = {};

      // Only include fields that changed
      if (title !== location?.title) {
        updates.title = title;
      }

      if (phone !== location?.phoneNumbers?.primaryPhone) {
        updates.phoneNumbers = {
          primaryPhone: phone,
        };
      }

      if (website !== location?.websiteUri) {
        updates.websiteUri = website;
      }

      if (description !== location?.profile?.description) {
        updates.profile = {
          description: description.slice(0, 750),
        };
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        setIsEditing(false);
        return;
      }

      console.log('[LocationDetail] Updates:', updates);

      await updateLocation(updates);

      console.log('[LocationDetail] ✅ Location updated successfully');
      toast.success('Location updated successfully!');

      setIsEditing(false);
      refetch();
    } catch (err: any) {
      console.error('[LocationDetail] Save error:', err);
      toast.error(err.message || 'Failed to update location');
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (location) {
      setTitle(location.title || '');
      setPhone(location.phoneNumbers?.primaryPhone || '');
      setWebsite(location.websiteUri || '');
      setDescription(location.profile?.description || '');
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Spinner size="large" color="$zingPurple" />
        <Text marginTop="$4" color="$color" opacity={0.7} fontSize="$4">
          Loading location details...
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
          padding="$5"
          backgroundColor="$red2"
          borderColor="$red6"
          maxWidth={600}
        >
          <XStack alignItems="center" gap="$3">
            <AlertCircle size={28} color="$red10" />
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="700" color="$red11">
                Failed to Load Location
              </Text>
              <Text fontSize="$4" color="$red11" marginTop="$2">
                {error}
              </Text>
            </YStack>
          </XStack>
          <XStack gap="$3" marginTop="$5">
            <Button
              onPress={refetch}
              backgroundColor="$red10"
              color="white"
              flex={1}
              fontWeight="600"
            >
              Try Again
            </Button>
            <BackButton href={`/gbp/${accountId}/locations`} />
          </XStack>
        </Card>
      </YStack>
    );
  }

  if (!location) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Text fontSize="$5" color="$color">
          Location not found
        </Text>
      </YStack>
    );
  }

  const address = location.storefrontAddress;
  const hasAddress = address && (address.addressLines || address.locality);

  return (
    <YStack flex={1} padding="$4" gap="$5" maxWidth={1000} marginHorizontal="auto" width="100%">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$3">
        <BackButton href={`/gbp/${accountId}/locations`} />

        <XStack gap="$3" alignItems="center">
          {!isEditing ? (
            <Button
              backgroundColor="$zingPurple"
              color="white"
              onPress={() => setIsEditing(true)}
              size="$4"
              fontWeight="600"
              paddingHorizontal="$6"
            >
              Edit Location
            </Button>
          ) : (
            <XStack gap="$3">
              <Button
                variant="outlined"
                borderColor="$gray9"
                color="$color"
                onPress={handleCancel}
                disabled={updating}
                fontWeight="600"
              >
                Cancel
              </Button>
              <Button
                backgroundColor="$green10"
                color="white"
                icon={updating ? <Spinner size="small" color="white" /> : <Save size={18} />}
                onPress={handleSave}
                disabled={updating}
                fontWeight="600"
                paddingHorizontal="$6"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </XStack>
          )}
        </XStack>
      </XStack>

      {/* Title & Category */}
      <YStack gap="$3">
        <XStack alignItems="center" gap="$3">
          <Building2 size={36} color="$zingPurple" />
          <YStack gap="$1">
            <H1 fontSize="$10" color="$color" fontWeight="700">
              {location.title || 'Untitled Location'}
            </H1>
            {location.categories?.primaryCategory && (
              <Text fontSize="$5" color="$color" opacity={0.7} fontWeight="500">
                {location.categories.primaryCategory.displayName}
              </Text>
            )}
          </YStack>
        </XStack>
        <Text fontSize="$3" color="$color" opacity={0.6} fontFamily="$mono">
          Location ID: {locationId}
        </Text>
      </YStack>

      {/* Business Information Card */}
      <Card size="$4" bordered padding="$5" elevation="$1">
        <YStack gap="$5">
          <XStack alignItems="center" gap="$2">
            <FileText size={24} color="$zingPurple" />
            <H2 fontSize="$7" color="$color" fontWeight="700">
              Business Information
            </H2>
          </XStack>

          <Separator borderColor="$gray6" />

          {/* Business Name */}
          <YStack gap="$3">
            <Label htmlFor="title" fontSize="$4" color="$color" fontWeight="600">
              Business Name
            </Label>
            {isEditing ? (
              <Input
                id="title"
                value={title}
                onChangeText={setTitle}
                placeholder="Enter business name"
                fontSize="$5"
                padding="$4"
                borderWidth={2}
                focusStyle={{ borderColor: '$zingPurple' }}
              />
            ) : (
              <Text fontSize="$5" color="$color" fontWeight="500">
                {location.title || 'Not set'}
              </Text>
            )}
          </YStack>

          {/* Phone */}
          <YStack gap="$3">
            <XStack alignItems="center" gap="$2">
              <Phone size={18} color="$color" opacity={0.7} />
              <Label htmlFor="phone" fontSize="$4" color="$color" fontWeight="600">
                Phone Number
              </Label>
            </XStack>
            {isEditing ? (
              <Input
                id="phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 123-4567"
                fontSize="$5"
                padding="$4"
                borderWidth={2}
                focusStyle={{ borderColor: '$zingPurple' }}
              />
            ) : (
              <Text fontSize="$5" color="$color" fontWeight="500">
                {location.phoneNumbers?.primaryPhone ? formatPhoneNumber(location.phoneNumbers.primaryPhone) : 'Not set'}
              </Text>
            )}
          </YStack>

          {/* Website */}
          <YStack gap="$3">
            <XStack alignItems="center" gap="$2">
              <Globe size={18} color="$color" opacity={0.7} />
              <Label htmlFor="website" fontSize="$4" color="$color" fontWeight="600">
                Website
              </Label>
            </XStack>
            {isEditing ? (
              <Input
                id="website"
                value={website}
                onChangeText={setWebsite}
                placeholder="https://example.com"
                fontSize="$5"
                padding="$4"
                borderWidth={2}
                focusStyle={{ borderColor: '$zingPurple' }}
              />
            ) : (
              <Text
                fontSize="$5"
                color="$zingPurple"
                textDecorationLine="underline"
                fontWeight="500"
                cursor={website ? 'pointer' : 'default'}
                onPress={() => website && window.open(website, '_blank')}
              >
                {location.websiteUri || 'Not set'}
              </Text>
            )}
          </YStack>

          {/* Business Description */}
          <YStack gap="$3">
            <Label htmlFor="description" fontSize="$4" color="$color" fontWeight="600">
              Business Description
            </Label>
            {isEditing ? (
              <YStack gap="$2">
                <TextArea
                  id="description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your business in your own voice..."
                  fontSize="$5"
                  padding="$4"
                  minHeight={140}
                  maxLength={750}
                  borderWidth={2}
                  focusStyle={{ borderColor: '$zingPurple' }}
                />
                <Text fontSize="$3" color="$color" opacity={0.6} textAlign="right">
                  {description.length}/750 characters
                </Text>
              </YStack>
            ) : (
              <Text fontSize="$4" color="$color" opacity={0.9} lineHeight={24}>
                {location.profile?.description || 'No description set'}
              </Text>
            )}
          </YStack>
        </YStack>
      </Card>

      {/* Address Card (Read-only) */}
      {hasAddress && (
        <Card size="$4" bordered padding="$5" backgroundColor="$gray2" elevation="$1">
          <YStack gap="$4">
            <XStack alignItems="center" gap="$2">
              <MapPin size={24} color="$zingPurple" />
              <H2 fontSize="$7" color="$color" fontWeight="700">
                Business Address
              </H2>
            </XStack>

            <Separator borderColor="$gray6" />

            <Text fontSize="$5" color="$color" opacity={0.9} lineHeight={28} fontWeight="500">
              {[
                address.addressLines?.join(', '),
                address.locality,
                address.administrativeArea,
                address.postalCode,
              ]
                .filter(Boolean)
                .join(', ')}
            </Text>

            <Card backgroundColor="$blue2" borderColor="$blue6" padding="$3">
              <Text fontSize="$3" color="$blue11" opacity={0.9}>
                ℹ️ Address can only be changed through Google Business Profile directly
              </Text>
            </Card>
          </YStack>
        </Card>
      )}

      {/* Maps Link */}
      {location.metadata?.mapsUri && (
        <Card size="$4" bordered padding="$5" backgroundColor="$blue3" borderColor="$blue7" elevation="$1">
          <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$4">
            <YStack gap="$2">
              <Text fontSize="$5" color="$blue11" fontWeight="700">
                View on Google Maps
              </Text>
              <Text fontSize="$3" color="$blue11" opacity={0.8}>
                See how your business appears to customers
              </Text>
            </YStack>
            <Button
              size="$4"
              backgroundColor="$blue10"
              color="white"
              onPress={() => window.open(location.metadata?.mapsUri, '_blank')}
              fontWeight="600"
              paddingHorizontal="$6"
            >
              Open Maps →
            </Button>
          </XStack>
        </Card>
      )}

      {/* Related Profiles - Cross-link to other platforms */}
      <RelatedProfiles
        hubspotContactId={(location as any).hubspot_contact_id || null}
        currentPage="gbp"
      />
    </YStack>
  );
}
