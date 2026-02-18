// @ts-nocheck
'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, Spinner } from 'tamagui'
import { Link2, Save, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import type { ServiceIdentity } from '@/app/types/onboarding'

interface IdentityPanelProps {
  contactId: string
  identity: ServiceIdentity | null
  onUpdate: () => void
}

export default function IdentityPanel({ contactId, identity, onUpdate }: IdentityPanelProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dudaSiteCode, setDudaSiteCode] = useState(identity?.duda_site_code || '')
  const [chatbotSlug, setChatbotSlug] = useState(identity?.chatbot_slug || '')

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/onboarding/${contactId}/identity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duda_site_code: dudaSiteCode || null,
          chatbot_slug: chatbotSlug || null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Service identifiers updated')
      setEditing(false)
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      backgroundColor="$background"
      borderColor="$borderColor"
      borderWidth={1}
      borderRadius={12}
      padding="$5"
    >
      <YStack gap="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap={8} alignItems="center">
            <Link2 size={18} color="#6B7280" strokeWidth={2} />
            <Text fontSize={15} fontWeight="600" color="$color">Service Identifiers</Text>
          </XStack>
          {!editing && (
            <Button
              size="$2"
              backgroundColor="transparent"
              borderWidth={1}
              borderColor="$borderColor"
              onPress={() => setEditing(true)}
              icon={<Edit3 size={14} color="currentColor" />}
            >
              <Text fontSize={12} color="$color">Edit</Text>
            </Button>
          )}
        </XStack>

        {editing ? (
          <YStack gap="$3">
            <YStack gap="$1">
              <Text fontSize={12} color="$color" opacity={0.6} fontWeight="500">Duda Site Code</Text>
              <input
                type="text"
                value={dudaSiteCode}
                onChange={(e) => setDudaSiteCode(e.target.value)}
                placeholder="e.g. abc123"
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.15)',
                  fontSize: 14,
                  background: 'transparent',
                  color: 'inherit',
                }}
              />
            </YStack>
            <YStack gap="$1">
              <Text fontSize={12} color="$color" opacity={0.6} fontWeight="500">Chatbot Slug</Text>
              <input
                type="text"
                value={chatbotSlug}
                onChange={(e) => setChatbotSlug(e.target.value)}
                placeholder="e.g. my-business"
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.15)',
                  fontSize: 14,
                  background: 'transparent',
                  color: 'inherit',
                }}
              />
            </YStack>
            <XStack gap={8} justifyContent="flex-end">
              <Button
                size="$3"
                backgroundColor="transparent"
                borderWidth={1}
                borderColor="$borderColor"
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text fontSize={13} color="$color">Cancel</Text>
              </Button>
              <Button
                size="$3"
                backgroundColor="$zingBlue"
                onPress={handleSave}
                disabled={saving}
                icon={saving ? <Spinner size="small" color="white" /> : <Save size={14} color="white" />}
              >
                <Text fontSize={13} color="white" fontWeight="600">Save</Text>
              </Button>
            </XStack>
          </YStack>
        ) : (
          <YStack gap="$3">
            <XStack gap={16}>
              <YStack flex={1} gap="$1">
                <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Duda Site Code</Text>
                <Text fontSize={13} color="$color" fontWeight="500">
                  {identity?.duda_site_code || '—'}
                </Text>
              </YStack>
              <YStack flex={1} gap="$1">
                <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Chatbot Slug</Text>
                <Text fontSize={13} color="$color" fontWeight="500">
                  {identity?.chatbot_slug || '—'}
                </Text>
              </YStack>
            </XStack>
            {identity?.foursquare_venue_id && (
              <YStack gap="$1">
                <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Foursquare Venue ID</Text>
                <Text fontSize={13} color="$color" fontWeight="500">
                  {identity.foursquare_venue_id}
                </Text>
              </YStack>
            )}
          </YStack>
        )}
      </YStack>
    </Card>
  )
}
