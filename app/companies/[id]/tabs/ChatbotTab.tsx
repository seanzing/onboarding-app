// @ts-nocheck
'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, Spinner, Separator } from 'tamagui'
import { Bot, RefreshCw, CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useChatbotStatus } from '@/app/hooks/useChatbotStatus'
import type { OnboardingServiceStatus } from '@/app/types/onboarding'
import { invalidateOnboardingStatus } from '@/lib/cache/invalidate'

interface ChatbotTabProps {
  contactId: string
  chatbotSlug: string | null
  serviceStatus: OnboardingServiceStatus | undefined
  onRefresh: () => void
}

export default function ChatbotTab({ contactId, chatbotSlug, serviceStatus, onRefresh }: ChatbotTabProps) {
  const { chatbot, loading: chatbotLoading, refetch: refetchChatbot } = useChatbotStatus(chatbotSlug ? contactId : undefined)
  const [slugInput, setSlugInput] = useState('')
  const [provisioning, setProvisioning] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const status = serviceStatus?.status ?? 'not_started'

  const handleSetSlug = async () => {
    if (!slugInput.trim()) return
    try {
      setProvisioning(true)
      const res = await fetch(`/api/onboarding/${contactId}/chatbot/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugInput.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Chatbot provisioned successfully')
      invalidateOnboardingStatus(contactId)
      onRefresh()
      refetchChatbot()
    } catch (err: any) {
      toast.error(err.message || 'Failed to provision chatbot')
    } finally {
      setProvisioning(false)
    }
  }

  const handleRegenerateKB = async () => {
    try {
      setRegenerating(true)
      const res = await fetch(`/api/onboarding/${contactId}/chatbot/regenerate-kb`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Knowledge base regeneration started')
      invalidateOnboardingStatus(contactId)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate knowledge base')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <YStack gap="$6" maxWidth={800}>
      {/* Header */}
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(0,174,255,0.2)"
        padding="$5"
      >
        <XStack alignItems="center" gap="$3">
          <YStack
            width={56}
            height={56}
            borderRadius="$4"
            backgroundColor="rgba(0,174,255,0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(0,174,255,0.3)"
          >
            <Bot size={28} color="#00AEFF" strokeWidth={2} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$6" fontWeight="800" color="$color">AI Chatbot</Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              {chatbotSlug ? `Slug: ${chatbotSlug}` : 'Configure and manage the AI chatbot'}
            </Text>
          </YStack>
          {status === 'active' && (
            <XStack backgroundColor="rgba(16,185,129,0.1)" paddingHorizontal="$3" paddingVertical="$1.5" borderRadius="$3">
              <Text fontSize={12} fontWeight="700" color="#10B981" textTransform="uppercase">Active</Text>
            </XStack>
          )}
        </XStack>
      </Card>

      {/* No slug — input to set one */}
      {!chatbotSlug && status === 'not_started' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
          <YStack gap="$4">
            <Text fontSize="$5" fontWeight="700" color="$color">Set Chatbot Slug</Text>
            <Text fontSize="$4" color="$color" opacity={0.6}>
              Enter the chatbot slug to provision this customer's AI chatbot.
            </Text>
            <XStack gap={12} alignItems="flex-end">
              <YStack flex={1} gap="$1">
                <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Slug</Text>
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="e.g. my-business-name"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.15)',
                    fontSize: 14,
                    background: 'transparent',
                    color: 'inherit',
                    width: '100%',
                  }}
                />
              </YStack>
              <Button
                size="$4"
                backgroundColor="#00AEFF"
                onPress={handleSetSlug}
                disabled={provisioning || !slugInput.trim()}
                icon={provisioning ? <Spinner size="small" color="white" /> : <Zap size={16} color="white" />}
              >
                <Text color="white" fontWeight="700">Provision</Text>
              </Button>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Pending state */}
      {status === 'pending' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="rgba(245,158,11,0.3)" padding="$6">
          <YStack alignItems="center" gap="$4">
            <Spinner size="large" color="#F59E0B" />
            <Text fontSize="$5" fontWeight="700" color="$color">Provisioning in progress...</Text>
          </YStack>
        </Card>
      )}

      {/* Active state */}
      {chatbotSlug && (status === 'active' || status === 'not_started') && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
          <YStack gap="$5">
            <Text fontSize="$5" fontWeight="700" color="$color">Chatbot Configuration</Text>

            {chatbotLoading ? (
              <YStack alignItems="center" paddingVertical="$4">
                <Spinner size="large" color="#00AEFF" />
              </YStack>
            ) : chatbot ? (
              <YStack gap="$3">
                <XStack gap={12} alignItems="center">
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text fontSize="$4" color="#10B981" fontWeight="600">Chatbot is running</Text>
                </XStack>
                {chatbot.last_build && (
                  <>
                    <Separator borderColor="$borderColor" />
                    <YStack gap="$1">
                      <Text fontSize={12} color="$color" opacity={0.5}>Last KB Build</Text>
                      <Text fontSize={13} color="$color">{new Date(chatbot.last_build).toLocaleString()}</Text>
                    </YStack>
                  </>
                )}
              </YStack>
            ) : (
              <XStack gap={8} alignItems="center">
                <AlertCircle size={16} color="#F59E0B" />
                <Text fontSize="$4" color="$color" opacity={0.7}>Could not reach chatbot backend</Text>
              </XStack>
            )}

            <Separator borderColor="$borderColor" />

            <Button
              size="$4"
              backgroundColor="$background"
              borderWidth={1}
              borderColor="rgba(0,174,255,0.3)"
              onPress={handleRegenerateKB}
              disabled={regenerating}
              icon={regenerating ? <Spinner size="small" color="#00AEFF" /> : <RefreshCw size={16} color="#00AEFF" />}
            >
              <Text color="#00AEFF" fontWeight="700">
                {regenerating ? 'Regenerating...' : 'Regenerate Knowledge Base'}
              </Text>
            </Button>
          </YStack>
        </Card>
      )}

      {/* Error state */}
      {status === 'error' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(239,68,68,0.3)" padding="$6">
          <YStack gap="$3" alignItems="center">
            <AlertCircle size={32} color="#EF4444" />
            <Text fontSize="$5" fontWeight="700" color="$color">Chatbot Error</Text>
            <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center">
              {serviceStatus?.notes || 'An error occurred with the chatbot service'}
            </Text>
          </YStack>
        </Card>
      )}
    </YStack>
  )
}
