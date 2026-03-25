// @ts-nocheck
'use client'

import { useState, useCallback, useRef } from 'react'
import { YStack, XStack, Text, Button, Input, Spinner, Sheet } from 'tamagui'
import { Search, Plus, X, Building2, CheckCircle, AlertCircle } from 'lucide-react'
import { invalidateContacts } from '@/lib/cache/invalidate'

interface HubSpotSearchResult {
  id: string
  properties: {
    firstname: string | null
    lastname: string | null
    email: string | null
    phone: string | null
    company: string | null
    website: string | null
    city: string | null
    state: string | null
    lifecyclestage: string | null
    hs_object_id: string
  }
}

interface AddBusinessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded?: () => void
}

export function AddBusinessModal({ open, onOpenChange, onAdded }: AddBusinessModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HubSpotSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchHubSpot = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setSearching(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/hubspot/contacts/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      )
      const data = await response.json()

      if (data.success) {
        setResults(data.data)
      } else {
        setError(data.message || 'Search failed')
      }
    } catch {
      setError('Failed to search HubSpot')
    } finally {
      setSearching(false)
    }
  }, [])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => searchHubSpot(value), 400)
    },
    [searchHubSpot]
  )

  const handleAdd = useCallback(
    async (contact: HubSpotSearchResult) => {
      const hubspotId = contact.properties.hs_object_id || contact.id
      setAdding(hubspotId)
      setError(null)

      try {
        // Use the existing individual sync endpoint — it adds any contact
        // to Supabase regardless of lifecycle stage
        const response = await fetch(`/api/hubspot/contacts/${hubspotId}/sync`)
        const data = await response.json()

        if (data.success) {
          setAddedIds((prev) => new Set(prev).add(hubspotId))
          invalidateContacts()
          onAdded?.()
        } else {
          setError(data.message || 'Failed to add business')
        }
      } catch {
        setError('Failed to add business')
      } finally {
        setAdding(null)
      }
    },
    [onAdded]
  )

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset state after animation
    setTimeout(() => {
      setQuery('')
      setResults([])
      setAddedIds(new Set())
      setError(null)
    }, 300)
  }, [onOpenChange])

  const getDisplayName = (contact: HubSpotSearchResult) => {
    const { company, firstname, lastname, email } = contact.properties
    if (company) return company
    if (firstname || lastname) return `${firstname || ''} ${lastname || ''}`.trim()
    return email || `Contact ${contact.id}`
  }

  const getSubtitle = (contact: HubSpotSearchResult) => {
    const parts: string[] = []
    const { city, state, email, lifecyclestage } = contact.properties
    if (city && state) parts.push(`${city}, ${state}`)
    else if (city) parts.push(city)
    else if (state) parts.push(state)
    if (email) parts.push(email)
    if (lifecyclestage) parts.push(lifecyclestage)
    return parts.join(' · ')
  }

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={handleClose}
      snapPoints={[85]}
      dismissOnSnapToBottom
      zIndex={100000}
    >
      <Sheet.Overlay
        animation="quick"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.5)"
      />
      <Sheet.Frame
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
        padding="$5"
      >
        <Sheet.Handle backgroundColor="$color" opacity={0.2} />

        <YStack space="$4" flex={1}>
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$3">
              <YStack
                width={40}
                height={40}
                borderRadius="$3"
                backgroundColor="rgba(59, 130, 246, 0.15)"
                alignItems="center"
                justifyContent="center"
              >
                <Plus size={20} color="#3B82F6" />
              </YStack>
              <YStack>
                <Text fontSize="$6" fontWeight="700" color="$color">
                  Add Business from HubSpot
                </Text>
                <Text fontSize="$3" color="$color" opacity={0.6}>
                  Search and add any HubSpot contact — no sync required
                </Text>
              </YStack>
            </XStack>
            <Button
              size="$3"
              circular
              backgroundColor="transparent"
              onPress={handleClose}
              hoverStyle={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
            >
              <X size={18} color="#6b7280" />
            </Button>
          </XStack>

          {/* Search Input */}
          <XStack
            alignItems="center"
            gap="$3"
            backgroundColor="rgba(30, 40, 71, 0.5)"
            borderRadius="$4"
            borderWidth={1}
            borderColor="rgba(59, 130, 246, 0.3)"
            paddingHorizontal="$4"
            paddingVertical="$3"
            animation="quick"
            hoverStyle={{
              borderColor: 'rgba(59, 130, 246, 0.5)',
              backgroundColor: 'rgba(30, 40, 71, 0.7)',
            }}
          >
            <Search size={18} color="#3B82F6" />
            <Input
              flex={1}
              placeholder="Search by company name, contact name, or email..."
              value={query}
              onChangeText={handleQueryChange}
              backgroundColor="transparent"
              borderWidth={0}
              fontSize="$4"
              color="$color"
              paddingHorizontal={0}
              paddingVertical={0}
              height={28}
              autoFocus
            />
            {searching && <Spinner size="small" color="$zingBlue" />}
          </XStack>

          {/* Error */}
          {error && (
            <XStack
              padding="$3"
              borderRadius="$3"
              backgroundColor="rgba(239, 68, 68, 0.1)"
              borderWidth={1}
              borderColor="rgba(239, 68, 68, 0.3)"
              alignItems="center"
              gap="$2"
            >
              <AlertCircle size={16} color="#ef4444" />
              <Text fontSize="$3" color="#ef4444" flex={1}>
                {error}
              </Text>
            </XStack>
          )}

          {/* Results */}
          <YStack flex={1} overflow="scroll">
            {results.length > 0 ? (
              <YStack space="$2">
                <Text fontSize="$3" color="$color" opacity={0.5} fontWeight="600">
                  {results.length} result{results.length !== 1 ? 's' : ''} from HubSpot
                </Text>
                {results.map((contact) => {
                  const hubspotId = contact.properties.hs_object_id || contact.id
                  const isAdded = addedIds.has(hubspotId)
                  const isAdding = adding === hubspotId

                  return (
                    <XStack
                      key={contact.id}
                      padding="$3.5"
                      borderRadius="$4"
                      backgroundColor="rgba(30, 40, 71, 0.3)"
                      borderWidth={1}
                      borderColor={
                        isAdded
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'rgba(59, 130, 246, 0.15)'
                      }
                      alignItems="center"
                      gap="$3"
                      animation="quick"
                      hoverStyle={
                        !isAdded
                          ? {
                              backgroundColor: 'rgba(30, 40, 71, 0.5)',
                              borderColor: 'rgba(59, 130, 246, 0.3)',
                            }
                          : {}
                      }
                    >
                      {/* Icon */}
                      <YStack
                        width={36}
                        height={36}
                        borderRadius="$3"
                        backgroundColor={
                          isAdded
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(59, 130, 246, 0.1)'
                        }
                        alignItems="center"
                        justifyContent="center"
                      >
                        {isAdded ? (
                          <CheckCircle size={18} color="#10b981" />
                        ) : (
                          <Building2 size={18} color="#3B82F6" />
                        )}
                      </YStack>

                      {/* Info */}
                      <YStack flex={1} gap="$1">
                        <Text
                          fontSize="$4"
                          fontWeight="600"
                          color="$color"
                          numberOfLines={1}
                        >
                          {getDisplayName(contact)}
                        </Text>
                        <Text
                          fontSize="$3"
                          color="$color"
                          opacity={0.5}
                          numberOfLines={1}
                        >
                          {getSubtitle(contact)}
                        </Text>
                      </YStack>

                      {/* Add Button */}
                      {isAdded ? (
                        <XStack
                          paddingHorizontal="$3"
                          paddingVertical="$2"
                          borderRadius="$3"
                          backgroundColor="rgba(16, 185, 129, 0.15)"
                        >
                          <Text
                            fontSize="$3"
                            color="#10b981"
                            fontWeight="700"
                          >
                            Added
                          </Text>
                        </XStack>
                      ) : (
                        <Button
                          size="$3"
                          onPress={() => handleAdd(contact)}
                          disabled={isAdding}
                          backgroundColor="rgba(59, 130, 246, 0.15)"
                          borderWidth={1}
                          borderColor="rgba(59, 130, 246, 0.3)"
                          borderRadius="$3"
                          paddingHorizontal="$3"
                          hoverStyle={{
                            backgroundColor: 'rgba(59, 130, 246, 0.25)',
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                          }}
                          pressStyle={{ scale: 0.97 }}
                          animation="quick"
                        >
                          {isAdding ? (
                            <Spinner size="small" color="$zingBlue" />
                          ) : (
                            <XStack alignItems="center" gap="$1.5">
                              <Plus size={14} color="#3B82F6" />
                              <Text
                                fontSize="$3"
                                color="$zingBlue"
                                fontWeight="700"
                              >
                                Add
                              </Text>
                            </XStack>
                          )}
                        </Button>
                      )}
                    </XStack>
                  )
                })}
              </YStack>
            ) : query.length >= 2 && !searching ? (
              <YStack
                flex={1}
                justifyContent="center"
                alignItems="center"
                padding="$6"
              >
                <Search size={32} color="#6b7280" />
                <Text
                  fontSize="$4"
                  color="$color"
                  opacity={0.5}
                  marginTop="$3"
                >
                  No contacts found for &ldquo;{query}&rdquo;
                </Text>
              </YStack>
            ) : (
              <YStack
                flex={1}
                justifyContent="center"
                alignItems="center"
                padding="$6"
              >
                <Search size={32} color="#6b7280" />
                <Text
                  fontSize="$4"
                  color="$color"
                  opacity={0.5}
                  marginTop="$3"
                >
                  Type at least 2 characters to search HubSpot
                </Text>
              </YStack>
            )}
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}