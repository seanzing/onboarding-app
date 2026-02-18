// @ts-nocheck
/**
 * Settings Page
 *
 * Professional settings page with:
 * - Service status monitoring (HubSpot, Supabase)
 * - Google Business Profile connection via ZingManagerConnect
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { YStack, XStack, Text, Card, Button, Spinner, Separator } from 'tamagui';
import {
  Settings,
  Crown,
  Building2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Globe,
  Zap,
} from 'lucide-react';
import ClientOnly from '../components/ClientOnly';
import ZingManagerConnect from '../components/ZingManagerConnect';
import { useAuth } from '@/app/hooks/useAuth';

interface ServiceStatus {
  success: boolean;
  service: string;
  status: 'connected' | 'error';
  message: string;
  timestamp: string;
  data?: Record<string, any>;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [hubspotStatus, setHubspotStatus] = useState<ServiceStatus | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Client-side auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/settings');
    }
  }, [user, authLoading, router]);

  const fetchStatuses = async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      const [hubspot, supabase] = await Promise.all([
        fetch('/api/admin/hubspot-status').then((res) => res.json()),
        fetch('/api/admin/supabase-status').then((res) => res.json()),
      ]);

      setHubspotStatus(hubspot);
      setSupabaseStatus(supabase);
    } catch (error) {
      console.error('[Settings] Error fetching statuses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatuses();
    }
  }, [user]);

  const renderServiceCard = (
    service: ServiceStatus | null,
    icon: React.ReactNode
  ) => {
    if (!service) {
      return (
        <Card
          flex={1}
          minWidth={320}
          backgroundColor="$background"
          borderColor="rgba(107, 114, 128, 0.2)"
          borderWidth={2}
          borderRadius="$5"
          padding="$5"
        >
          <YStack alignItems="center" justifyContent="center" height={120}>
            <Spinner size="large" color="$color" />
          </YStack>
        </Card>
      );
    }

    const isConnected = service.success && service.status === 'connected';

    return (
      <Card
        flex={1}
        minWidth={320}
        backgroundColor="$background"
        borderColor={isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
        borderWidth={2}
        borderRadius="$5"
        padding="$5"
        shadowColor={isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
        shadowRadius={12}
        shadowOffset={{ width: 0, height: 4 }}
        $sm={{ padding: '$4', minWidth: 280 }}
      >
        <YStack gap="$4">
          {/* Header */}
          <XStack alignItems="center" gap="$3">
            <YStack
              width={52}
              height={52}
              borderRadius="$4"
              backgroundColor={isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
              justifyContent="center"
              alignItems="center"
              borderWidth={2}
              borderColor={isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
              $sm={{ width: 44, height: 44 }}
            >
              {icon}
            </YStack>
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="800" color="$color" $sm={{ fontSize: '$5' }}>
                {service.service}
              </Text>
              <XStack alignItems="center" gap="$2" marginTop="$1">
                {isConnected ? (
                  <>
                    <CheckCircle2 size={18} color="#10b981" strokeWidth={2.5} />
                    <Text fontSize="$4" color="#10b981" fontWeight="700" $sm={{ fontSize: '$3' }}>
                      Connected
                    </Text>
                  </>
                ) : (
                  <>
                    <XCircle size={18} color="#ef4444" strokeWidth={2.5} />
                    <Text fontSize="$4" color="#ef4444" fontWeight="700" $sm={{ fontSize: '$3' }}>
                      Error
                    </Text>
                  </>
                )}
              </XStack>
            </YStack>
          </XStack>

          {/* Message */}
          <YStack
            padding="$4"
            borderRadius="$4"
            backgroundColor={isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}
            $sm={{ padding: '$3' }}
          >
            <Text fontSize="$4" color="$color" fontWeight="500" lineHeight={22} $sm={{ fontSize: '$3' }}>
              {service.message}
            </Text>
          </YStack>
        </YStack>
      </Card>
    );
  };

  // Loading state
  if (authLoading) {
    return (
      <ClientOnly>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight="80vh" gap="$5">
          <Spinner size="large" color="$zingPurple" />
          <Text fontSize="$6" fontWeight="600" color="$color">
            Checking authentication...
          </Text>
        </YStack>
      </ClientOnly>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return null;
  }

  return (
    <ClientOnly>
      <YStack
        width="100%"
        maxWidth={1200}
        marginHorizontal="auto"
        gap="$6"
        padding="$6"
        $sm={{ padding: '$4', gap: '$5' }}
        $md={{ padding: '$5', gap: '$5' }}
      >
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
          <YStack gap="$2" flex={1}>
            <XStack alignItems="center" gap="$3">
              <YStack
                width={52}
                height={52}
                borderRadius="$4"
                backgroundColor="rgba(107, 114, 128, 0.15)"
                alignItems="center"
                justifyContent="center"
              >
                <Settings size={26} color="#6B7280" />
              </YStack>
              <YStack>
                <Text fontSize="$4" color="$color" opacity={0.7} $sm={{ fontSize: '$3' }}>
                  Manage integrations and service connections
                </Text>
              </YStack>
            </XStack>
          </YStack>
          <Button
            size="$4"
            backgroundColor="$zingBlue"
            borderRadius="$4"
            onPress={fetchStatuses}
            disabled={refreshing}
            icon={
              <RefreshCw
                size={18}
                color="white"
                style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
              />
            }
            hoverStyle={{ backgroundColor: '#4A90FF' }}
            pressStyle={{ scale: 0.98 }}
          >
            <Text color="white" fontWeight="700" fontSize="$4">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </Button>
        </XStack>

        {/* Service Status Section */}
        <YStack gap="$4">
          <XStack alignItems="center" gap="$2">
            <Zap size={22} color="#3B82F6" strokeWidth={2} />
            <Text fontSize="$6" fontWeight="800" color="$color">
              Service Connections
            </Text>
          </XStack>
          <Text fontSize="$4" color="$color" opacity={0.6}>
            Monitor the health of your integrated services
          </Text>

          {/* Service Cards Grid */}
          <XStack gap="$4" flexWrap="wrap">
            {renderServiceCard(
              hubspotStatus,
              <Database
                size={26}
                color={hubspotStatus?.success ? '#10b981' : '#ef4444'}
                strokeWidth={2}
              />
            )}
            {renderServiceCard(
              supabaseStatus,
              <Globe
                size={26}
                color={supabaseStatus?.success ? '#10b981' : '#ef4444'}
                strokeWidth={2}
              />
            )}
          </XStack>
        </YStack>

        <Separator borderColor="rgba(107, 114, 128, 0.2)" />

        {/* Google Business Profile Section */}
        <Card
          backgroundColor="$background"
          borderRadius="$5"
          borderWidth={2}
          borderColor="rgba(139, 92, 246, 0.2)"
          padding="$6"
          shadowColor="rgba(139, 92, 246, 0.1)"
          shadowRadius={12}
          shadowOffset={{ width: 0, height: 4 }}
          $sm={{ padding: '$5' }}
        >
          <YStack gap="$4">
            <XStack alignItems="center" gap="$3">
              <YStack
                width={56}
                height={56}
                borderRadius="$4"
                justifyContent="center"
                alignItems="center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                }}
                borderWidth={2}
                borderColor="rgba(139, 92, 246, 0.3)"
              >
                <Crown size={28} color="#8B5CF6" strokeWidth={2} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$6" fontWeight="800" color="$color">
                  Google Business Profile
                </Text>
                <Text fontSize="$4" color="$color" opacity={0.6}>
                  Connect your Google Business Profile accounts to manage your listings
                </Text>
              </YStack>
            </XStack>

            {/* Connect Component */}
            <ZingManagerConnect />
          </YStack>
        </Card>

        {/* Info Card */}
        <Card
          backgroundColor="rgba(59, 130, 246, 0.05)"
          borderRadius="$4"
          borderWidth={1}
          borderColor="rgba(59, 130, 246, 0.2)"
          padding="$4"
        >
          <XStack gap="$3" alignItems="center">
            <Building2 size={20} color="#3b82f6" strokeWidth={2} />
            <Text fontSize="$4" color="$color" opacity={0.7} flex={1}>
              Once connected, you can view and manage all your Google Business Profile locations
              from the Google Profiles page.
            </Text>
          </XStack>
        </Card>
      </YStack>
    </ClientOnly>
  );
}
