// @ts-nocheck
/**
 * Connect GBP Button - Company-Specific
 *
 * This button initiates Google Business Profile OAuth flow for a specific company.
 * Unlike QuickConnect, this directly associates the GBP with a HubSpot company.
 *
 * Uses the shared useGBPOAuthFlow hook for OAuth flow management.
 */

'use client';

import { Button, XStack, YStack, Text, Spinner, Card } from 'tamagui';
import { Link2, CheckCircle, AlertCircle } from 'lucide-react';
import { useGBPOAuthFlow } from '@/app/hooks/useGBPOAuthFlow';

interface ConnectGBPButtonProps {
  hubspotObjectId: string;
  companyName: string;
  onSuccess?: (accountId: string) => void;
  onError?: (error: string) => void;
}

export default function ConnectGBPButton({
  hubspotObjectId,
  companyName,
  onSuccess,
  onError,
}: ConnectGBPButtonProps) {
  const { isConnecting, successMessage, errorMessage, connect, isAuthenticated } =
    useGBPOAuthFlow();

  const handleConnect = () => {
    connect({
      clientId: hubspotObjectId,
      clientName: companyName,
      useCustomOAuthApp: true,
      onSuccess,
      onError,
    });
  };

  // Not authenticated - show disabled button
  if (!isAuthenticated) {
    return (
      <Button
        size="$3"
        disabled
        backgroundColor="$gray5"
        borderRadius="$2"
        opacity={0.5}
        alignSelf="flex-start"
      >
        <Text color="$gray11" fontWeight="600" fontSize="$3">
          Login Required
        </Text>
      </Button>
    );
  }

  return (
    <YStack space="$2" alignItems="flex-start">
      <Button
        size="$3"
        backgroundColor="$zingBlue"
        borderRadius="$2"
        borderWidth={0}
        paddingHorizontal="$3"
        paddingVertical="$2"
        shadowColor="rgba(59, 130, 246, 0.2)"
        shadowRadius={6}
        shadowOffset={{ width: 0, height: 2 }}
        hoverStyle={{
          backgroundColor: '#4A90FF',
          scale: 1.02,
          shadowRadius: 10,
        }}
        pressStyle={{
          scale: 0.98,
          shadowRadius: 4,
        }}
        animation="quick"
        onPress={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <XStack space="$2" alignItems="center">
            <Spinner size="small" color="white" />
            <Text color="white" fontWeight="600" fontSize="$3">
              Connecting...
            </Text>
          </XStack>
        ) : (
          <XStack space="$2" alignItems="center">
            <Link2 size={16} color="white" strokeWidth={2.5} />
            <Text color="white" fontWeight="600" fontSize="$3">
              Connect GBP
            </Text>
          </XStack>
        )}
      </Button>

      {/* Success Message */}
      {successMessage && (
        <Card
          backgroundColor="rgba(16, 185, 129, 0.1)"
          borderWidth={1}
          borderColor="rgba(16, 185, 129, 0.3)"
          borderRadius="$3"
          padding="$3"
        >
          <XStack alignItems="center" gap="$2">
            <CheckCircle size={18} color="#10b981" />
            <Text fontSize="$3" color="#10b981" fontWeight="600">
              {successMessage}
            </Text>
          </XStack>
        </Card>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Card
          backgroundColor="rgba(239, 68, 68, 0.1)"
          borderWidth={1}
          borderColor="rgba(239, 68, 68, 0.3)"
          borderRadius="$3"
          padding="$3"
        >
          <XStack alignItems="center" gap="$2">
            <AlertCircle size={18} color="#ef4444" />
            <Text fontSize="$3" color="#ef4444" fontWeight="600">
              {errorMessage}
            </Text>
          </XStack>
        </Card>
      )}
    </YStack>
  );
}
