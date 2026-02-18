// @ts-nocheck
'use client';

/**
 * MediaUploadModal - Modal for uploading media to Google Business Profile
 *
 * Note: Google's GBP API requires media to be uploaded via URL (sourceUrl).
 * Direct file upload would require:
 * 1. Upload to cloud storage (S3, GCS, etc.)
 * 2. Get public URL
 * 3. Pass URL to GBP API
 *
 * This modal supports:
 * - Adding media via URL
 * - Selecting media category
 * - Adding description
 */

import { useState } from 'react';
import {
  YStack,
  XStack,
  Stack,
  Text,
  Input,
  TextArea,
  Spinner,
  Dialog,
} from 'tamagui';
import {
  X,
  Upload,
  Image,
  Link,
  AlertCircle,
  Camera,
  Building2,
  Utensils,
  ShoppingBag,
  Users,
} from 'lucide-react';

// Theme colors matching GBP dashboard
const COLORS = {
  background: '#0a0e27',
  cardBg: '#050536',
  borderColor: 'rgba(59, 130, 246, 0.2)',
  zingBlue: '#3B82F6',
  success: '#22C55E',
  warning: '#F97316',
  error: '#EF4444',
};

// Media categories available in GBP
const MEDIA_CATEGORIES = [
  { value: 'COVER', label: 'Cover Photo', icon: Image, description: 'Main cover image for your listing' },
  { value: 'PROFILE', label: 'Profile Photo', icon: Camera, description: 'Business profile/logo image' },
  { value: 'EXTERIOR', label: 'Exterior', icon: Building2, description: 'Outside view of your business' },
  { value: 'INTERIOR', label: 'Interior', icon: Building2, description: 'Inside view of your business' },
  { value: 'PRODUCT', label: 'Product', icon: ShoppingBag, description: 'Products you sell or offer' },
  { value: 'AT_WORK', label: 'At Work', icon: Users, description: 'Team or service in action' },
  { value: 'FOOD_AND_DRINK', label: 'Food & Drink', icon: Utensils, description: 'Menu items or beverages' },
  { value: 'ADDITIONAL', label: 'Additional', icon: Image, description: 'Other relevant photos' },
];

interface MediaUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { sourceUrl: string; category: string; description?: string }) => Promise<void>;
}

