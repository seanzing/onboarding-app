// @ts-nocheck
/**
 * Quick Connect GBP Button
 *
 * Admin convenience button that auto-generates a client UUID and triggers OAuth flow.
 * This maintains the agency model architecture while providing one-click testing.
 *
 * Flow:
 * 1. Click button → Create quick client (generates UUID)
 * 2. Trigger OAuth flow with generated client UUID
 *
 * Uses the shared useGBPOAuthFlow hook for OAuth flow management.
 */

'use client';

import { useState, useCallback } from 'react';
import { Button, XStack, Text, Spinner } from 'tamagui';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { useGBPOAuthFlow } from '@/app/hooks/useGBPOAuthFlow';

interface QuickConnectGBPButtonProps {
  onSuccess?: (clientId: string, accountId: string) => void;
  onError?: (error: string) => void;
}

export default function QuickConnectGBPButton({
  onSuccess,
  onError,
}: QuickConnectGBPButtonProps) {
  const { session } = useAuth();
  const {
    isConnecting: isOAuthConnecting,
    successMessage,
    errorMessage,
    connect,
    isAuthenticated,
  } = useGBPOAuthFlow();

  // Additional state for the quick client creation step
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [quickClientError, setQuickClientError] = useState<string | null>(null);

  // Combined loading state
  const isConnecting = isCreatingClient || isOAuthConnecting;

  const handleQuickConnect = useCallback(async () => {
    if (!session) {
      const error = 'You must be logged in to use quick connect';
      setQuickClientError(error);
      onError?.(error);
      return;
    }

    setIsCreatingClient(true);
    setQuickClientError(null);

    console.log('[QuickConnect] Starting quick connect flow...');

    try {
      // Step 1: Create quick client (generates UUID and client record)
      console.log('[QuickConnect] Creating quick client...');

      const quickClientResponse = await fetch('/api/admin/quick-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!quickClientResponse.ok) {
        const error = await quickClientResponse.json();
        throw new Error(error.error || 'Failed to create quick client');
      }

      const { client_id, client_name } = await quickClientResponse.json();
      console.log('[QuickConnect] ✅ Quick client created:', {
        client_id,
        client_name,
      });

      setIsCreatingClient(false);

      // Step 2: Trigger OAuth flow with the created client
      connect({
        clientId: client_id,
        clientName: client_name,
        useCustomOAuthApp: false, // Quick connect uses default OAuth app
        onSuccess: (accountId) => {
          onSuccess?.(client_id, accountId);
        },
        onError,
      });
    } catch (error: any) {
      console.error('[QuickConnect] Error creating quick client:', error);
      const errorMsg = error.message || 'Failed to create quick client';
      setQuickClientError(errorMsg);
      setIsCreatingClient(false);
      onError?.(errorMsg);
    }
  }, [session, connect, onSuccess, onError]);

  // Clear quick client error after 5 seconds
  if (quickClientError) {
    setTimeout(() => {
      setQuickClientError(null);
    }, 5000);
  }

  // Not authenticated - show disabled button
  if (!isAuthenticated) {
    return (
      <Button
        size="$5"
        disabled
        backgroundColor="$gray5"
        borderRadius="$4"
        opacity={0.5}
      >
        <Text color="$gray11" fontWeight="600" fontSize="$4">
          Login Required
        </Text>
      </Button>
    );
  }

  // Combine error messages (quick client error takes precedence during that phase)
  const displayError = quickClientError || errorMessage;

  return (
    <>
      <Button
        size="$5"
        backgroundColor="$zingBlue"
        borderRadius="$4"
        borderWidth={0}
        paddingHorizontal="$5"
        paddingVertical="$3"
        shadowColor="rgba(59, 130, 246, 0.3)"
        shadowRadius={12}
        shadowOffset={{ width: 0, height: 4 }}
        hoverStyle={{
          backgroundColor: '#4A90FF',
          scale: 1.02,
          shadowRadius: 16,
        }}
        pressStyle={{
          scale: 0.98,
          shadowRadius: 8,
        }}
        animation="quick"
        onPress={handleQuickConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <XStack space="$2" alignItems="center">
            <Spinner size="small" color="white" />
            <Text color="white" fontWeight="800" fontSize="$5">
              {isCreatingClient ? 'Creating Client...' : 'Connecting...'}
            </Text>
          </XStack>
        ) : (
          <XStack space="$2" alignItems="center">
            <Zap size={20} color="white" strokeWidth={2.5} />
            <Text color="white" fontWeight="800" fontSize="$5">
              Quick Connect GBP
            </Text>
          </XStack>
        )}
      </Button>

      {/* Success Message */}
      {successMessage && (
        <XStack
          alignItems="center"
          gap="$2"
          padding="$3"
          borderRadius="$3"
          backgroundColor="rgba(16, 185, 129, 0.1)"
          borderWidth={1}
          borderColor="rgba(16, 185, 129, 0.3)"
          marginTop="$3"
        >
          <CheckCircle size={20} color="#10b981" />
          <Text fontSize="$3" color="#10b981" fontWeight="600">
            {successMessage}
          </Text>
        </XStack>
      )}

      {/* Error Message */}
      {displayError && (
        <XStack
          alignItems="center"
          gap="$2"
          padding="$3"
          borderRadius="$3"
          backgroundColor="rgba(239, 68, 68, 0.1)"
          borderWidth={1}
          borderColor="rgba(239, 68, 68, 0.3)"
          marginTop="$3"
        >
          <AlertCircle size={20} color="#ef4444" />
          <Text fontSize="$3" color="#ef4444" fontWeight="600">
            {displayError}
          </Text>
        </XStack>
      )}
    </>
  );
}
