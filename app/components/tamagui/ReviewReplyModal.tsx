// @ts-nocheck
'use client';

/**
 * ReviewReplyModal - Modal for replying to Google Business Profile reviews
 *
 * Features:
 * - Professional Tamagui styling matching the app
 * - Character count with limit
 * - Loading state during submission
 * - Error handling with visual feedback
 */

import { useState, useEffect } from 'react';
import {
  YStack,
  XStack,
  Stack,
  Text,
  TextArea,
  Spinner,
  Dialog,
} from 'tamagui';
import { X, Send, Star, MessageSquare, AlertCircle } from 'lucide-react';

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

export interface ReviewData {
  reviewId: string;
  reviewer: {
    displayName?: string;
    profilePhotoUrl?: string;
  };
  starRating: string;
  comment?: string;
  createTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

interface ReviewReplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewData | null;
  onSubmit: (reviewId: string, reply: string) => Promise<void>;
}

// Helper to convert star rating string to number
const getStarCount = (rating: string): number => {
  const map: Record<string, number> = {
    'FIVE': 5, 'FOUR': 4, 'THREE': 3, 'TWO': 2, 'ONE': 1,
  };
  return map[rating] || 0;
};

// Character limit for review replies (Google's limit)
const MAX_REPLY_LENGTH = 4096;

export function ReviewReplyModal({
  open,
  onOpenChange,
  review,
  onSubmit,
}: ReviewReplyModalProps) {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when review changes or modal opens
  useEffect(() => {
    if (review) {
      setReplyText(review.reviewReply?.comment || '');
      setError(null);
    }
  }, [review, open]);

  const handleSubmit = async () => {
    if (!review || !replyText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(review.reviewId, replyText.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = MAX_REPLY_LENGTH - replyText.length;
  const isOverLimit = remainingChars < 0;
  const isNearLimit = remainingChars < 200 && remainingChars >= 0;

  if (!review) return null;

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
          maxWidth={600}
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
            <XStack gap="$3" alignItems="center">
              <Stack
                width={40}
                height={40}
                borderRadius={10}
                backgroundColor="rgba(59, 130, 246, 0.15)"
                justifyContent="center"
                alignItems="center"
              >
                <MessageSquare size={20} color={COLORS.zingBlue} />
              </Stack>
              <YStack>
                <Text fontSize={18} fontWeight="700" color="white">
                  {review.reviewReply ? 'Edit Reply' : 'Reply to Review'}
                </Text>
                <Text fontSize={13} color="$color" opacity={0.5}>
                  Respond to your customer's feedback
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

          {/* Review Preview */}
          <Stack
            backgroundColor="rgba(30, 40, 71, 0.5)"
            borderRadius={12}
            padding="$4"
            marginBottom="$4"
          >
            <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
              <XStack gap="$3" alignItems="center">
                <Stack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor="rgba(59, 130, 246, 0.2)"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text fontSize={16} fontWeight="600" color="white">
                    {review.reviewer?.displayName?.[0] || '?'}
                  </Text>
                </Stack>
                <YStack>
                  <Text fontSize={15} fontWeight="500" color="white">
                    {review.reviewer?.displayName || 'Anonymous'}
                  </Text>
                  <Text fontSize={12} color="$color" opacity={0.5}>
                    {new Date(review.createTime).toLocaleDateString()}
                  </Text>
                </YStack>
              </XStack>
              <XStack gap="$0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    fill={star <= getStarCount(review.starRating) ? '#F59E0B' : 'transparent'}
                    color={star <= getStarCount(review.starRating) ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
                  />
                ))}
              </XStack>
            </XStack>
            {review.comment && (
              <Text fontSize={14} color="white" opacity={0.8} lineHeight={22}>
                "{review.comment}"
              </Text>
            )}
          </Stack>

          {/* Reply Input */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="white" opacity={0.7}>
              Your Reply
            </Text>
            <TextArea
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write a thoughtful response to this review..."
              backgroundColor="rgba(30, 40, 71, 0.5)"
              borderWidth={1}
              borderColor={error ? COLORS.error : COLORS.borderColor}
              color="white"
              placeholderTextColor="rgba(255,255,255,0.4)"
              padding="$3"
              fontSize={15}
              borderRadius={10}
              minHeight={120}
              maxLength={MAX_REPLY_LENGTH + 100} // Allow some overflow for visual
              verticalAlign="top"
              focusStyle={{
                borderColor: COLORS.zingBlue,
              }}
            />
            <XStack justifyContent="space-between" alignItems="center">
              <Text
                fontSize={12}
                color={isOverLimit ? COLORS.error : isNearLimit ? COLORS.warning : '$color'}
                opacity={isOverLimit || isNearLimit ? 1 : 0.4}
              >
                {remainingChars} characters remaining
              </Text>
              {isOverLimit && (
                <Text fontSize={12} color={COLORS.error}>
                  Message too long
                </Text>
              )}
            </XStack>
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

          {/* Tips */}
          <Stack
            backgroundColor="rgba(59, 130, 246, 0.1)"
            borderRadius={8}
            padding="$3"
            marginBottom="$4"
          >
            <Text fontSize={12} fontWeight="600" color={COLORS.zingBlue} marginBottom="$2">
              💡 Tips for a great reply:
            </Text>
            <YStack gap="$1">
              <Text fontSize={11} color="white" opacity={0.7}>
                • Thank the customer for their feedback
              </Text>
              <Text fontSize={11} color="white" opacity={0.7}>
                • Address specific points they mentioned
              </Text>
              <Text fontSize={11} color="white" opacity={0.7}>
                • Keep it professional and friendly
              </Text>
              <Text fontSize={11} color="white" opacity={0.7}>
                • Avoid defensive or argumentative language
              </Text>
            </YStack>
          </Stack>

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
              backgroundColor={isOverLimit || !replyText.trim() ? 'rgba(59, 130, 246, 0.3)' : COLORS.zingBlue}
              cursor={isOverLimit || !replyText.trim() || isSubmitting ? 'not-allowed' : 'pointer'}
              hoverStyle={{ opacity: isOverLimit || !replyText.trim() ? 1 : 0.9 }}
              pressStyle={{ scale: isOverLimit || !replyText.trim() ? 1 : 0.98 }}
              onPress={handleSubmit}
              opacity={isOverLimit || !replyText.trim() ? 0.5 : 1}
            >
              <XStack gap="$2" alignItems="center">
                {isSubmitting ? (
                  <Spinner size="small" color="white" />
                ) : (
                  <Send size={16} color="white" />
                )}
                <Text fontSize={14} fontWeight="600" color="white">
                  {isSubmitting ? 'Sending...' : review.reviewReply ? 'Update Reply' : 'Send Reply'}
                </Text>
              </XStack>
            </Stack>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export default ReviewReplyModal;
