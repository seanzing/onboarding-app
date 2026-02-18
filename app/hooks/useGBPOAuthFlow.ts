/**
 * useGBPOAuthFlow Hook
 *
 * Shared hook for Google Business Profile OAuth flow via Pipedream.
 * Consolidates duplicate logic from ConnectGBPButton and QuickConnectGBPButton.
 *
 * Responsibilities:
 * 1. Generate OAuth session ID
 * 2. Fetch Pipedream Connect token
 * 3. Initialize Pipedream SDK and trigger OAuth
 * 4. Fetch account details after successful auth
 * 5. Save connection to database
 * 6. Manage success/error state with auto-clear
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface GBPOAuthFlowOptions {
  clientId: string;
  clientName: string;
  useCustomOAuthApp?: boolean;
  onSuccess?: (accountId: string) => void;
  onError?: (error: string) => void;
}

export interface GBPOAuthFlowState {
  isConnecting: boolean;
  successMessage: string | null;
  errorMessage: string | null;
}

export interface GBPOAuthFlowReturn extends GBPOAuthFlowState {
  connect: (options: GBPOAuthFlowOptions) => Promise<void>;
  clearMessages: () => void;
  isAuthenticated: boolean;
}

/**
 * Hook for managing GBP OAuth flow via Pipedream Connect
 */
