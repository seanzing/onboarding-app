// @ts-nocheck - Tamagui dynamic color props can't be strictly typed
/**
 * Route Error Component
 *
 * Reusable error UI for Next.js error.tsx route boundaries.
 * Provides consistent error display across all routes.
 *
 * Features:
 * - User-friendly error message
 * - Retry and navigation buttons
 * - Development-only error details
 * - Sentry integration point
 */

'use client';

import { useEffect } from 'react';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { captureError } from '@/lib/monitoring';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  icon?: React.ReactNode;
  color?: string;
}

export function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  icon,
  color = '#ef4444',
}: RouteErrorProps) {
  const router = useRouter();

  // Report error on mount
  useEffect(() => {
    captureError(error, {
      component: 'RouteError',
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$6"
      minHeight={400}
    >
      <Card
        bordered
        backgroundColor="$background"
        borderColor={`${color}33`}
        borderWidth={2}
        borderRadius={16}
        padding="$6"
        maxWidth={500}
        width="100%"
        gap="$4"
        alignItems="center"
      >
        {/* Error Icon */}
        <YStack
          width={72}
          height={72}
          borderRadius={36}
          backgroundColor={`${color}15`}
          alignItems="center"
          justifyContent="center"
        >
          {icon || <AlertTriangle size={36} color={color} />}
        </YStack>

        {/* Error Title */}
        <Text
          fontSize={24}
          fontWeight="700"
          color={color}
          textAlign="center"
        >
          {title}
        </Text>

        {/* Error Message */}
        <Text
          fontSize={16}
          color="$gray11"
          textAlign="center"
          lineHeight={24}
        >
          {error.message || 'An unexpected error occurred. Please try again.'}
        </Text>

        {/* Error Digest (for support) */}
        {error.digest && (
          <Text fontSize={12} color="$gray9" textAlign="center">
            Error ID: {error.digest}
          </Text>
        )}

        {/* Action Buttons */}
        <XStack gap="$3" flexWrap="wrap" justifyContent="center" marginTop="$2">
          <Button
            size="$4"
            backgroundColor="$blue10"
            color="white"
            icon={<RefreshCw size={18} />}
            onPress={() => reset()}
            pressStyle={{ opacity: 0.8 }}
          >
            Try Again
          </Button>

          <Button
            size="$4"
            backgroundColor="transparent"
            borderWidth={1}
            borderColor="$gray7"
            icon={<ArrowLeft size={18} />}
            onPress={() => router.back()}
            pressStyle={{ opacity: 0.8 }}
          >
            Go Back
          </Button>

          <Button
            size="$4"
            backgroundColor="transparent"
            borderWidth={1}
            borderColor="$gray7"
            icon={<Home size={18} />}
            onPress={() => router.push('/')}
            pressStyle={{ opacity: 0.8 }}
          >
            Home
          </Button>
        </XStack>

        {/* Development Error Details */}
        {process.env.NODE_ENV === 'development' && error.stack && (
          <YStack
            width="100%"
            marginTop="$4"
            backgroundColor="$gray2"
            borderRadius={8}
            padding="$3"
          >
            <Text fontSize={12} fontWeight="600" color="$gray10" marginBottom="$2">
              Error Details (Development Only)
            </Text>
            <YStack
              backgroundColor="$gray3"
              borderRadius={6}
              padding="$2"
              maxHeight={200}
              overflow="hidden"
            >
              <Text
                fontSize={11}
                color="$gray11"
                fontFamily="monospace"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {error.stack}
              </Text>
            </YStack>
          </YStack>
        )}
      </Card>
    </YStack>
  );
}
