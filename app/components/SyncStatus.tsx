// @ts-nocheck
/**
 * Sync Status Component
 *
 * Displays sync button, status, and last sync timestamp.
 * Used in the dashboard to manually trigger HubSpot customer sync.
 */

'use client'

import { useState, useEffect } from 'react'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useCustomerSync } from '@/app/hooks/useCustomerSync'

// Simple time ago helper
function timeAgo(date: string): string {
  const now = new Date().getTime()
  const then = new Date(date).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

interface SyncStatusProps {
  onSyncComplete?: () => void
  compact?: boolean
}

interface LastSyncData {
  id: string
  sync_type: string
  status: string
  contacts_synced: number
  contacts_skipped: number
  errors: number
  duration_ms: number
  triggered_by: string
  created_at: string
}

export function SyncStatus({ onSyncComplete, compact = false }: SyncStatusProps) {
  const { triggerSync, isRunning, lastResult, error } = useCustomerSync()
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [lastSync, setLastSync] = useState<LastSyncData | null>(null)
  const [loadingLastSync, setLoadingLastSync] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // Fetch last sync on mount and after each sync
  useEffect(() => {
    fetchLastSync()
  }, [])

  const fetchLastSync = async () => {
    try {
      setLoadingLastSync(true)
      const response = await fetch('/api/sync/customers/last')
      const data = await response.json()
      setLastSync(data.lastSync)
    } catch (err) {
      console.error('Failed to fetch last sync:', err)
    } finally {
      setLoadingLastSync(false)
    }
  }

  const handleSync = async () => {
    try {
      const result = await triggerSync()

      // Show success toast
      setToastMessage(`✅ Synced ${result.synced} customers in ${result.duration}`)
      setToastType('success')
      setShowToast(true)

      // Refresh last sync data
      await fetchLastSync()

      // Call callback if provided
      if (onSyncComplete) {
        onSyncComplete()
      }

      // Hide toast after 5 seconds
      setTimeout(() => setShowToast(false), 5000)
    } catch (err: any) {
      // Show error toast
      setToastMessage(`❌ Sync failed: ${err.message}`)
      setToastType('error')
      setShowToast(true)

      // Hide toast after 5 seconds
      setTimeout(() => setShowToast(false), 5000)
    }
  }

  // Compact mode for dashboard
  if (compact) {
    return (
      <YStack alignItems="flex-end" space="$1.5">
        <Button
          size="$3"
          onPress={handleSync}
          disabled={isRunning}
          backgroundColor={isRunning ? 'rgba(170, 64, 255, 0.7)' : 'rgba(170, 64, 255, 1)'}
          borderRadius="$3"
          borderWidth={1}
          borderColor="rgba(170, 64, 255, 0.3)"
          paddingHorizontal="$4"
          paddingVertical="$2.5"
          hoverStyle={{
            backgroundColor: 'rgba(186, 80, 255, 1)',
            borderColor: 'rgba(186, 80, 255, 0.5)',
            y: -1,
          }}
          pressStyle={{
            y: 0,
            backgroundColor: 'rgba(154, 48, 230, 1)',
          }}
          animation="smooth"
          cursor={isRunning ? 'not-allowed' : 'pointer'}
        >
          <XStack space="$2" alignItems="center">
            {isRunning ? (
              <Spinner size="small" color="white" />
            ) : (
              <RefreshCw size={16} color="white" strokeWidth={2.5} />
            )}
            <Text color="white" fontWeight="600" fontSize="$3" letterSpacing={0.2}>
              {isRunning ? 'Syncing HubSpot...' : 'Sync HubSpot'}
            </Text>
          </XStack>
        </Button>
        {lastSync && !loadingLastSync && (
          <XStack alignItems="center" space="$2" paddingRight="$1">
            <Text fontSize="$3" color="$color" opacity={0.6} fontWeight="500">
              Last sync: {timeAgo(lastSync.created_at)}
            </Text>
            {lastSync.contacts_synced > 0 && (
              <>
                <Text fontSize="$3" color="$color" opacity={0.3}>•</Text>
                <XStack
                  paddingHorizontal="$2.5"
                  paddingVertical="$1"
                  borderRadius="$2"
                  backgroundColor="rgba(16, 185, 129, 0.15)"
                >
                  <Text fontSize="$3" color="#10b981" fontWeight="700">
                    +{lastSync.contacts_synced} new
                  </Text>
                </XStack>
              </>
            )}
          </XStack>
        )}
      </YStack>
    )
  }

  return (
    <YStack space="$4">
      {/* Sync Button - Compact Design */}
      <Button
        size="$3"
        onPress={handleSync}
        disabled={isRunning}
        backgroundColor={isRunning ? 'rgba(170, 64, 255, 0.7)' : 'rgba(170, 64, 255, 1)'}
        borderRadius="$2"
        borderWidth={1}
        borderColor="rgba(170, 64, 255, 0.3)"
        paddingHorizontal="$4"
        paddingVertical="$2"
        hoverStyle={{
          backgroundColor: 'rgba(186, 80, 255, 1)',
          borderColor: 'rgba(186, 80, 255, 0.5)',
          y: -1,
        }}
        pressStyle={{
          y: 0,
          backgroundColor: 'rgba(154, 48, 230, 1)',
        }}
        animation="smooth"
        cursor={isRunning ? 'not-allowed' : 'pointer'}
      >
        <XStack space="$2" alignItems="center">
          {isRunning ? (
            <Spinner size="small" color="white" />
          ) : (
            <RefreshCw size={16} color="white" strokeWidth={2.5} />
          )}
          <Text color="white" fontWeight="600" fontSize="$3" letterSpacing={0.2}>
            {isRunning ? 'Syncing customers...' : 'Sync HubSpot Customers'}
          </Text>
        </XStack>
      </Button>

      {/* Last Sync Status */}
      {loadingLastSync ? (
        <XStack
          padding="$3"
          borderRadius="$2"
          backgroundColor="rgba(59, 130, 246, 0.06)"
          borderWidth={1}
          borderColor="rgba(59, 130, 246, 0.2)"
          alignItems="center"
          space="$2"
        >
          <Spinner size="small" color="$zingBlue" />
          <Text fontSize="$3" color="$color" opacity={0.6} fontWeight="500">
            Loading sync status...
          </Text>
        </XStack>
      ) : lastSync ? (
        <YStack space="$2">
          {/* Main Status Bar - Clickable to expand */}
          <XStack
            padding="$3"
            borderRadius="$2"
            backgroundColor={lastSync.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'}
            borderWidth={1}
            borderColor={lastSync.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
            alignItems="center"
            space="$2"
            cursor="pointer"
            onPress={() => setExpanded(!expanded)}
            hoverStyle={{
              backgroundColor: lastSync.status === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              borderColor: lastSync.status === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            }}
            pressStyle={{ opacity: 0.9 }}
            animation="smooth"
          >
            {/* Status Icon */}
            <YStack
              width={24}
              height={24}
              borderRadius="$2"
              backgroundColor={lastSync.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
              justifyContent="center"
              alignItems="center"
            >
              {lastSync.status === 'success' ? (
                <CheckCircle size={14} color="#10b981" strokeWidth={2.5} />
              ) : (
                <XCircle size={14} color="#ef4444" strokeWidth={2.5} />
              )}
            </YStack>

            {/* Sync Info */}
            <XStack flex={1} alignItems="center" space="$1.5" flexWrap="wrap">
              <Text fontSize="$3" color="$color" opacity={0.6} fontWeight="500">
                Last sync:
              </Text>
              <Text fontSize="$3" color="$color" fontWeight="600">
                {timeAgo(lastSync.created_at)}
              </Text>

              {lastSync.status === 'success' && lastSync.contacts_synced > 0 && (
                <>
                  <Text fontSize="$2" color="$color" opacity={0.3}>•</Text>
                  <XStack
                    paddingHorizontal="$1.5"
                    paddingVertical="$0.5"
                    borderRadius="$1"
                    backgroundColor="rgba(16, 185, 129, 0.1)"
                  >
                    <Text fontSize="$2" color="#10b981" fontWeight="700">
                      +{lastSync.contacts_synced} new
                    </Text>
                  </XStack>
                </>
              )}

              <Text fontSize="$2" color="$color" opacity={0.3}>•</Text>
              <Text fontSize="$3" color="$color" opacity={0.5} fontWeight="500">
                {(lastSync.duration_ms / 1000).toFixed(1)}s
              </Text>
            </XStack>

            {/* Expand Icon */}
            <YStack
              width={20}
              height={20}
              borderRadius="$1"
              backgroundColor="rgba(107, 114, 128, 0.08)"
              justifyContent="center"
              alignItems="center"
            >
              {expanded ? (
                <ChevronUp size={12} color="#6b7280" strokeWidth={2.5} />
              ) : (
                <ChevronDown size={12} color="#6b7280" strokeWidth={2.5} />
              )}
            </YStack>
          </XStack>

          {/* Expanded Details */}
          {expanded && (
            <YStack
              padding="$3"
              borderRadius="$2"
              backgroundColor="rgba(107, 114, 128, 0.05)"
              borderWidth={1}
              borderColor="rgba(107, 114, 128, 0.2)"
              space="$1.5"
              animation="quick"
              enterStyle={{ opacity: 0, y: -10 }}
              exitStyle={{ opacity: 0, y: -10 }}
            >
              <Text fontSize="$3" fontWeight="700" color="$color" marginBottom="$1">
                Sync Details
              </Text>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>Type:</Text>
                <Text fontSize="$3" color="$color" fontWeight="600" textTransform="capitalize">
                  {lastSync.sync_type}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>Status:</Text>
                <Text fontSize="$3" color={lastSync.status === 'success' ? '#10b981' : '#ef4444'} fontWeight="600" textTransform="capitalize">
                  {lastSync.status}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>New Customers:</Text>
                <Text fontSize="$3" color="#10b981" fontWeight="600">
                  +{lastSync.contacts_synced}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>Already in DB:</Text>
                <Text fontSize="$3" color="$color" fontWeight="600">
                  {lastSync.contacts_skipped.toLocaleString()}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>Errors:</Text>
                <Text fontSize="$3" color={lastSync.errors > 0 ? '#ef4444' : '$color'} fontWeight="600">
                  {lastSync.errors}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>Duration:</Text>
                <Text fontSize="$3" color="$color" fontWeight="600">
                  {(lastSync.duration_ms / 1000).toFixed(2)}s
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>Triggered by:</Text>
                <Text fontSize="$3" color="$color" fontWeight="600">
                  {lastSync.triggered_by}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color" opacity={0.6}>Timestamp:</Text>
                <Text fontSize="$3" color="$color" fontWeight="600">
                  {new Date(lastSync.created_at).toLocaleString()}
                </Text>
              </XStack>
            </YStack>
          )}
        </YStack>
      ) : (
        <XStack
          padding="$2"
          borderRadius="$2"
          backgroundColor="rgba(107, 114, 128, 0.08)"
          borderWidth={1}
          borderColor="rgba(107, 114, 128, 0.3)"
          alignItems="center"
          space="$1.5"
        >
          <Clock size={14} color="#6b7280" />
          <Text fontSize="$3" color="$color" opacity={0.7}>
            No syncs yet
          </Text>
        </XStack>
      )}

      {/* Toast Notification */}
      {showToast && (
        <XStack
          position="fixed"
          bottom={16}
          right={16}
          padding="$3"
          borderRadius="$3"
          backgroundColor={toastType === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)'}
          borderWidth={2}
          borderColor={toastType === 'success' ? '#10b981' : '#ef4444'}
          shadowColor="rgba(0, 0, 0, 0.3)"
          shadowRadius={12}
          shadowOffset={{ width: 0, height: 6 }}
          maxWidth={350}
          zIndex={9999}
          animation="quick"
          enterStyle={{ opacity: 0, scale: 0.9, y: 20 }}
          exitStyle={{ opacity: 0, scale: 0.9, y: 20 }}
        >
          <Text color="white" fontWeight="600" fontSize="$3">
            {toastMessage}
          </Text>
        </XStack>
      )}
    </YStack>
  )
}