export function useGBPOAuthFlow(): GBPOAuthFlowReturn {
  const { session } = useAuth();
  const [state, setState] = useState<GBPOAuthFlowState>({
    isConnecting: false,
    successMessage: null,
    errorMessage: null,
  });

  // Track timeout IDs for cleanup (works in both browser and Node.js)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Clear success/error messages
   */
  const clearMessages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      successMessage: null,
      errorMessage: null,
    }));
  }, []);

  /**
   * Auto-clear messages after 5 seconds
   */
  const scheduleMessageClear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      clearMessages();
    }, 5000);
  }, [clearMessages]);

  /**
   * Set error and trigger auto-clear
   */
  const setError = useCallback(
    (message: string) => {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        errorMessage: message,
      }));
      scheduleMessageClear();
    },
    [scheduleMessageClear]
  );

  /**
   * Set success and trigger auto-clear
   */
  const setSuccess = useCallback(
    (message: string) => {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        successMessage: message,
      }));
      scheduleMessageClear();
    },
    [scheduleMessageClear]
  );

  /**
   * Main OAuth flow execution
   */
  const connect = useCallback(
    async (options: GBPOAuthFlowOptions) => {
      const { clientId, clientName, useCustomOAuthApp = true, onSuccess, onError } = options;

      // Validate session
      if (!session) {
        const error = 'You must be logged in to connect Google Business Profile';
        setError(error);
        onError?.(error);
        return;
      }

      // Start connecting
      setState({
        isConnecting: true,
        successMessage: null,
        errorMessage: null,
      });

      // Generate unique OAuth session ID for tracking/debugging
      const oauthSessionId = crypto.randomUUID();
      const attemptTimestamp = new Date().toISOString();

      console.log('[GBPOAuth] 🆔 OAuth Session ID:', oauthSessionId);
      console.log('[GBPOAuth] Starting OAuth flow...');
      console.log('[GBPOAuth] Client ID:', clientId);
      console.log('[GBPOAuth] Client Name:', clientName);

      try {
        // Step 1: Generate Pipedream Connect token
        console.log('[GBPOAuth] Generating Connect token...');

        const tokenResponse = await fetch('/api/public/connect-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_name: clientName,
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error || 'Failed to generate authorization token');
        }

        const tokenData = await tokenResponse.json();
        console.log('[GBPOAuth] ✅ Connect token generated:', {
          token: tokenData.token,
          externalUserId: tokenData.externalUserId,
        });

        // Step 2: Import and initialize Pipedream SDK
        console.log('[GBPOAuth] Initializing Pipedream SDK...');

        const { createFrontendClient } = await import('@pipedream/sdk/browser');

        const client = createFrontendClient({
          externalUserId: tokenData.externalUserId,
          tokenCallback: async () => {
            // Return the full token response required by Pipedream SDK
            return {
              token: tokenData.token,
              connectLinkUrl: tokenData.connectLinkUrl || '',
              expiresAt: tokenData.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            };
          },
        });

        console.log('[GBPOAuth] Opening OAuth popup...');

        // Step 3: Trigger OAuth with Pipedream SDK
        const oauthAppId = useCustomOAuthApp
          ? process.env.NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID
          : undefined;

        if (oauthAppId) {
          console.log('[GBPOAuth] Using custom OAuth App ID:', oauthAppId);
        }

        await client.connectAccount({
          token: tokenData.token,
          app: 'google_my_business',
          ...(oauthAppId && { oauthAppId }),

          onSuccess: async ({ id: accountId }) => {
            console.log('[GBPOAuth] ✅ OAuth Success! Account ID:', accountId);

            try {
              // Fetch account details from Pipedream
              console.log('[GBPOAuth] Fetching account details...');

              let accountName: string | undefined;
              let accountEmail: string | undefined;
              let pipedream_account_full: any;

              try {
                const response = await fetch(
                  `/api/pipedream/fetch-account-details?accountId=${accountId}`
                );

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log('[GBPOAuth] ✅ Fetched account details:', data.account);

                accountName = data.account.name;
                accountEmail = data.account.email;
                pipedream_account_full = data.account.full;
              } catch (fetchError: any) {
                console.warn('[GBPOAuth] Failed to fetch account details:', fetchError);
                accountName = clientName;
                accountEmail = undefined;
              }

              // Save connection to database
              console.log('[GBPOAuth] Saving connection to database...');
              console.log('[GBPOAuth] 🆔 OAuth Session ID:', oauthSessionId);
              console.log('[GBPOAuth] 🏢 Client ID:', clientId);

              const saveResponse = await fetch('/api/public/save-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  client_id: clientId,
                  account_id: accountId,
                  external_user_id: tokenData.externalUserId,
                  app_name: 'google_my_business',
                  account_name: accountName,
                  account_email: accountEmail,
                  pipedream_account_full: pipedream_account_full,
                  oauth_session_id: oauthSessionId,
                  attempt_timestamp: attemptTimestamp,
                  connect_token: tokenData.token,
                  connect_token_expires_at: tokenData.expiresAt,
                }),
              });

              if (!saveResponse.ok) {
                const saveError = await saveResponse.json();
                throw new Error(saveError.error || 'Failed to save connection');
              }

              const saveData = await saveResponse.json();
              console.log('[GBPOAuth] ✅ Connection saved successfully!');
              console.log('[GBPOAuth] Database Row ID:', saveData.account?.id);
              console.log('[GBPOAuth] Account Name:', saveData.account?.account_name);
              console.log('[GBPOAuth] 🆔 OAuth Session ID:', oauthSessionId);

              // Show success
              const success = `✅ Connected! Account: ${saveData.account?.account_name || accountId}`;
              setSuccess(success);
              onSuccess?.(accountId);
            } catch (saveError: any) {
              console.error('[GBPOAuth] Error saving connection:', saveError);
              const error = saveError.message || 'Connected but failed to save to database';
              setError(error);
              onError?.(error);
            }
          },

          onError: (err) => {
            console.error('[GBPOAuth] ❌ OAuth Error:', err);
            const error = err.message || 'Failed to complete authorization';
            setError(error);
            onError?.(error);
          },

          onClose: (status) => {
            console.log('[GBPOAuth] OAuth dialog closed:', status);
            if (!status.successful) {
              console.log('[GBPOAuth] User closed without completing authorization');
              setState((prev) => ({ ...prev, isConnecting: false }));
            }
          },
        });
      } catch (error: any) {
        console.error('[GBPOAuth] Error during connection:', error);
        console.error('[GBPOAuth] 🆔 Failed OAuth Session ID:', oauthSessionId);
        const errorMsg = error.message || 'Failed to start connection';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    },
    [session, setError, setSuccess]
  );

  return {
    ...state,
    connect,
    clearMessages,
    isAuthenticated: !!session,
  };
}
