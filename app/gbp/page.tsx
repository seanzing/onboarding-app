// @ts-nocheck
/**
 * GBP Dashboard Page
 *
 * Full-page view of all Google Business Profile analytics data.
 * Displays synced data from Supabase (reviews, impressions, keywords, media).
 * Includes Places API search for looking up any business on Google Maps.
 * Shows connected GBP accounts via Pipedream integration.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { YStack, XStack, Text, Card, Button, Tabs, Separator, AnimatePresence, Spinner } from 'tamagui';
import {
  Building2,
  AlertCircle,
  Search,
  Database,
  MapPin,
  TrendingUp,
  Star,
  Sparkles,
  LinkIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import SyncedGBPData from '@/app/components/SyncedGBPData';
import PlacesSearchCard from '@/app/components/PlacesSearchCard';
import ZingManagerConnect from '@/app/components/ZingManagerConnect';
import { useAuth } from '@/app/hooks/useAuth';

interface ConnectedAccount {
  id: string;
  pipedreamAccountId: string;
  appName: string;
  accountName: string | null;
  accountEmail: string | null;
  healthy: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Connected Accounts Tab Component
 * Displays all GBP accounts connected via Pipedream
 */
function ConnectedAccountsTab() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/pipedream/connected-accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch connected accounts');
      }
      const data = await response.json();
      setAccounts(data?.accounts || []);
    } catch (err: any) {
      console.error('[ConnectedAccountsTab] Error:', err);
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  if (loading && !refreshing) {
    return (
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={1}
        borderColor="rgba(0, 0, 0, 0.08)"
        padding="$8"
      >
        <YStack alignItems="center" justifyContent="center" gap="$4">
          <Spinner size="large" color="$zingPurple" />
          <Text color="$color" opacity={0.6}>Loading connected accounts...</Text>
        </YStack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(239, 68, 68, 0.2)"
        padding="$6"
      >
        <YStack alignItems="center" gap="$4">
          <YStack
            width={64}
            height={64}
            borderRadius="$5"
            backgroundColor="rgba(239, 68, 68, 0.1)"
            justifyContent="center"
            alignItems="center"
          >
            <AlertCircle size={32} color="#ef4444" strokeWidth={1.5} />
          </YStack>
          <Text fontSize="$5" fontWeight="700" color="$color">Failed to Load Accounts</Text>
          <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center">{error}</Text>
          <Button
            backgroundColor="$zingBlue"
            borderRadius="$4"
            marginTop="$2"
            onPress={handleRefresh}
            icon={<RefreshCw size={18} color="white" />}
          >
            <Text color="white" fontWeight="700">Try Again</Text>
          </Button>
        </YStack>
      </Card>
    );
  }

  return (
    <YStack gap="$5">
      {/* Header with refresh and connect */}
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$3">
        <YStack gap="$1">
          <Text fontSize="$6" fontWeight="800" color="$color">
            Connected Google Accounts
          </Text>
          <Text fontSize="$4" color="$color" opacity={0.6}>
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected via Pipedream
          </Text>
        </YStack>
        <Button
          size="$3"
          backgroundColor="$zingBlue"
          borderRadius="$3"
          onPress={handleRefresh}
          disabled={refreshing}
          icon={
            <RefreshCw
              size={16}
              color="white"
              style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
            />
          }
        >
          <Text color="white" fontWeight="600" fontSize="$3">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </Button>
      </XStack>

      {/* Connect New Account Card */}
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(139, 92, 246, 0.2)"
        padding="$5"
        shadowColor="rgba(139, 92, 246, 0.1)"
        shadowRadius={12}
        shadowOffset={{ width: 0, height: 4 }}
      >
        <YStack gap="$4">
          <XStack alignItems="center" gap="$3">
            <YStack
              width={48}
              height={48}
              borderRadius="$4"
              justifyContent="center"
              alignItems="center"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              }}
              borderWidth={2}
              borderColor="rgba(139, 92, 246, 0.3)"
            >
              <LinkIcon size={24} color="#8B5CF6" strokeWidth={2} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize="$5" fontWeight="700" color="$color">Connect New Account</Text>
              <Text fontSize="$3" color="$color" opacity={0.6}>
                Link a Google Business Profile to manage your listings
              </Text>
            </YStack>
          </XStack>
          <ZingManagerConnect />
        </YStack>
      </Card>

      {/* Connected Accounts List */}
      {accounts.length === 0 ? (
        <Card
          backgroundColor="$background"
          borderRadius="$5"
          borderWidth={1}
          borderColor="rgba(0, 0, 0, 0.08)"
          padding="$8"
        >
          <YStack alignItems="center" gap="$4">
            <YStack
              width={80}
              height={80}
              borderRadius="$6"
              backgroundColor="rgba(107, 114, 128, 0.1)"
              justifyContent="center"
              alignItems="center"
            >
              <Building2 size={40} color="#6B7280" strokeWidth={1.5} />
            </YStack>
            <YStack alignItems="center" gap="$2">
              <Text fontSize="$6" fontWeight="700" color="$color">No Accounts Connected</Text>
              <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center" maxWidth={400}>
                Connect your Google Business Profile accounts above to start managing your business listings
              </Text>
            </YStack>
          </YStack>
        </Card>
      ) : (
        <YStack gap="$4">
          {accounts.map((account) => (
            <Card
              key={account.id}
              backgroundColor="$background"
              borderRadius="$5"
              borderWidth={2}
              borderColor={account.healthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
              padding="$5"
              shadowColor={account.healthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
              shadowRadius={12}
              shadowOffset={{ width: 0, height: 4 }}
              hoverStyle={{
                borderColor: account.healthy ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              }}
            >
              <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
                <XStack alignItems="center" gap="$4" flex={1}>
                  {/* Status Icon */}
                  <YStack
                    width={56}
                    height={56}
                    borderRadius="$4"
                    backgroundColor={account.healthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                    justifyContent="center"
                    alignItems="center"
                    borderWidth={2}
                    borderColor={account.healthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                  >
                    {account.healthy ? (
                      <CheckCircle2 size={28} color="#10b981" strokeWidth={2} />
                    ) : (
                      <XCircle size={28} color="#ef4444" strokeWidth={2} />
                    )}
                  </YStack>

                  {/* Account Info */}
                  <YStack flex={1} gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <Text fontSize="$5" fontWeight="700" color="$color">
                        {account.accountName || 'Google Business Profile'}
                      </Text>
                      <XStack
                        backgroundColor={account.healthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                        paddingHorizontal="$2"
                        paddingVertical="$1"
                        borderRadius="$2"
                      >
                        <Text
                          fontSize="$2"
                          fontWeight="700"
                          color={account.healthy ? '#10b981' : '#ef4444'}
                          textTransform="uppercase"
                        >
                          {account.healthy ? 'Healthy' : 'Disconnected'}
                        </Text>
                      </XStack>
                    </XStack>

                    {account.accountEmail && (
                      <XStack alignItems="center" gap="$2">
                        <Mail size={14} color="#6B7280" strokeWidth={2} />
                        <Text fontSize="$3" color="$color" opacity={0.7}>
                          {account.accountEmail}
                        </Text>
                      </XStack>
                    )}

                    <XStack alignItems="center" gap="$4" flexWrap="wrap">
                      <XStack alignItems="center" gap="$1">
                        <Text fontSize="$2" color="$color" opacity={0.5}>ID:</Text>
                        <Text fontSize="$2" color="$color" opacity={0.5} fontFamily="$mono">
                          {account.pipedreamAccountId}
                        </Text>
                      </XStack>
                      <XStack alignItems="center" gap="$1">
                        <Text fontSize="$2" color="$color" opacity={0.5}>Connected:</Text>
                        <Text fontSize="$2" color="$color" opacity={0.5}>
                          {new Date(account.createdAt).toLocaleDateString()}
                        </Text>
                      </XStack>
                    </XStack>
                  </YStack>
                </XStack>

                {/* Actions */}
                <XStack gap="$2">
                  <Link href={`/gbp/${account.pipedreamAccountId}/locations`}>
                    <Button
                      size="$3"
                      backgroundColor="$zingBlue"
                      borderRadius="$3"
                      icon={<ExternalLink size={16} color="white" />}
                    >
                      <Text color="white" fontWeight="600" fontSize="$3">View Locations</Text>
                    </Button>
                  </Link>
                </XStack>
              </XStack>
            </Card>
          ))}
        </YStack>
      )}
    </YStack>
  );
}

export default function GBPDashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('synced');

  // Not logged in
  if (!authLoading && !session) {
    return (
      <YStack flex={1} padding="$6" alignItems="center" justifyContent="center">
        <Card
          backgroundColor="$background"
          borderRadius="$6"
          borderWidth={2}
          borderColor="rgba(239, 68, 68, 0.2)"
          padding="$8"
          maxWidth={500}
          shadowColor="rgba(239, 68, 68, 0.1)"
          shadowRadius={20}
          shadowOffset={{ width: 0, height: 8 }}
        >
          <YStack space="$5" alignItems="center">
            <YStack
              width={80}
              height={80}
              borderRadius="$6"
              backgroundColor="rgba(239, 68, 68, 0.1)"
              justifyContent="center"
              alignItems="center"
              borderWidth={2}
              borderColor="rgba(239, 68, 68, 0.3)"
            >
              <AlertCircle size={40} color="#ef4444" strokeWidth={1.5} />
            </YStack>
            <YStack space="$2" alignItems="center">
              <Text fontSize="$7" fontWeight="800" color="$color" textAlign="center">
                Login Required
              </Text>
              <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center" maxWidth={350}>
                Please log in to access your Google Business Profile dashboard and analytics
              </Text>
            </YStack>
            <Link href="/login">
              <Button
                backgroundColor="#ef4444"
                borderRadius="$4"
                marginTop="$3"
                size="$4"
                pressStyle={{ backgroundColor: '#dc2626' }}
              >
                <Text color="white" fontWeight="700" fontSize="$4">Go to Login</Text>
              </Button>
            </Link>
          </YStack>
        </Card>
      </YStack>
    );
  }

  return (
    <YStack
      flex={1}
      padding="$6"
      gap="$6"
      maxWidth={1600}
      marginHorizontal="auto"
      width="100%"
      $sm={{ padding: '$4' }}
    >
      {/* Premium Header */}
      <Card
        backgroundColor="$background"
        borderRadius="$6"
        borderWidth={2}
        borderColor="rgba(59, 130, 246, 0.15)"
        padding="$5"
        shadowColor="rgba(0, 0, 0, 0.05)"
        shadowRadius={12}
        shadowOffset={{ width: 0, height: 4 }}
      >
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$4">
          <XStack alignItems="center" space="$4">
            <YStack
              width={64}
              height={64}
              borderRadius="$5"
              justifyContent="center"
              alignItems="center"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              }}
              borderWidth={2}
              borderColor="rgba(59, 130, 246, 0.3)"
            >
              <Building2 size={32} color="#3b82f6" strokeWidth={2} />
            </YStack>
            <YStack space="$1">
              <XStack alignItems="center" space="$2">
                <Text fontSize="$8" fontWeight="900" color="$color">
                  Google Business Profile
                </Text>
                <Sparkles size={20} color="#f59e0b" strokeWidth={2} />
              </XStack>
              <Text fontSize="$4" color="$color" opacity={0.6}>
                Manage your online presence across Google Search and Maps
              </Text>
            </YStack>
          </XStack>

          {/* Quick Stats Row */}
          <XStack space="$3" flexWrap="wrap">
            <XStack
              backgroundColor="rgba(245, 158, 11, 0.1)"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$3"
              alignItems="center"
              space="$2"
            >
              <Star size={16} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
              <Text fontSize="$3" color="#f59e0b" fontWeight="700">Reviews</Text>
            </XStack>
            <XStack
              backgroundColor="rgba(16, 185, 129, 0.1)"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$3"
              alignItems="center"
              space="$2"
            >
              <MapPin size={16} color="#10b981" strokeWidth={2} />
              <Text fontSize="$3" color="#10b981" fontWeight="700">Locations</Text>
            </XStack>
            <XStack
              backgroundColor="rgba(59, 130, 246, 0.1)"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$3"
              alignItems="center"
              space="$2"
            >
              <TrendingUp size={16} color="#3b82f6" strokeWidth={2} />
              <Text fontSize="$3" color="#3b82f6" fontWeight="700">Analytics</Text>
            </XStack>
          </XStack>
        </XStack>
      </Card>

      {/* Premium Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        orientation="horizontal"
        flexDirection="column"
        width="100%"
      >
        <Card
          backgroundColor="$background"
          borderRadius="$5"
          borderWidth={1}
          borderColor="rgba(0, 0, 0, 0.08)"
          padding="$2"
          marginBottom="$5"
          shadowColor="rgba(0, 0, 0, 0.03)"
          shadowRadius={8}
          shadowOffset={{ width: 0, height: 2 }}
        >
          <Tabs.List
            backgroundColor="transparent"
            borderRadius="$4"
          >
            <Tabs.Tab
              flex={1}
              value="synced"
              backgroundColor={activeTab === 'synced' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
              borderRadius="$4"
              paddingVertical="$3"
              borderWidth={activeTab === 'synced' ? 2 : 0}
              borderColor="rgba(59, 130, 246, 0.3)"
              hoverStyle={{ backgroundColor: activeTab === 'synced' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.03)' }}
            >
              <XStack space="$2" alignItems="center" justifyContent="center">
                <Database size={20} color={activeTab === 'synced' ? '#3b82f6' : '#6b7280'} strokeWidth={2} />
                <Text fontWeight="700" color={activeTab === 'synced' ? '#3b82f6' : '$color'} fontSize="$4">
                  Synced Businesses
                </Text>
              </XStack>
            </Tabs.Tab>
            <Tabs.Tab
              flex={1}
              value="search"
              backgroundColor={activeTab === 'search' ? 'rgba(16, 185, 129, 0.1)' : 'transparent'}
              borderRadius="$4"
              paddingVertical="$3"
              borderWidth={activeTab === 'search' ? 2 : 0}
              borderColor="rgba(16, 185, 129, 0.3)"
              hoverStyle={{ backgroundColor: activeTab === 'search' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.03)' }}
            >
              <XStack space="$2" alignItems="center" justifyContent="center">
                <Search size={20} color={activeTab === 'search' ? '#10b981' : '#6b7280'} strokeWidth={2} />
                <Text fontWeight="700" color={activeTab === 'search' ? '#10b981' : '$color'} fontSize="$4">
                  Business Lookup
                </Text>
              </XStack>
            </Tabs.Tab>
            <Tabs.Tab
              flex={1}
              value="accounts"
              backgroundColor={activeTab === 'accounts' ? 'rgba(139, 92, 246, 0.1)' : 'transparent'}
              borderRadius="$4"
              paddingVertical="$3"
              borderWidth={activeTab === 'accounts' ? 2 : 0}
              borderColor="rgba(139, 92, 246, 0.3)"
              hoverStyle={{ backgroundColor: activeTab === 'accounts' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0, 0, 0, 0.03)' }}
            >
              <XStack space="$2" alignItems="center" justifyContent="center">
                <LinkIcon size={20} color={activeTab === 'accounts' ? '#8B5CF6' : '#6b7280'} strokeWidth={2} />
                <Text fontWeight="700" color={activeTab === 'accounts' ? '#8B5CF6' : '$color'} fontSize="$4">
                  Connected Accounts
                </Text>
              </XStack>
            </Tabs.Tab>
          </Tabs.List>
        </Card>

        {/* Tab Content with Animation */}
        <AnimatePresence>
          <Tabs.Content
            value="synced"
            animation="quick"
            enterStyle={{ opacity: 0, y: 10 }}
            exitStyle={{ opacity: 0, y: -10 }}
          >
            <SyncedGBPData />
          </Tabs.Content>

          <Tabs.Content
            value="search"
            animation="quick"
            enterStyle={{ opacity: 0, y: 10 }}
            exitStyle={{ opacity: 0, y: -10 }}
          >
            <PlacesSearchCard />
          </Tabs.Content>

          <Tabs.Content
            value="accounts"
            animation="quick"
            enterStyle={{ opacity: 0, y: 10 }}
            exitStyle={{ opacity: 0, y: -10 }}
          >
            <ConnectedAccountsTab />
          </Tabs.Content>
        </AnimatePresence>
      </Tabs>
    </YStack>
  );
}
