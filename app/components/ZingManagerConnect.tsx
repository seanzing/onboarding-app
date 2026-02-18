// @ts-nocheck
/**
 * GBP Connections Component
 *
 * Shows ALL connected Google Business Profile accounts:
 * 1. Zing Manager Account - Master account with access to multiple profiles
 * 2. Client Accounts - Individual client GBP connections
 *
 * Features:
 * - Connect Zing's GBP Manager account via OAuth
 * - Connect individual client accounts
 * - Shows all connected accounts with their profiles
 * - Uses AllGBPProfilesDashboard for each account
 */

'use client';

import { useState, useEffect } from 'react';
import { Button, XStack, YStack, Text, Spinner, Card, Separator } from 'tamagui';
import { Link2, CheckCircle, AlertCircle, Crown, RefreshCw, Building2, ChevronDown, ChevronUp, Users, Plus, Unlink } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import AllGBPProfilesDashboard from './AllGBPProfilesDashboard';

// Special identifier for the Zing Manager account
const ZING_MANAGER_ID = 'ZING_MANAGER';

interface GBPConnection {
  id: string;
  pipedream_account_id: string;
  account_name: string;
  account_email: string | null;
  external_id: string | null;
  healthy: boolean;
  created_at: string;
  type: 'manager' | 'client';
  client_name?: string;
  client_id?: string;
}

interface AllConnectionsData {
  manager: GBPConnection[];
  clients: GBPConnection[];
  total: number;
}

