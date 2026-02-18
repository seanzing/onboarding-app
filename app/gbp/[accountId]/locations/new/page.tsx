// @ts-nocheck
/**
 * Create New GBP Location Page
 *
 * Form for creating a new Google Business Profile location.
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, AlertCircle, MapPin, Building } from 'lucide-react';
import {
  YStack,
  XStack,
  Card,
  Text,
  H1,
  H2,
  Button,
  Input,
  Label,
  TextArea,
  Spinner,
} from 'tamagui';
import { toast } from 'sonner';
import { BackButton } from '@/app/components/tamagui';

export default function CreateLocationPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - Required fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryDisplayName, setCategoryDisplayName] = useState('');

  // Address fields (required)
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('US');

  // Phone (required)
  const [phone, setPhone] = useState('');

  // Optional fields
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!title.trim()) {
        toast.error('Business name is required');
        return;
      }

      if (!categoryId) {
        toast.error('Business category is required');
        return;
      }

      if (!addressLine1 || !city || !state || !zipCode) {
        toast.error('Complete address is required');
        return;
      }

      if (!phone) {
        toast.error('Phone number is required');
        return;
      }

      setIsSubmitting(true);

      // Build location object according to GBP API spec
      const locationData: any = {
        title: title.trim(),
        categories: {
          primaryCategory: {
            categoryId: categoryId,
            displayName: categoryDisplayName || title,
          },
        },
        storefrontAddress: {
          addressLines: [addressLine1, addressLine2].filter(Boolean),
          locality: city,
          administrativeArea: state,
          postalCode: zipCode,
          regionCode: country,
        },
        phoneNumbers: {
          primaryPhone: phone,
        },
      };

      // Add optional fields
      if (website) {
        locationData.websiteUri = website;
      }

      if (description) {
        locationData.profile = {
          description: description.slice(0, 750), // Max 750 chars
        };
      }

      console.log('[CreateLocation] Creating location:', locationData);

      // Call CREATE endpoint
      const response = await fetch(`/api/gbp/${accountId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create location');
      }

      const result = await response.json();
      console.log('[CreateLocation] ✅ Location created:', result);

      toast.success('Location created successfully!');

      // Redirect to locations list
      router.push(`/gbp/${accountId}/locations`);
    } catch (err: any) {
      console.error('[CreateLocation] Error:', err);
      toast.error(err.message || 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <YStack flex={1} padding="$4" gap="$4" maxWidth={900} marginHorizontal="auto" width="100%">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$3">
        <BackButton href={`/gbp/${accountId}/locations`} />
      </XStack>

      {/* Page Title */}
      <YStack gap="$2">
        <XStack alignItems="center" gap="$3">
          <Building size={32} color="$zingPurple" />
          <H1 fontSize="$9" color="$color">
            Create New Location
          </H1>
        </XStack>
        <Text fontSize="$4" color="$color" opacity={0.7}>
          Add a new business location to your Google Business Profile
        </Text>
      </YStack>

      {/* Required Fields Notice */}
      <Card backgroundColor="$blue2" borderColor="$blue6" bordered padding="$4">
        <XStack alignItems="center" gap="$3">
          <AlertCircle size={20} color="$blue11" />
          <Text fontSize="$3" color="$blue11">
            Fields marked with * are required by Google Business Profile
          </Text>
        </XStack>
      </Card>

      {/* Form */}
      <Card size="$4" bordered padding="$5">
        <YStack gap="$5">
          {/* Business Information Section */}
          <YStack gap="$4">
            <H2 fontSize="$6" color="$color" fontWeight="700">
              Business Information
            </H2>

            {/* Business Name */}
            <YStack gap="$2">
              <Label htmlFor="title" fontSize="$3" color="$color" fontWeight="600">
                Business Name *
              </Label>
              <Input
                id="title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., ZING Marketing Services"
                fontSize="$4"
                padding="$3"
                borderColor={title ? '$green8' : '$gray8'}
                required
              />
              <Text fontSize="$2" color="$color" opacity={0.6}>
                Your business name as it appears to customers
              </Text>
            </YStack>

            {/* Business Category */}
            <YStack gap="$2">
              <Label htmlFor="category" fontSize="$3" color="$color" fontWeight="600">
                Business Category *
              </Label>
              <Input
                id="categoryId"
                value={categoryId}
                onChangeText={setCategoryId}
                placeholder="e.g., gcid:website_designer"
                fontSize="$4"
                padding="$3"
                borderColor={categoryId ? '$green8' : '$gray8'}
                required
              />
              <Input
                id="categoryDisplay"
                value={categoryDisplayName}
                onChangeText={setCategoryDisplayName}
                placeholder="Display name (e.g., Website Designer)"
                fontSize="$4"
                padding="$3"
                marginTop="$2"
              />
              <Text fontSize="$2" color="$color" opacity={0.6}>
                Enter the Google category ID and display name
              </Text>
            </YStack>

            {/* Phone Number */}
            <YStack gap="$2">
              <Label htmlFor="phone" fontSize="$3" color="$color" fontWeight="600">
                Phone Number *
              </Label>
              <Input
                id="phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 123-4567"
                fontSize="$4"
                padding="$3"
                borderColor={phone ? '$green8' : '$gray8'}
                required
              />
              <Text fontSize="$2" color="$color" opacity={0.6}>
                International format preferred (e.g., +1-555-123-4567)
              </Text>
            </YStack>

            {/* Website */}
            <YStack gap="$2">
              <Label htmlFor="website" fontSize="$3" color="$color" fontWeight="600">
                Website
              </Label>
              <Input
                id="website"
                value={website}
                onChangeText={setWebsite}
                placeholder="https://example.com"
                fontSize="$4"
                padding="$3"
              />
              <Text fontSize="$2" color="$color" opacity={0.6}>
                Your business website URL (optional but recommended)
              </Text>
            </YStack>
          </YStack>

          {/* Address Section */}
          <YStack gap="$4">
            <XStack alignItems="center" gap="$2">
              <MapPin size={24} color="$zingPurple" />
              <H2 fontSize="$6" color="$color" fontWeight="700">
                Business Address
              </H2>
            </XStack>

            {/* Address Line 1 */}
            <YStack gap="$2">
              <Label htmlFor="address1" fontSize="$3" color="$color" fontWeight="600">
                Street Address *
              </Label>
              <Input
                id="address1"
                value={addressLine1}
                onChangeText={setAddressLine1}
                placeholder="123 Main Street"
                fontSize="$4"
                padding="$3"
                borderColor={addressLine1 ? '$green8' : '$gray8'}
                required
              />
            </YStack>

            {/* Address Line 2 */}
            <YStack gap="$2">
              <Label htmlFor="address2" fontSize="$3" color="$color" fontWeight="600">
                Apt, Suite, etc. (Optional)
              </Label>
              <Input
                id="address2"
                value={addressLine2}
                onChangeText={setAddressLine2}
                placeholder="Suite 100"
                fontSize="$4"
                padding="$3"
              />
            </YStack>

            {/* City, State, Zip */}
            <XStack gap="$3" flexWrap="wrap">
              <YStack gap="$2" flex={2} minWidth={200}>
                <Label htmlFor="city" fontSize="$3" color="$color" fontWeight="600">
                  City *
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Castle Rock"
                  fontSize="$4"
                  padding="$3"
                  borderColor={city ? '$green8' : '$gray8'}
                  required
                />
              </YStack>

              <YStack gap="$2" flex={1} minWidth={100}>
                <Label htmlFor="state" fontSize="$3" color="$color" fontWeight="600">
                  State *
                </Label>
                <Input
                  id="state"
                  value={state}
                  onChangeText={setState}
                  placeholder="CO"
                  fontSize="$4"
                  padding="$3"
                  borderColor={state ? '$green8' : '$gray8'}
                  required
                />
              </YStack>

              <YStack gap="$2" flex={1} minWidth={120}>
                <Label htmlFor="zip" fontSize="$3" color="$color" fontWeight="600">
                  ZIP Code *
                </Label>
                <Input
                  id="zip"
                  value={zipCode}
                  onChangeText={setZipCode}
                  placeholder="80104"
                  fontSize="$4"
                  padding="$3"
                  borderColor={zipCode ? '$green8' : '$gray8'}
                  required
                />
              </YStack>
            </XStack>

            {/* Country */}
            <YStack gap="$2">
              <Label htmlFor="country" fontSize="$3" color="$color" fontWeight="600">
                Country Code *
              </Label>
              <Input
                id="country"
                value={country}
                onChangeText={setCountry}
                placeholder="US"
                fontSize="$4"
                padding="$3"
                borderColor={country ? '$green8' : '$gray8'}
                required
              />
              <Text fontSize="$2" color="$color" opacity={0.6}>
                2-letter country code (e.g., US, CA, GB)
              </Text>
            </YStack>
          </YStack>

          {/* Business Description Section */}
          <YStack gap="$4">
            <H2 fontSize="$6" color="$color" fontWeight="700">
              Business Description (Optional)
            </H2>

            <YStack gap="$2">
              <Label htmlFor="description" fontSize="$3" color="$color" fontWeight="600">
                Description
              </Label>
              <TextArea
                id="description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your business in your own voice..."
                fontSize="$4"
                padding="$3"
                minHeight={120}
                maxLength={750}
              />
              <Text fontSize="$2" color="$color" opacity={0.6}>
                {description.length}/750 characters
              </Text>
            </YStack>
          </YStack>

          {/* Action Buttons */}
          <XStack gap="$3" justifyContent="flex-end" marginTop="$4">
            <Link href={`/gbp/${accountId}/locations`} passHref>
              <Button
                variant="outlined"
                borderColor="$gray8"
                color="$color"
                paddingHorizontal="$6"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </Link>
            <Button
              backgroundColor="$green10"
              color="white"
              paddingHorizontal="$6"
              fontWeight="600"
              icon={isSubmitting ? <Spinner size="small" color="white" /> : <Save size={18} />}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Location'}
            </Button>
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}