export function MediaUploadModal({
  open,
  onOpenChange,
  onSubmit,
}: MediaUploadModalProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [category, setCategory] = useState('ADDITIONAL');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sourceUrl.trim()) {
      setError('Please enter a valid image URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(sourceUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        sourceUrl: sourceUrl.trim(),
        category,
        description: description.trim() || undefined,
      });
      // Reset and close on success
      setSourceUrl('');
      setDescription('');
      setCategory('ADDITIONAL');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload media');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = MEDIA_CATEGORIES.find(c => c.value === category);

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          animation="quick"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.7)"
        />
        <Dialog.Content
          bordered
          elevate
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          backgroundColor={COLORS.cardBg}
          borderColor={COLORS.borderColor}
          borderRadius={16}
          padding="$5"
          width="90%"
          maxWidth={550}
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
            <XStack gap="$3" alignItems="center">
              <Stack
                width={40}
                height={40}
                borderRadius={10}
                backgroundColor="rgba(0, 174, 255, 0.15)"
                justifyContent="center"
                alignItems="center"
              >
                <Upload size={20} color="#00AEFF" />
              </Stack>
              <YStack>
                <Text fontSize={18} fontWeight="700" color="white">
                  Upload Media
                </Text>
                <Text fontSize={13} color="$color" opacity={0.5}>
                  Add photos or videos to your listing
                </Text>
              </YStack>
            </XStack>
            <Stack
              width={32}
              height={32}
              borderRadius={8}
              backgroundColor="rgba(30, 40, 71, 0.5)"
              justifyContent="center"
              alignItems="center"
              cursor="pointer"
              hoverStyle={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              pressStyle={{ scale: 0.95 }}
              onPress={() => onOpenChange(false)}
            >
              <X size={16} color="rgba(255,255,255,0.5)" />
            </Stack>
          </XStack>

          {/* Info Box */}
          <Stack
            backgroundColor="rgba(59, 130, 246, 0.1)"
            borderRadius={8}
            padding="$3"
            marginBottom="$4"
          >
            <XStack gap="$2" alignItems="center">
              <Link size={14} color={COLORS.zingBlue} />
              <Text fontSize={12} fontWeight="600" color={COLORS.zingBlue}>
                Media URL Required
              </Text>
            </XStack>
            <Text fontSize={11} color="white" opacity={0.7} marginTop="$1">
              Google Business Profile requires media to be hosted at a public URL.
              Upload your image to a hosting service first, then paste the URL here.
            </Text>
          </Stack>

          {/* Source URL Input */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="white" opacity={0.7}>
              Image URL *
            </Text>
            <Input
              value={sourceUrl}
              onChangeText={setSourceUrl}
              placeholder="https://example.com/image.jpg"
              backgroundColor="rgba(30, 40, 71, 0.5)"
              borderWidth={1}
              borderColor={error && !sourceUrl ? COLORS.error : COLORS.borderColor}
              color="white"
              placeholderTextColor="rgba(255,255,255,0.4)"
              paddingHorizontal="$4"
              paddingVertical="$3"
              fontSize={15}
              borderRadius={8}
              focusStyle={{
                borderColor: COLORS.zingBlue,
              }}
            />
          </YStack>

          {/* Category Selection */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="white" opacity={0.7}>
              Category
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {MEDIA_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <Stack
                    key={cat.value}
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius={8}
                    backgroundColor={isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 40, 71, 0.5)'}
                    borderWidth={1}
                    borderColor={isSelected ? COLORS.zingBlue : 'transparent'}
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                    pressStyle={{ scale: 0.98 }}
                    onPress={() => setCategory(cat.value)}
                  >
                    <XStack gap="$2" alignItems="center">
                      <Icon size={14} color={isSelected ? COLORS.zingBlue : 'rgba(255,255,255,0.5)'} />
                      <Text
                        fontSize={12}
                        fontWeight="500"
                        color={isSelected ? COLORS.zingBlue : 'white'}
                        opacity={isSelected ? 1 : 0.7}
                      >
                        {cat.label}
                      </Text>
                    </XStack>
                  </Stack>
                );
              })}
            </XStack>
            {selectedCategory && (
              <Text fontSize={11} color="$color" opacity={0.5}>
                {selectedCategory.description}
              </Text>
            )}
          </YStack>

          {/* Description Input */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="white" opacity={0.7}>
              Description (optional)
            </Text>
            <TextArea
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description for this media..."
              backgroundColor="rgba(30, 40, 71, 0.5)"
              borderWidth={1}
              borderColor={COLORS.borderColor}
              color="white"
              placeholderTextColor="rgba(255,255,255,0.4)"
              padding="$3"
              fontSize={14}
              borderRadius={8}
              minHeight={80}
              verticalAlign="top"
              focusStyle={{
                borderColor: COLORS.zingBlue,
              }}
            />
          </YStack>

          {/* Error Display */}
          {error && (
            <Stack
              backgroundColor="rgba(239, 68, 68, 0.1)"
              borderWidth={1}
              borderColor="rgba(239, 68, 68, 0.3)"
              borderRadius={8}
              padding="$3"
              marginBottom="$4"
            >
              <XStack gap="$2" alignItems="center">
                <AlertCircle size={16} color={COLORS.error} />
                <Text fontSize={13} color={COLORS.error}>{error}</Text>
              </XStack>
            </Stack>
          )}

          {/* Actions */}
          <XStack gap="$3" justifyContent="flex-end">
            <Stack
              paddingHorizontal="$4"
              paddingVertical="$3"
              borderRadius={8}
              backgroundColor="rgba(30, 40, 71, 0.5)"
              borderWidth={1}
              borderColor={COLORS.borderColor}
              cursor="pointer"
              hoverStyle={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              pressStyle={{ scale: 0.98 }}
              onPress={() => onOpenChange(false)}
            >
              <Text fontSize={14} fontWeight="600" color="white">Cancel</Text>
            </Stack>
            <Stack
              paddingHorizontal="$5"
              paddingVertical="$3"
              borderRadius={8}
              backgroundColor={!sourceUrl.trim() || isSubmitting ? 'rgba(59, 130, 246, 0.3)' : COLORS.zingBlue}
              cursor={!sourceUrl.trim() || isSubmitting ? 'not-allowed' : 'pointer'}
              hoverStyle={{ opacity: !sourceUrl.trim() ? 1 : 0.9 }}
              pressStyle={{ scale: !sourceUrl.trim() ? 1 : 0.98 }}
              onPress={handleSubmit}
              opacity={!sourceUrl.trim() ? 0.5 : 1}
            >
              <XStack gap="$2" alignItems="center">
                {isSubmitting ? (
                  <Spinner size="small" color="white" />
                ) : (
                  <Upload size={16} color="white" />
                )}
                <Text fontSize={14} fontWeight="600" color="white">
                  {isSubmitting ? 'Uploading...' : 'Upload Media'}
                </Text>
              </XStack>
            </Stack>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export default MediaUploadModal;
