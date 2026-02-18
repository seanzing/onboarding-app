// @ts-nocheck
/**
 * Public Client Authorization Page
 *
 * This page allows clients to authorize their Google Business Profile
 * without logging into our app. Only requires the client ID in the URL.
 *
 * Flow:
 * 1. Client receives link from agency: /connect/[clientId]
 * 2. Client clicks "Connect Google Business Profile"
 * 3. OAuth flow with external_id = client_${clientId}
 * 4. Success page shows connection confirmed
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Building2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Button, YStack, XStack, Text, Card, H1, H2, Spinner } from 'tamagui';
import { createClient } from '@/lib/supabase/client';

interface ClientInfo {
  id: string;
  name: string;
  business_name?: string;
  email?: string;
  status: string;
}

interface ConnectedAccount {
  id: string;
  account_name?: string;
  account_email?: string;
  created_at: string;
}

export default function ClientConnectPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionComplete, setConnectionComplete] = useState(false);

  // Fetch client info and check if already connected
  useEffect(() => {
    async function fetchClientInfo() {
      try {
        const response = await fetch(`/api/public/client/${clientId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Invalid authorization link. Please contact your agency.');
          } else {
            throw new Error('Failed to load client information');
          }
          return;
        }

        const data = await response.json();
        setClient(data.client);
        setConnectedAccount(data.connectedAccount);
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('Unable to load authorization page. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchClientInfo();
  }, [clientId]);

  // Handle OAuth connection using Pipedream SDK
  const handleConnect = async () => {
    setIsConnecting(true);

    // Generate unique OAuth session ID for this specific connection attempt
    // This ensures EVERY button click gets a globally unique ID that has never been used
    const oauthSessionId = crypto.randomUUID();
    const attemptTimestamp = new Date().toISOString();

    console.log('[ClientConnect SDK] 🆔 Generated UNIQUE OAuth Session ID:', oauthSessionId);
    console.log('[ClientConnect SDK] Generating Connect token for client:', clientId);

    try {
      // Step 1: Generate Pipedream Connect token via public API
      const tokenResponse = await fetch('/api/public/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error('[ClientConnect SDK] Token generation failed:', error);
        setError(error.error || 'Failed to generate authorization token');
        setIsConnecting(false);
        return;
      }

      const tokenData = await tokenResponse.json();
      console.log('[ClientConnect SDK] Connect token generated:', {
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
        externalUserId: tokenData.externalUserId,
        oauthSessionId: oauthSessionId,
      });

      // Step 2: Import and initialize Pipedream SDK dynamically
      const { createFrontendClient } = await import('@pipedream/sdk/browser');

      // Step 3: Create client
      const client = createFrontendClient({
        externalUserId: tokenData.externalUserId,
        tokenCallback: async () => {
          // Return the token we just fetched
          return { token: tokenData.token };
        }
      });

      console.log('[ClientConnect SDK] Opening OAuth popup/modal...');

      // Step 4: Use SDK to handle OAuth in popup with callbacks
      await client.connectAccount({
        token: tokenData.token,
        app: 'google_my_business',

        onSuccess: async ({ id: accountId }) => {
          console.log('[ClientConnect SDK] ✅ OAuth Success! Account ID:', accountId);

          try {
            // Step 5: Fetch account details from Pipedream using Server SDK
            console.log('[ClientConnect SDK] Fetching account details from backend...');

            let accountName: string | undefined;
            let accountEmail: string | undefined;
            let pipedream_account_full: any;

            try {
              const response = await fetch(`/api/pipedream/fetch-account-details?accountId=${accountId}`);

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const data = await response.json();
              console.log('[ClientConnect SDK] ✅ Fetched account details:', data.account);

              accountName = data.account.name;
              accountEmail = data.account.email;
              pipedream_account_full = data.account.full;
            } catch (fetchError: any) {
              console.warn('[ClientConnect SDK] Failed to fetch account details:', fetchError);
              // Fallback to client's business name
              accountName = client?.business_name || client?.name || 'Client Account';
              accountEmail = client?.email;
              console.log('[ClientConnect SDK] Using fallback client info:', {
                accountName,
                accountEmail,
              });
            }

            // Step 6: Save connection to database with account details
            console.log('[ClientConnect SDK] Saving connection to database...');
            console.log('[ClientConnect SDK] 🆔 OAuth Session ID:', oauthSessionId);

            const saveResponse = await fetch('/api/public/save-connection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                // Client linkage
                client_id: clientId,

                // Pipedream account identification
                account_id: accountId,
                external_user_id: tokenData.externalUserId,

                // App info
                app_name: 'google_my_business',

                // Account details (fetched from Pipedream SDK)
                account_name: accountName,
                account_email: accountEmail,
                pipedream_account_full: pipedream_account_full,

                // OAuth session tracking (UNIQUE per attempt)
                oauth_session_id: oauthSessionId,
                attempt_timestamp: attemptTimestamp,

                // Connect token metadata (for reference only)
                connect_token: tokenData.token,
                connect_token_expires_at: tokenData.expiresAt,
              }),
            });

            if (!saveResponse.ok) {
              const saveError = await saveResponse.json();
              console.error('[ClientConnect SDK] Failed to save connection:', saveError);
              setError(saveError.error || 'Failed to save connection');
              setIsConnecting(false);
              return;
            }

            const saveData = await saveResponse.json();
            console.log('[ClientConnect SDK] Connection saved successfully!');
            console.log('[ClientConnect SDK] Database Row ID:', saveData.account?.id);
            console.log('[ClientConnect SDK] Account Name:', saveData.account?.account_name);
            console.log('[ClientConnect SDK] 🆔 OAuth Session ID:', oauthSessionId);

            // Step 6: Show success state
            setConnectionComplete(true);
            setConnectedAccount({
              id: accountId,
              account_name: saveData.account?.account_name,
              account_email: saveData.account?.account_email,
              created_at: new Date().toISOString(),
            });
          } catch (saveError: any) {
            console.error('[ClientConnect SDK] Error saving connection:', saveError);
            setError(saveError.message || 'Connected but failed to save to database');
            setIsConnecting(false);
          }
        },

        onError: (err) => {
          console.error('[ClientConnect SDK] ❌ OAuth Error:', err);
          setError(err.message || 'Failed to complete authorization');
          setIsConnecting(false);
        },

        onClose: (status) => {
          console.log('[ClientConnect SDK] OAuth dialog closed:', status);
          if (!status.successful) {
            console.log('[ClientConnect SDK] User closed without completing authorization');
            setIsConnecting(false);
          }
        }
      });

    } catch (error: any) {
      console.error('[ClientConnect SDK] Error during connection:', error);
      console.error('[ClientConnect SDK] 🆔 Failed OAuth Session ID:', oauthSessionId);
      setError(error.message || 'Failed to start authorization process');
      setIsConnecting(false);
    }
  };

  // Check for success query param (from callback redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setConnectionComplete(true);
      // Refetch to show the new connection
      window.location.search = ''; // Clear query params
    }
  }, []);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" padding="$4">
        <Spinner size="large" color="$color" />
        <Text marginTop="$4" color="$color" opacity={0.7}>
          Loading authorization page...
        </Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" padding="$4">
        <Card
          size="$4"
          bordered
          padding="$4"
          backgroundColor="$red2"
          borderColor="$red6"
          maxWidth={500}
          width="100%"
        >
          <XStack alignItems="center" gap="$3">
            <AlertCircle size={24} color="$red10" />
            <YStack flex={1}>
              <Text fontSize="$5" fontWeight="600" color="$red11">
                Authorization Error
              </Text>
              <Text fontSize="$3" color="$red11" marginTop="$2">
                {error}
              </Text>
            </YStack>
          </XStack>
        </Card>
      </YStack>
    );
  }

  // Already connected
  if (connectedAccount) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" padding="$4">
        <Card
          size="$4"
          bordered
          padding="$4"
          backgroundColor="$green2"
          borderColor="$green6"
          maxWidth={600}
          width="100%"
        >
          <YStack alignItems="center" gap="$4">
            <CheckCircle size={64} color="$green10" />

            <H1 fontSize="$8" textAlign="center" color="$green11">
              Already Connected
            </H1>

            <Text fontSize="$5" textAlign="center" color="$green11">
              {client?.business_name || client?.name}'s Google Business Profile is already connected to Zing Work.
            </Text>

            <Card padding="$3" backgroundColor="$green3" width="100%">
              <YStack gap="$2">
                <XStack justifyContent="space-between">
                  <Text fontSize="$3" color="$green11" opacity={0.8}>
                    Account:
                  </Text>
                  <Text fontSize="$3" fontWeight="600" color="$green11">
                    {connectedAccount.account_name || connectedAccount.account_email || 'Connected'}
                  </Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize="$3" color="$green11" opacity={0.8}>
                    Connected:
                  </Text>
                  <Text fontSize="$3" fontWeight="600" color="$green11">
                    {new Date(connectedAccount.created_at).toLocaleDateString()}
                  </Text>
                </XStack>
              </YStack>
            </Card>

            <Text fontSize="$3" textAlign="center" color="$green11" opacity={0.8}>
              No further action is required. Your agency can now manage your business profile.
            </Text>
          </YStack>
        </Card>
      </YStack>
    );
  }

  // Connection successful
  if (connectionComplete) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" padding="$4">
        <Card
          size="$4"
          bordered
          padding="$4"
          backgroundColor="$green2"
          borderColor="$green6"
          maxWidth={600}
          width="100%"
        >
          <YStack alignItems="center" gap="$4">
            <CheckCircle size={64} color="$green10" />

            <H1 fontSize="$8" textAlign="center" color="$green11">
              Success!
            </H1>

            <Text fontSize="$5" textAlign="center" color="$green11">
              Your Google Business Profile has been successfully connected to Zing Work.
            </Text>

            <Text fontSize="$4" textAlign="center" color="$green11" opacity={0.8}>
              Your agency can now manage your business profile. You can safely close this page.
            </Text>
          </YStack>
        </Card>
      </YStack>
    );
  }

  // Ready to connect
  return (
    <YStack flex={1} backgroundColor="$background" minHeight="100vh">
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <YStack flex={1} maxWidth={1200} marginHorizontal="auto" width="100%">
          <XStack alignItems="center" gap="$2">
            <Shield size={32} color="$zingPurple" />
            <Text fontSize="$6" fontWeight="700" color="$color">
              Zing Work Agency
            </Text>
          </XStack>
        </YStack>
      </XStack>

      {/* Main Content */}
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Card
          size="$4"
          bordered
          padding="$6"
          maxWidth={700}
          width="100%"
          backgroundColor="$background"
        >
          <YStack gap="$5">
            {/* Icon and Title */}
            <YStack alignItems="center" gap="$3">
              <YStack
                backgroundColor="$zingPurple"
                padding="$3"
                borderRadius="$4"
              >
                <Building2 size={48} color="white" />
              </YStack>

              <H1 fontSize="$9" textAlign="center" color="$color">
                Connect Your Business
              </H1>
            </YStack>

            {/* Client Info */}
            <Card padding="$4" backgroundColor="$gray2">
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  {client?.business_name || client?.name}
                </Text>
                {client?.email && (
                  <Text fontSize="$3" color="$color" opacity={0.7}>
                    {client.email}
                  </Text>
                )}
              </YStack>
            </Card>

            {/* Instructions */}
            <YStack gap="$3">
              <H2 fontSize="$5" color="$color">
                Authorize Zing Work to manage your Google Business Profile:
              </H2>

              <YStack gap="$2" paddingLeft="$3">
                <Text fontSize="$4" color="$color">
                  ✓ View your business information
                </Text>
                <Text fontSize="$4" color="$color">
                  ✓ Update business details and hours
                </Text>
                <Text fontSize="$4" color="$color">
                  ✓ Manage photos and posts
                </Text>
                <Text fontSize="$4" color="$color">
                  ✓ Respond to reviews and messages
                </Text>
                <Text fontSize="$4" color="$color">
                  ✓ View performance insights
                </Text>
              </YStack>
            </YStack>

            {/* Privacy Notice */}
            <Card padding="$3" backgroundColor="$blue2" borderColor="$blue6">
              <XStack gap="$2">
                <Shield size={20} color="$blue10" style={{ flexShrink: 0 }} />
                <Text fontSize="$3" color="$blue11">
                  Your data is secure. Zing Work will only access your Google Business Profile
                  to provide management services. You can revoke access at any time through your
                  Google Account settings.
                </Text>
              </XStack>
            </Card>

            {/* Connect Button */}
            <Button
              size="$6"
              backgroundColor="$zingPurple"
              borderRadius="$4"
              onPress={handleConnect}
              disabled={isConnecting}
              pressStyle={{ scale: 0.98 }}
              animation="quick"
            >
              {isConnecting ? (
                <XStack alignItems="center" gap="$2">
                  <Spinner size="small" color="white" />
                  <Text fontSize="$5" fontWeight="600" color="white">
                    Connecting...
                  </Text>
                </XStack>
              ) : (
                <XStack alignItems="center" gap="$2">
                  <Building2 size={24} color="white" />
                  <Text fontSize="$5" fontWeight="600" color="white">
                    Connect Google Business Profile
                  </Text>
                </XStack>
              )}
            </Button>

            {/* Footer */}
            <Text fontSize="$2" textAlign="center" color="$color" opacity={0.5}>
              By connecting, you agree to allow Zing Work to manage your Google Business Profile
              on your behalf. This authorization can be revoked at any time.
            </Text>
          </YStack>
        </Card>
      </YStack>
    </YStack>
  );
}