interface ZingManagerConnectProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function ZingManagerConnect({ onConnectionChange }: ZingManagerConnectProps) {
  const { session } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectingClient, setIsConnectingClient] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // All connections state
  const [allConnections, setAllConnections] = useState<AllConnectionsData | null>(null);
  const [managerClientId, setManagerClientId] = useState<string | null>(null);
  const [hasManagerConnection, setHasManagerConnection] = useState(false);

  // Dashboard visibility state (per account)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Fetch all GBP connections
  useEffect(() => {
    const fetchConnections = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/gbp/manager/connection`);
        if (response.ok) {
          const data = await response.json();
          if (data.allConnections) {
            setAllConnections(data.allConnections);
            setManagerClientId(data.managerClient?.id || null);
            setHasManagerConnection(data.managerClient?.hasConnection || false);

            // Auto-expand all accounts by default
            const allIds = new Set<string>();
            data.allConnections.manager?.forEach((a: GBPConnection) => allIds.add(a.pipedream_account_id));
            data.allConnections.clients?.forEach((a: GBPConnection) => allIds.add(a.pipedream_account_id));
            setExpandedAccounts(allIds);

            onConnectionChange?.(data.allConnections.total > 0);
          }
        }
      } catch (err) {
        console.error('[GBPConnections] Error fetching connections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [session]);

  const toggleAccountExpanded = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleConnectManager = async () => {
    if (!session) {
      setError('You must be logged in to connect the Zing Manager account');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    const oauthSessionId = crypto.randomUUID();
    const attemptTimestamp = new Date().toISOString();

    console.log('[GBPConnections] Starting Zing Manager GBP connection...');

    try {
      // Generate Connect token with ZING_MANAGER identifier
      const tokenResponse = await fetch('/api/public/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: ZING_MANAGER_ID,
          client_name: 'Zing GBP Manager'
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to generate authorization token');
      }

      const tokenData = await tokenResponse.json();

      // Initialize Pipedream SDK
      const { createFrontendClient } = await import('@pipedream/sdk/browser');

      const client = createFrontendClient({
        externalUserId: tokenData.externalUserId,
        tokenCallback: async () => ({ token: tokenData.token })
      });

      const oauthAppId = process.env.NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID;

      await client.connectAccount({
        token: tokenData.token,
        app: 'google_my_business',
        ...(oauthAppId && { oauthAppId }),

        onSuccess: async ({ id: accountId }) => {
          console.log('[GBPConnections] OAuth Success! Account ID:', accountId);

          try {
            // Fetch account details
            let accountName: string | undefined;
            let accountEmail: string | undefined;
            let pipedream_account_full: any;

            try {
              const response = await fetch(`/api/pipedream/fetch-account-details?accountId=${accountId}`);
              if (response.ok) {
                const data = await response.json();
                accountName = data.account.name;
                accountEmail = data.account.email;
                pipedream_account_full = data.account.full;
              }
            } catch (fetchError) {
              console.warn('[GBPConnections] Failed to fetch account details:', fetchError);
              accountName = 'Zing GBP Manager';
            }

            // Save connection
            const saveResponse = await fetch('/api/public/save-connection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client_id: ZING_MANAGER_ID,
                account_id: accountId,
                external_user_id: tokenData.externalUserId,
                app_name: 'google_my_business',
                account_name: accountName,
                account_email: accountEmail,
                pipedream_account_full: pipedream_account_full,
                oauth_session_id: oauthSessionId,
                attempt_timestamp: attemptTimestamp,
                connect_token: tokenData.token,
                is_manager_account: true,
              }),
            });

            if (!saveResponse.ok) {
              const saveError = await saveResponse.json();
              throw new Error(saveError.error || 'Failed to save connection');
            }

            setSuccessMessage(`Connected! Account: ${accountName || accountId}`);
            setIsConnecting(false);

            // Refresh connections
            window.location.reload();

          } catch (saveError: any) {
            console.error('[GBPConnections] Error saving connection:', saveError);
            setError(saveError.message || 'Connected but failed to save');
            setIsConnecting(false);
          }
        },

        onError: (err) => {
          console.error('[GBPConnections] OAuth Error:', err);
          setError(err.message || 'Failed to complete authorization');
          setIsConnecting(false);
        },

        onClose: (status) => {
          if (!status.successful) {
            setIsConnecting(false);
          }
        }
      });

    } catch (error: any) {
      console.error('[GBPConnections] Error during connection:', error);
      setError(error.message || 'Failed to start connection');
      setIsConnecting(false);
    }
  };

  // Handle connecting a client account (non-manager)
  const handleConnectClient = async () => {
    if (!session) {
      setError('You must be logged in to connect a client account');
      return;
    }

    setIsConnectingClient(true);
    setError(null);
    setSuccessMessage(null);

    const oauthSessionId = crypto.randomUUID();
    const attemptTimestamp = new Date().toISOString();
    const clientId = `CLIENT_${Date.now()}`; // Unique client identifier

    console.log('[GBPConnections] Starting client GBP connection...');

    try {
      // Generate Connect token with unique client identifier
      const tokenResponse = await fetch('/api/public/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_name: 'Client GBP Account'
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to generate authorization token');
      }

      const tokenData = await tokenResponse.json();

      // Initialize Pipedream SDK
      const { createFrontendClient } = await import('@pipedream/sdk/browser');

      const client = createFrontendClient({
        externalUserId: tokenData.externalUserId,
        tokenCallback: async () => ({ token: tokenData.token })
      });

      const oauthAppId = process.env.NEXT_PUBLIC_PIPEDREAM_GBP_OAUTH_APP_ID;

      await client.connectAccount({
        token: tokenData.token,
        app: 'google_my_business',
        ...(oauthAppId && { oauthAppId }),

        onSuccess: async ({ id: accountId }) => {
          console.log('[GBPConnections] Client OAuth Success! Account ID:', accountId);

          try {
            // Fetch account details
            let accountName: string | undefined;
            let accountEmail: string | undefined;
            let pipedream_account_full: any;

            try {
              const response = await fetch(`/api/pipedream/fetch-account-details?accountId=${accountId}`);
              if (response.ok) {
                const data = await response.json();
                accountName = data.account.name;
                accountEmail = data.account.email;
                pipedream_account_full = data.account.full;
              }
            } catch (fetchError) {
              console.warn('[GBPConnections] Failed to fetch account details:', fetchError);
              accountName = 'Client Account';
            }

            // Save connection as client account (not manager)
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
                is_manager_account: false, // This is a client account
              }),
            });

            if (!saveResponse.ok) {
              const saveError = await saveResponse.json();
              throw new Error(saveError.error || 'Failed to save connection');
            }

            setSuccessMessage(`Connected! Account: ${accountName || accountEmail || accountId}`);
            setIsConnectingClient(false);

            // Refresh connections
            window.location.reload();

          } catch (saveError: any) {
            console.error('[GBPConnections] Error saving client connection:', saveError);
            setError(saveError.message || 'Connected but failed to save');
            setIsConnectingClient(false);
          }
        },

        onError: (err) => {
          console.error('[GBPConnections] Client OAuth Error:', err);
          setError(err.message || 'Failed to complete authorization');
          setIsConnectingClient(false);
        },

        onClose: (status) => {
          if (!status.successful) {
            setIsConnectingClient(false);
          }
        }
      });

    } catch (error: any) {
      console.error('[GBPConnections] Error during client connection:', error);
      setError(error.message || 'Failed to start connection');
      setIsConnectingClient(false);
    }
  };

  // Handle disconnecting an account
  const handleDisconnect = async (account: GBPConnection) => {
    if (!confirm(`Are you sure you want to disconnect "${account.account_name}"?\n\nThis will remove the connection from Zing but won't revoke Google access.`)) {
      return;
    }

    setDisconnectingId(account.pipedream_account_id);
    setError(null);

    try {
      const response = await fetch('/api/gbp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipedreamAccountId: account.pipedream_account_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }

      setSuccessMessage(`Disconnected ${account.account_name}`);

      // Refresh after short delay
      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      console.error('[GBPConnections] Error disconnecting:', error);
      setError(error.message || 'Failed to disconnect account');
    } finally {
      setDisconnectingId(null);
    }
  };

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  if (!session) {
    return (
      <Card
        elevate
        bordered
        backgroundColor="$background"
        borderColor="rgba(156, 39, 176, 0.2)"
        borderWidth={2}
        borderRadius="$5"
        padding="$6"
      >
        <YStack space="$3" alignItems="center">
          <Crown size={32} color="#9c27b0" strokeWidth={2} />
          <Text fontSize="$5" fontWeight="700" color="$color" textAlign="center">
            Login Required
          </Text>
          <Text fontSize="$3" color="$color" opacity={0.7} textAlign="center">
            You must be logged in to view GBP connections
          </Text>
        </YStack>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card
        elevate
        bordered
        backgroundColor="$background"
        borderColor="rgba(156, 39, 176, 0.2)"
        borderWidth={2}
        borderRadius="$5"
        padding="$6"
      >
        <YStack space="$3" alignItems="center">
          <Spinner size="large" color="#9c27b0" />
          <Text fontSize="$4" color="$color" opacity={0.7}>
            Loading GBP connections...
          </Text>
        </YStack>
      </Card>
    );
  }

  const totalConnections = allConnections?.total || 0;
  const managerAccounts = allConnections?.manager || [];
  const clientAccounts = allConnections?.clients || [];

  // Render an account card
  const renderAccountCard = (account: GBPConnection, isManager: boolean) => {
    const isExpanded = expandedAccounts.has(account.pipedream_account_id);
    const accentColor = isManager ? '#9c27b0' : '#3b82f6';

    return (
      <Card
        key={account.id}
        bordered
        backgroundColor="$background"
        borderColor={`rgba(${isManager ? '156, 39, 176' : '59, 130, 246'}, 0.3)`}
        borderWidth={2}
        borderRadius="$4"
        padding="$5"
        marginBottom="$3"
      >
        <YStack space="$4">
          {/* Account Header */}
          <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$3">
            <XStack alignItems="center" space="$3" flex={1}>
              <YStack
                width={48}
                height={48}
                borderRadius="$3"
                backgroundColor={`rgba(${isManager ? '156, 39, 176' : '59, 130, 246'}, 0.15)`}
                justifyContent="center"
                alignItems="center"
                borderWidth={2}
                borderColor={`rgba(${isManager ? '156, 39, 176' : '59, 130, 246'}, 0.4)`}
              >
                {isManager ? (
                  <Crown size={24} color={accentColor} strokeWidth={2.5} />
                ) : (
                  <Users size={24} color={accentColor} strokeWidth={2.5} />
                )}
              </YStack>
              <YStack flex={1}>
                <XStack alignItems="center" space="$2">
                  <Text fontSize="$5" fontWeight="800" color="$color">
                    {account.account_name}
                  </Text>
                  {account.healthy && (
                    <CheckCircle size={16} color="#10b981" strokeWidth={2.5} />
                  )}
                </XStack>
                <Text fontSize="$3" color="$color" opacity={0.6}>
                  {isManager ? 'Zing Manager Account' : `Client: ${account.client_name || 'Unknown'}`}
                </Text>
                {account.external_id && (
                  <Text fontSize="$2" color="$color" opacity={0.5}>
                    ID: {account.external_id}
                  </Text>
                )}
              </YStack>
            </XStack>

            {/* Type Badge */}
            <XStack
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$2"
              backgroundColor={`rgba(${isManager ? '156, 39, 176' : '59, 130, 246'}, 0.15)`}
            >
              <Text fontSize="$3" fontWeight="700" color={accentColor}>
                {isManager ? 'MANAGER' : 'CLIENT'}
              </Text>
            </XStack>
          </XStack>

          {/* Action Buttons */}
          <XStack gap="$2" flexWrap="wrap">
            {/* Toggle Dashboard Button */}
            <Button
              size="$3"
              flex={1}
              backgroundColor={isExpanded ? `rgba(${isManager ? '156, 39, 176' : '59, 130, 246'}, 0.1)` : accentColor}
              borderWidth={isExpanded ? 2 : 0}
              borderColor={`rgba(${isManager ? '156, 39, 176' : '59, 130, 246'}, 0.3)`}
              borderRadius="$3"
              onPress={() => toggleAccountExpanded(account.pipedream_account_id)}
            >
              <XStack space="$2" alignItems="center">
                {isExpanded ? (
                  <ChevronUp size={16} color={accentColor} strokeWidth={2.5} />
                ) : (
                  <ChevronDown size={16} color="white" strokeWidth={2.5} />
                )}
                <Text color={isExpanded ? accentColor : 'white'} fontWeight="700" fontSize="$3">
                  {isExpanded ? 'Hide GBP Profiles' : 'Show GBP Profiles'}
                </Text>
              </XStack>
            </Button>

            {/* Disconnect Button */}
            <Button
              size="$3"
              backgroundColor="rgba(239, 68, 68, 0.1)"
              borderColor="rgba(239, 68, 68, 0.3)"
              borderWidth={2}
              borderRadius="$3"
              onPress={() => handleDisconnect(account)}
              disabled={disconnectingId === account.pipedream_account_id}
            >
              <XStack space="$2" alignItems="center">
                {disconnectingId === account.pipedream_account_id ? (
                  <Spinner size="small" color="#ef4444" />
                ) : (
                  <Unlink size={16} color="#ef4444" strokeWidth={2.5} />
                )}
                <Text color="#ef4444" fontWeight="700" fontSize="$3">
                  {disconnectingId === account.pipedream_account_id ? 'Disconnecting...' : 'Disconnect'}
                </Text>
              </XStack>
            </Button>
          </XStack>

          {/* Profiles Dashboard */}
          {isExpanded && (
            <YStack space="$3" marginTop="$2">
              <Separator borderColor={`rgba(${isManager ? '156, 39, 176' : '59, 130, 246'}, 0.2)`} />
              <AllGBPProfilesDashboard pipedreamAccountId={account.pipedream_account_id} />
            </YStack>
          )}
        </YStack>
      </Card>
    );
  };

  return (
    <YStack space="$5">
      {/* Summary Header */}
      <Card
        bordered
        backgroundColor="$background"
        borderColor="rgba(16, 185, 129, 0.2)"
        borderWidth={2}
        borderRadius="$4"
        padding="$4"
      >
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$3">
          <XStack alignItems="center" space="$3">
            <Building2 size={24} color="#10b981" strokeWidth={2} />
            <YStack>
              <Text fontSize="$5" fontWeight="700" color="$color">
                {totalConnections} GBP Account{totalConnections !== 1 ? 's' : ''} Connected
              </Text>
              <Text fontSize="$3" color="$color" opacity={0.6}>
                {managerAccounts.length} Manager • {clientAccounts.length} Client
              </Text>
            </YStack>
          </XStack>
          <Button
            size="$3"
            backgroundColor="$zingBlue"
            borderRadius="$3"
            onPress={() => window.location.reload()}
            icon={<RefreshCw size={16} color="white" />}
          >
            <Text color="white" fontWeight="700" fontSize="$3">Refresh</Text>
          </Button>
        </XStack>
      </Card>

      {/* Manager Accounts Section */}
      <YStack space="$3">
        <XStack alignItems="center" space="$2">
          <Crown size={20} color="#9c27b0" strokeWidth={2} />
          <Text fontSize="$6" fontWeight="800" color="$color">
            Zing Manager Account
          </Text>
        </XStack>

        {managerAccounts.length > 0 ? (
          managerAccounts.map(account => renderAccountCard(account, true))
        ) : (
          <Card
            bordered
            backgroundColor="$background"
            borderColor="rgba(156, 39, 176, 0.2)"
            borderWidth={2}
            borderRadius="$4"
            padding="$5"
          >
            <YStack space="$4">
              <YStack
                padding="$4"
                borderRadius="$3"
                backgroundColor="rgba(156, 39, 176, 0.08)"
                borderWidth={1}
                borderColor="rgba(156, 39, 176, 0.3)"
              >
                <Text fontSize="$4" color="$color" opacity={0.8} fontWeight="600">
                  Connect Zing's GBP Manager account to:
                </Text>
                <YStack space="$1" marginTop="$2">
                  <Text fontSize="$3" color="$color" opacity={0.7}>
                    • Access all managed business profiles
                  </Text>
                  <Text fontSize="$3" color="$color" opacity={0.7}>
                    • View and manage multiple GBP locations
                  </Text>
                  <Text fontSize="$3" color="$color" opacity={0.7}>
                    • Link profiles to HubSpot companies
                  </Text>
                </YStack>
              </YStack>

              <Button
                size="$4"
                backgroundColor="#9c27b0"
                borderRadius="$3"
                paddingHorizontal="$5"
                shadowColor="rgba(156, 39, 176, 0.3)"
                shadowRadius={8}
                shadowOffset={{ width: 0, height: 3 }}
                hoverStyle={{ backgroundColor: '#7b1fa2', scale: 1.02 }}
                pressStyle={{ scale: 0.98 }}
                animation="quick"
                onPress={handleConnectManager}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <XStack space="$2" alignItems="center">
                    <Spinner size="small" color="white" />
                    <Text color="white" fontWeight="700" fontSize="$4">
                      Connecting...
                    </Text>
                  </XStack>
                ) : (
                  <XStack space="$2" alignItems="center">
                    <Link2 size={20} color="white" strokeWidth={2.5} />
                    <Text color="white" fontWeight="700" fontSize="$4">
                      Connect Zing Manager Account
                    </Text>
                  </XStack>
                )}
              </Button>
            </YStack>
          </Card>
        )}
      </YStack>

      {/* Client Accounts Section */}
      <YStack space="$3">
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$2">
          <XStack alignItems="center" space="$2">
            <Users size={20} color="#3b82f6" strokeWidth={2} />
            <Text fontSize="$6" fontWeight="800" color="$color">
              Client Accounts ({clientAccounts.length})
            </Text>
          </XStack>
          <Button
            size="$3"
            backgroundColor="#3b82f6"
            borderRadius="$3"
            onPress={handleConnectClient}
            disabled={isConnectingClient}
          >
            <XStack space="$2" alignItems="center">
              {isConnectingClient ? (
                <Spinner size="small" color="white" />
              ) : (
                <Plus size={16} color="white" strokeWidth={2.5} />
              )}
              <Text color="white" fontWeight="700" fontSize="$3">
                {isConnectingClient ? 'Connecting...' : 'Connect Client Account'}
              </Text>
            </XStack>
          </Button>
        </XStack>

        {clientAccounts.length > 0 ? (
          clientAccounts.map(account => renderAccountCard(account, false))
        ) : (
          <Card
            bordered
            backgroundColor="$background"
            borderColor="rgba(59, 130, 246, 0.2)"
            borderWidth={2}
            borderStyle="dashed"
            borderRadius="$4"
            padding="$5"
          >
            <YStack space="$3" alignItems="center">
              <Users size={32} color="#3b82f6" opacity={0.5} />
              <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center">
                No client GBP accounts connected yet
              </Text>
              <Text fontSize="$3" color="$color" opacity={0.5} textAlign="center">
                Connect individual client Google accounts to manage their GBP profiles
              </Text>
            </YStack>
          </Card>
        )}
      </YStack>

      {/* Success Message */}
      {successMessage && (
        <Card
          backgroundColor="rgba(16, 185, 129, 0.1)"
          borderColor="rgba(16, 185, 129, 0.3)"
          borderWidth={1}
          borderRadius="$3"
          padding="$3"
        >
          <XStack alignItems="center" space="$2">
            <CheckCircle size={18} color="#10b981" />
            <Text fontSize="$4" color="#10b981" fontWeight="600">
              {successMessage}
            </Text>
          </XStack>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card
          backgroundColor="rgba(239, 68, 68, 0.1)"
          borderColor="rgba(239, 68, 68, 0.3)"
          borderWidth={1}
          borderRadius="$3"
          padding="$3"
        >
          <XStack alignItems="center" space="$2">
            <AlertCircle size={18} color="#ef4444" />
            <Text fontSize="$4" color="#ef4444" fontWeight="600">
              {error}
            </Text>
          </XStack>
        </Card>
      )}
    </YStack>
  );
}
