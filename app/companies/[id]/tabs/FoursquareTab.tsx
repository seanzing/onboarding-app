// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { YStack, XStack, Text, Card, Button, Spinner, Separator, Input } from 'tamagui'
import {
  MapPin, AlertCircle, AlertTriangle, CheckCircle2, Send, Download,
  ExternalLink, Search, Link2, Plus, RefreshCw, Phone, Globe, Clock,
  Tag, Pencil, X, ChevronDown, ChevronUp, Info, Navigation, Image,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingServiceStatus, FoursquarePlace, GooglePlaceData } from '@/app/types/onboarding'
import { invalidateOnboardingStatus, invalidateFoursquareDetails } from '@/lib/cache/invalidate'

interface FoursquareTabProps {
  contactId: string
  foursquareVenueId: string | null
  company: any
  serviceStatus: OnboardingServiceStatus | undefined
  onRefresh: () => void
}

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatHour(hhmm: string) {
  const h = parseInt(hhmm.slice(0, 2), 10)
  const m = hhmm.slice(2)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${ampm}`
}

// ─────────────────────────────────────────────────────────────
// Google Place Link Section
// ─────────────────────────────────────────────────────────────

function GooglePlaceSection({
  contactId,
  company,
  googlePlace,
  setGooglePlace,
  loading,
  setLoading,
}: {
  contactId: string
  company: any
  googlePlace: GooglePlaceData | null
  setGooglePlace: (p: GooglePlaceData | null) => void
  loading: boolean
  setLoading: (l: boolean) => void
}) {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchDone, setSearchDone] = useState(false)
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [mapsUrl, setMapsUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)

  const props = company.properties

  const handleAutoSearch = useCallback(async () => {
    const name = props.company || `${props.firstname || ''} ${props.lastname || ''}`.trim()
    if (!name) {
      toast.error('No business name available to search')
      return
    }
    const query = [name, props.city, props.state].filter(Boolean).join(' ')

    setSearching(true)
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.businesses || [])
        setSearchDone(true)
      } else {
        toast.error('Search failed')
      }
    } catch {
      toast.error('Failed to search Google Places')
    } finally {
      setSearching(false)
    }
  }, [props])

  const handleLinkPlace = useCallback(async (placeId: string) => {
    setLinking(true)
    try {
      const res = await fetch(`/api/onboarding/${contactId}/google-place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Linked "${data.data.placeName}"`)
      // Fetch full details
      await fetchLinkedPlace()
    } catch (err: any) {
      toast.error(err.message || 'Failed to link place')
    } finally {
      setLinking(false)
    }
  }, [contactId])

  const handleUrlSubmit = useCallback(async () => {
    if (!mapsUrl.trim()) return
    setUrlError(null)
    setLinking(true)
    try {
      const res = await fetch(`/api/onboarding/${contactId}/google-place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapsUrl: mapsUrl.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Linked "${data.data.placeName}"`)
      setShowUrlInput(false)
      setMapsUrl('')
      await fetchLinkedPlace()
    } catch (err: any) {
      setUrlError(err.message || 'Failed to link from URL')
    } finally {
      setLinking(false)
    }
  }, [contactId, mapsUrl])

  const fetchLinkedPlace = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/onboarding/${contactId}/google-place`)
      const data = await res.json()
      if (data.success && data.data.linked) {
        setGooglePlace(data.data.place)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [contactId, setGooglePlace, setLoading])

  const handleUnlink = useCallback(async () => {
    try {
      const res = await fetch(`/api/onboarding/${contactId}/identity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_place_id: null }),
      })
      const data = await res.json()
      if (data.success) {
        setGooglePlace(null)
        setSearchDone(false)
        setSearchResults([])
        toast.success('Google Business Profile unlinked')
      }
    } catch {
      toast.error('Failed to unlink')
    }
  }, [contactId, setGooglePlace])

  // If already linked, show the linked place
  if (googlePlace) {
    return (
      <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(16,185,129,0.3)" padding="$6">
        <YStack gap="$4">
          <XStack alignItems="center" justifyContent="space-between">
            <XStack gap={8} alignItems="center">
              <CheckCircle2 size={20} color="#10B981" />
              <Text fontSize="$5" fontWeight="700" color="$color">Google Business Profile Linked</Text>
            </XStack>
            <XStack gap={8}>
              <Button size="$2" backgroundColor="$background" borderWidth={1} borderColor="$borderColor" onPress={fetchLinkedPlace} disabled={loading}>
                <RefreshCw size={12} color="$color" />
              </Button>
              <Button size="$2" backgroundColor="$background" borderWidth={1} borderColor="rgba(239,68,68,0.3)" onPress={handleUnlink}>
                <Text fontSize={11} color="#EF4444" fontWeight="600">Unlink</Text>
              </Button>
            </XStack>
          </XStack>

          <YStack gap="$3">
            <Text fontSize="$5" fontWeight="700" color="$color">{googlePlace.name}</Text>

            {googlePlace.address && (
              <XStack gap={10} alignItems="flex-start">
                <MapPin size={15} color="$color" opacity={0.4} style={{ marginTop: 2 }} />
                <Text fontSize={13} color="$color" flex={1}>{googlePlace.address}</Text>
              </XStack>
            )}
            {googlePlace.phone && (
              <XStack gap={10} alignItems="center">
                <Phone size={15} color="$color" opacity={0.4} />
                <Text fontSize={13} color="$color">{googlePlace.phone}</Text>
              </XStack>
            )}
            {googlePlace.website && (
              <XStack gap={10} alignItems="center">
                <Globe size={15} color="$color" opacity={0.4} />
                <Text fontSize={13} color="#3B82F6" numberOfLines={1}>{googlePlace.website}</Text>
              </XStack>
            )}
            {googlePlace.category && (
              <XStack gap={10} alignItems="center">
                <Tag size={15} color="$color" opacity={0.4} />
                <Text fontSize={13} color="$color">{googlePlace.category}</Text>
              </XStack>
            )}
            {googlePlace.location && (
              <XStack gap={10} alignItems="center">
                <Navigation size={15} color="$color" opacity={0.4} />
                <Text fontSize={13} color="$color" opacity={0.6}>
                  {googlePlace.location.latitude.toFixed(5)}, {googlePlace.location.longitude.toFixed(5)}
                </Text>
              </XStack>
            )}
            {googlePlace.hours && googlePlace.hours.length > 0 && (
              <YStack gap="$1.5">
                <XStack gap={8} alignItems="center">
                  <Clock size={15} color="$color" opacity={0.4} />
                  <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Hours</Text>
                </XStack>
                <YStack paddingLeft={23} gap="$0.5">
                  {googlePlace.hours.map((h, i) => (
                    <Text key={i} fontSize={12} color="$color" opacity={0.7}>{h}</Text>
                  ))}
                </YStack>
              </YStack>
            )}
            {googlePlace.photos && googlePlace.photos.length > 0 && (
              <YStack gap="$2">
                <XStack gap={8} alignItems="center">
                  <Image size={15} color="$color" opacity={0.4} />
                  <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Photos</Text>
                </XStack>
                <XStack gap={8} flexWrap="wrap">
                  {googlePlace.photos.slice(0, 4).map((photo, i) => (
                    <img
                      key={i}
                      src={photo.thumbnail}
                      alt=""
                      style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }}
                    />
                  ))}
                </XStack>
              </YStack>
            )}
          </YStack>

          {googlePlace.googleMapsUrl && (
            <>
              <Separator borderColor="$borderColor" />
              <Button
                size="$3"
                backgroundColor="$background"
                borderWidth={1}
                borderColor="rgba(59,130,246,0.3)"
                onPress={() => window.open(googlePlace.googleMapsUrl, '_blank')}
                icon={<ExternalLink size={14} color="#3B82F6" />}
              >
                <Text color="#3B82F6" fontWeight="600" fontSize={13}>View on Google Maps</Text>
              </Button>
            </>
          )}
        </YStack>
      </Card>
    )
  }

  // Not linked yet — show search / link UI
  return (
    <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(59,130,246,0.2)" padding="$6">
      <YStack gap="$5">
        <XStack gap={12} alignItems="center">
          <YStack
            width={44}
            height={44}
            borderRadius="$4"
            backgroundColor="rgba(59,130,246,0.1)"
            justifyContent="center"
            alignItems="center"
          >
            <Search size={22} color="#3B82F6" />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$5" fontWeight="700" color="$color">Step 1: Link Google Business Profile</Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              We'll use the GBP data (hours, location, categories) to create a richer Foursquare listing.
            </Text>
          </YStack>
        </XStack>

        {/* Auto-search button */}
        {!searchDone && !showUrlInput && (
          <YStack gap="$3">
            <Button
              size="$4"
              backgroundColor="#3B82F6"
              onPress={handleAutoSearch}
              disabled={searching}
              icon={searching ? <Spinner size="small" color="white" /> : <Search size={16} color="white" />}
            >
              <Text color="white" fontWeight="700">
                {searching ? 'Searching Google...' : 'Find on Google Maps'}
              </Text>
            </Button>
            <Button
              size="$3"
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              onPress={() => setShowUrlInput(true)}
            >
              <Text color="$color" fontWeight="600" fontSize={13}>I have a Google Maps link</Text>
            </Button>
          </YStack>
        )}

        {/* Search results */}
        {searchDone && !showUrlInput && (
          <YStack gap="$3">
            {searchResults.length > 0 ? (
              <>
                <Text fontSize="$3" color="$color" opacity={0.5} fontWeight="600">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found — select the correct business:
                </Text>
                {searchResults.map((biz) => (
                  <Card
                    key={biz.placeId}
                    backgroundColor="$background"
                    borderRadius="$4"
                    borderWidth={1}
                    borderColor="$borderColor"
                    padding="$4"
                    hoverStyle={{ borderColor: 'rgba(59,130,246,0.4)' }}
                    animation="quick"
                  >
                    <XStack alignItems="center" gap={12}>
                      <YStack flex={1} gap="$1">
                        <Text fontSize={14} fontWeight="700" color="$color">{biz.name}</Text>
                        <Text fontSize={12} color="$color" opacity={0.6}>{biz.address}</Text>
                        <XStack gap={8}>
                          {biz.category && (
                            <Text fontSize={11} color="#3B82F6" opacity={0.8}>{biz.category}</Text>
                          )}
                          {biz.rating && (
                            <Text fontSize={11} color="#F59E0B">{biz.rating} ({biz.totalReviews})</Text>
                          )}
                        </XStack>
                      </YStack>
                      <Button
                        size="$3"
                        backgroundColor="rgba(59,130,246,0.1)"
                        borderWidth={1}
                        borderColor="rgba(59,130,246,0.3)"
                        onPress={() => handleLinkPlace(biz.placeId)}
                        disabled={linking}
                        icon={linking ? <Spinner size="small" color="#3B82F6" /> : <Link2 size={14} color="#3B82F6" />}
                      >
                        <Text color="#3B82F6" fontWeight="700" fontSize={13}>Link</Text>
                      </Button>
                    </XStack>
                  </Card>
                ))}
              </>
            ) : (
              <XStack gap={12} alignItems="center" padding="$3" backgroundColor="rgba(245,158,11,0.06)" borderRadius="$3">
                <AlertCircle size={18} color="#F59E0B" />
                <Text fontSize={13} color="$color" opacity={0.7}>
                  No matching businesses found on Google Maps.
                </Text>
              </XStack>
            )}

            <XStack gap={12}>
              <Button
                flex={1}
                size="$3"
                backgroundColor="$background"
                borderWidth={1}
                borderColor="$borderColor"
                onPress={() => { setSearchDone(false); setSearchResults([]) }}
                icon={<Search size={14} color="$color" />}
              >
                <Text color="$color" fontWeight="600" fontSize={13}>Search Again</Text>
              </Button>
              <Button
                flex={1}
                size="$3"
                backgroundColor="$background"
                borderWidth={1}
                borderColor="rgba(59,130,246,0.3)"
                onPress={() => setShowUrlInput(true)}
                icon={<Link2 size={14} color="#3B82F6" />}
              >
                <Text color="#3B82F6" fontWeight="600" fontSize={13}>Paste a Link Instead</Text>
              </Button>
            </XStack>
          </YStack>
        )}

        {/* URL input mode */}
        {showUrlInput && (
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$color">Paste a Google Maps Link</Text>

            <XStack gap={8}>
              <Input
                flex={1}
                placeholder="https://maps.google.com/..."
                value={mapsUrl}
                onChangeText={(v) => { setMapsUrl(v); setUrlError(null) }}
                backgroundColor="rgba(30, 40, 71, 0.5)"
                borderWidth={1}
                borderColor={urlError ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.3)'}
                borderRadius="$3"
                fontSize={13}
                color="$color"
                paddingHorizontal="$3"
              />
              <Button
                size="$4"
                backgroundColor="#3B82F6"
                onPress={handleUrlSubmit}
                disabled={linking || !mapsUrl.trim()}
                icon={linking ? <Spinner size="small" color="white" /> : <Link2 size={16} color="white" />}
                borderRadius="$3"
              >
                <Text color="white" fontWeight="700">Link</Text>
              </Button>
            </XStack>

            {urlError && (
              <XStack gap={8} alignItems="center">
                <AlertCircle size={14} color="#EF4444" />
                <Text fontSize={12} color="#EF4444">{urlError}</Text>
              </XStack>
            )}

            {/* Tutorial */}
            <Card
              backgroundColor="rgba(59,130,246,0.04)"
              borderRadius="$4"
              borderWidth={1}
              borderColor="rgba(59,130,246,0.15)"
              padding="$4"
            >
              <YStack gap="$3">
                <XStack
                  gap={8}
                  alignItems="center"
                  cursor="pointer"
                  onPress={() => setShowTutorial(!showTutorial)}
                >
                  <Info size={16} color="#3B82F6" />
                  <Text fontSize={13} fontWeight="700" color="#3B82F6" flex={1}>
                    How to find the Google Maps link
                  </Text>
                  {showTutorial
                    ? <ChevronUp size={14} color="#3B82F6" />
                    : <ChevronDown size={14} color="#3B82F6" />
                  }
                </XStack>

                {showTutorial && (
                  <YStack gap="$3" paddingTop="$2">
                    <YStack gap="$1.5">
                      <Text fontSize={13} fontWeight="700" color="$color">1. Go to Google Maps</Text>
                      <Text fontSize={12} color="$color" opacity={0.7}>
                        Open google.com/maps and search for the business by name and city.
                      </Text>
                    </YStack>
                    <YStack gap="$1.5">
                      <Text fontSize={13} fontWeight="700" color="$color">2. Click the business listing</Text>
                      <Text fontSize={12} color="$color" opacity={0.7}>
                        Click on the correct business from the search results to open its profile panel.
                      </Text>
                    </YStack>
                    <YStack gap="$1.5">
                      <Text fontSize={13} fontWeight="700" color="$color">3. Click the Share button</Text>
                      <Text fontSize={12} color="$color" opacity={0.7}>
                        In the business panel, click the Share icon (arrow pointing up). Then click "Copy link".
                      </Text>
                    </YStack>
                    <YStack gap="$1.5">
                      <Text fontSize={13} fontWeight="700" color="$color">4. Paste the link above</Text>
                      <Text fontSize={12} color="$color" opacity={0.7}>
                        Come back here and paste the copied link into the input field above. Any Google Maps link format will work.
                      </Text>
                    </YStack>

                    <Separator borderColor="rgba(59,130,246,0.15)" />

                    <Text fontSize={11} color="$color" opacity={0.5}>
                      Supported formats: google.com/maps/place/..., maps.google.com/?cid=..., goo.gl/maps/..., maps.app.goo.gl/...
                    </Text>
                  </YStack>
                )}
              </YStack>
            </Card>

            <Button
              size="$3"
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              onPress={() => { setShowUrlInput(false); setUrlError(null); setMapsUrl('') }}
            >
              <Text color="$color" fontWeight="600" fontSize={13}>Back to Search</Text>
            </Button>
          </YStack>
        )}
      </YStack>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Main FoursquareTab
// ─────────────────────────────────────────────────────────────

export default function FoursquareTab({ contactId, foursquareVenueId, company, serviceStatus, onRefresh }: FoursquareTabProps) {
  const [submitting, setSubmitting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [exactMatch, setExactMatch] = useState<FoursquarePlace | null>(null)
  const [searchResults, setSearchResults] = useState<FoursquarePlace[]>([])
  const [linking, setLinking] = useState(false)
  const [venueDetails, setVenueDetails] = useState<FoursquarePlace | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [proposing, setProposing] = useState(false)

  // Google Place state
  const [googlePlace, setGooglePlace] = useState<GooglePlaceData | null>(null)
  const [googlePlaceLoading, setGooglePlaceLoading] = useState(true)

  const status = serviceStatus?.status ?? 'not_started'
  const metadata = serviceStatus?.metadata ?? {}
  const props = company.properties

  // Compute discrepancies between HubSpot data and Foursquare data
  const discrepancies = venueDetails ? computeDiscrepancies(props, venueDetails) : []

  // Fetch linked Google Place on mount
  useEffect(() => {
    setGooglePlaceLoading(true)
    fetch(`/api/onboarding/${contactId}/google-place`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.linked) {
          setGooglePlace(data.data.place)
        }
      })
      .catch(() => {})
      .finally(() => setGooglePlaceLoading(false))
  }, [contactId])

  // Fetch Foursquare venue details when active
  useEffect(() => {
    if (!foursquareVenueId || status !== 'active') return
    setDetailsLoading(true)
    fetch(`/api/onboarding/${contactId}/foursquare/details`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setVenueDetails(data.data)
      })
      .catch(() => {})
      .finally(() => setDetailsLoading(false))
  }, [contactId, foursquareVenueId, status])

  const handleSearch = async () => {
    try {
      setSearching(true)
      const params = new URLSearchParams()
      const name = props.company || `${props.firstname || ''} ${props.lastname || ''}`.trim()
      params.set('name', name)
      if (props.address) params.set('address', props.address)
      if (props.city) params.set('city', props.city)
      if (props.state) params.set('state', props.state)
      if (props.zip) params.set('zip', props.zip)

      const res = await fetch(`/api/onboarding/${contactId}/foursquare/search?${params}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setExactMatch(data.data.match || null)
      setSearchResults(data.data.results || [])
      setSearchDone(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to search Foursquare')
    } finally {
      setSearching(false)
    }
  }

  const handleLinkVenue = async (fsqId: string, venueName: string) => {
    try {
      setLinking(true)
      const res = await fetch(`/api/onboarding/${contactId}/foursquare/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: venueName, fsq_id: fsqId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Venue linked successfully')
      invalidateOnboardingStatus(contactId)
      invalidateFoursquareDetails(contactId)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to link venue')
    } finally {
      setLinking(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      // Build payload — prefer Google Place data over HubSpot
      const payload: Record<string, unknown> = {
        name: googlePlace?.name || props.company || `${props.firstname} ${props.lastname}`,
        address: googlePlace?.addressComponents?.street
          ? `${googlePlace.addressComponents.streetNumber || ''} ${googlePlace.addressComponents.street}`.trim()
          : (props.address || ''),
        city: googlePlace?.addressComponents?.city || props.city || '',
        state: googlePlace?.addressComponents?.state || props.state || '',
        zip: googlePlace?.addressComponents?.zipCode || props.zip || '',
        phone: googlePlace?.phone || props.phone || '',
        website: googlePlace?.website || props.website || '',
      }

      // Add lat/lng from Google Place
      if (googlePlace?.location) {
        payload.lat = googlePlace.location.latitude
        payload.lng = googlePlace.location.longitude
      }

      // Add categories from Google Place types
      if (googlePlace?.types && googlePlace.types.length > 0) {
        payload.categories = googlePlace.types
      }

      const res = await fetch(`/api/onboarding/${contactId}/foursquare/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(data.data?.venue_id ? 'Venue submitted to Foursquare' : 'Venue data saved for manual submission')
      invalidateOnboardingStatus(contactId)
      invalidateFoursquareDetails(contactId)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit to Foursquare')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadExport = () => {
    // Build export with Google Place data when available
    const exportData = {
      name: googlePlace?.name || props.company || `${props.firstname || ''} ${props.lastname || ''}`.trim(),
      address: googlePlace?.address || props.address || '',
      city: googlePlace?.addressComponents?.city || props.city || '',
      state: googlePlace?.addressComponents?.state || props.state || '',
      zip: googlePlace?.addressComponents?.zipCode || props.zip || '',
      phone: googlePlace?.phone || props.phone || '',
      website: googlePlace?.website || props.website || '',
      email: props.email || '',
      latitude: googlePlace?.location?.latitude,
      longitude: googlePlace?.location?.longitude,
      category: googlePlace?.category,
      hours: googlePlace?.hours,
      googlePlaceId: googlePlace?.placeId,
      googleMapsUrl: googlePlace?.googleMapsUrl,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `foursquare-export-${contactId}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export downloaded')
  }

  const handleRefreshDetails = () => {
    setDetailsLoading(true)
    fetch(`/api/onboarding/${contactId}/foursquare/details`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setVenueDetails(data.data)
      })
      .catch(() => {})
      .finally(() => setDetailsLoading(false))
  }

  const resetSearch = () => {
    setSearchDone(false)
    setExactMatch(null)
    setSearchResults([])
  }

  const handleProposeEdits = async (edits: Record<string, string>) => {
    try {
      setProposing(true)
      const res = await fetch(`/api/onboarding/${contactId}/foursquare/propose-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      })
      const data = await res.json()
      if (!data.success) {
        if (data.code === 'FORBIDDEN') {
          toast.error('Propose Edit requires a Foursquare Service Account key. Contact your admin.')
        } else {
          throw new Error(data.error)
        }
        return
      }
      toast.success('Edits proposed to Foursquare')
      setEditing(false)
      handleRefreshDetails()
    } catch (err: any) {
      toast.error(err.message || 'Failed to propose edits')
    } finally {
      setProposing(false)
    }
  }

  const handleFixAll = () => {
    const edits: Record<string, string> = {}
    for (const d of discrepancies) {
      edits[d.apiField] = d.hubspot
    }
    handleProposeEdits(edits)
  }

  return (
    <YStack gap="$6" maxWidth={800}>
      {/* Header */}
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={2}
        borderColor="rgba(168,85,247,0.2)"
        padding="$5"
      >
        <XStack alignItems="center" gap="$3">
          <YStack
            width={56}
            height={56}
            borderRadius="$4"
            backgroundColor="rgba(168,85,247,0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(168,85,247,0.3)"
          >
            <MapPin size={28} color="#A855F7" strokeWidth={2} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$6" fontWeight="800" color="$color">Foursquare Directory Listing</Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              Submit business listing to Foursquare for local discovery
            </Text>
          </YStack>
          {status === 'active' && (
            <XStack backgroundColor="rgba(16,185,129,0.1)" paddingHorizontal="$3" paddingVertical="$1.5" borderRadius="$3">
              <Text fontSize={12} fontWeight="700" color="#10B981" textTransform="uppercase">Active</Text>
            </XStack>
          )}
        </XStack>
      </Card>

      {/* Google Place Section — always shown when not yet active on Foursquare */}
      {status !== 'active' && !googlePlaceLoading && (
        <GooglePlaceSection
          contactId={contactId}
          company={company}
          googlePlace={googlePlace}
          setGooglePlace={setGooglePlace}
          loading={googlePlaceLoading}
          setLoading={setGooglePlaceLoading}
        />
      )}

      {googlePlaceLoading && status !== 'active' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
          <XStack gap={12} alignItems="center" justifyContent="center">
            <Spinner size="small" color="#3B82F6" />
            <Text fontSize={13} color="$color" opacity={0.6}>Checking for linked Google Business Profile...</Text>
          </XStack>
        </Card>
      )}

      {/* Warning when no Google Place linked */}
      {!googlePlace && !googlePlaceLoading && status !== 'active' && (
        <Card backgroundColor="rgba(245,158,11,0.04)" borderRadius="$4" borderWidth={1} borderColor="rgba(245,158,11,0.2)" padding="$4">
          <XStack gap={10} alignItems="flex-start">
            <AlertTriangle size={16} color="#F59E0B" style={{ marginTop: 2 }} />
            <YStack flex={1} gap="$1">
              <Text fontSize={13} fontWeight="700" color="#F59E0B">No Google Business Profile linked</Text>
              <Text fontSize={12} color="$color" opacity={0.6}>
                Submissions without GBP data will be missing coordinates, hours, and categories.
                Link a Google Business Profile above for a higher-quality listing.
              </Text>
            </YStack>
          </XStack>
        </Card>
      )}

      {/* Not started / Error — Search & Submit workflow */}
      {!foursquareVenueId && (status === 'not_started' || status === 'error') && (
        <>
          {/* Step 2: Business data preview & Foursquare search */}
          <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
            <YStack gap="$5">
              <XStack gap={12} alignItems="center">
                <YStack
                  width={32}
                  height={32}
                  borderRadius="$3"
                  backgroundColor="rgba(168,85,247,0.1)"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text fontSize={14} fontWeight="800" color="#A855F7">2</Text>
                </YStack>
                <Text fontSize="$5" fontWeight="700" color="$color">Search & Submit to Foursquare</Text>
              </XStack>

              {/* Data source indicator */}
              {googlePlace ? (
                <XStack gap={8} alignItems="center" padding="$2" backgroundColor="rgba(16,185,129,0.06)" borderRadius="$3">
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text fontSize={12} color="#10B981" fontWeight="600">
                    Using enriched data from Google Business Profile
                  </Text>
                </XStack>
              ) : (
                <XStack gap={8} alignItems="center" padding="$2" backgroundColor="rgba(245,158,11,0.06)" borderRadius="$3">
                  <AlertTriangle size={14} color="#F59E0B" />
                  <Text fontSize={12} color="#F59E0B" fontWeight="600">
                    Using basic data from HubSpot (no coordinates or hours)
                  </Text>
                </XStack>
              )}

              {/* Data preview — show merged data */}
              <YStack gap="$3">
                {[
                  { label: 'Business Name', value: googlePlace?.name || props.company || `${props.firstname || ''} ${props.lastname || ''}`.trim() },
                  { label: 'Address', value: googlePlace?.address || props.address },
                  { label: 'Phone', value: googlePlace?.phone || props.phone },
                  { label: 'Website', value: googlePlace?.website || props.website },
                  { label: 'Category', value: googlePlace?.category || '—' },
                  { label: 'Coordinates', value: googlePlace?.location ? `${googlePlace.location.latitude.toFixed(5)}, ${googlePlace.location.longitude.toFixed(5)}` : '—' },
                  { label: 'Hours', value: googlePlace?.hours ? `${googlePlace.hours.length} days listed` : '—' },
                ].map(({ label, value }) => (
                  <XStack key={label} gap={12}>
                    <Text fontSize={13} color="$color" opacity={0.5} fontWeight="500" width={120}>{label}</Text>
                    <Text fontSize={13} color={value === '—' ? '$color' : '$color'} fontWeight="500" flex={1} opacity={value === '—' ? 0.3 : 1}>
                      {value || '—'}
                    </Text>
                  </XStack>
                ))}
              </YStack>

              <Separator borderColor="$borderColor" />

              {!searchDone ? (
                <XStack gap={12}>
                  <Button
                    flex={1}
                    size="$4"
                    backgroundColor="#A855F7"
                    onPress={handleSearch}
                    disabled={searching}
                    icon={searching ? <Spinner size="small" color="white" /> : <Search size={16} color="white" />}
                  >
                    <Text color="white" fontWeight="700">
                      {searching ? 'Searching...' : 'Search Foursquare First'}
                    </Text>
                  </Button>
                  <Button
                    size="$4"
                    backgroundColor="$background"
                    borderWidth={1}
                    borderColor="rgba(168,85,247,0.3)"
                    onPress={handleDownloadExport}
                    icon={<Download size={16} color="#A855F7" />}
                  >
                    <Text color="#A855F7" fontWeight="700">Export</Text>
                  </Button>
                </XStack>
              ) : (
                <XStack gap={12}>
                  <Button
                    flex={1}
                    size="$4"
                    backgroundColor="#A855F7"
                    onPress={handleSubmit}
                    disabled={submitting}
                    icon={submitting ? <Spinner size="small" color="white" /> : <Plus size={16} color="white" />}
                  >
                    <Text color="white" fontWeight="700">
                      {submitting ? 'Submitting...' : 'Create New Listing'}
                    </Text>
                  </Button>
                  <Button
                    size="$4"
                    backgroundColor="$background"
                    borderWidth={1}
                    borderColor="$borderColor"
                    onPress={resetSearch}
                    icon={<Search size={16} color="$color" />}
                  >
                    <Text color="$color" fontWeight="700">Search Again</Text>
                  </Button>
                </XStack>
              )}
            </YStack>
          </Card>

          {/* Exact match result */}
          {searchDone && exactMatch && (
            <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(16,185,129,0.3)" padding="$6">
              <YStack gap="$4">
                <XStack gap={8} alignItems="center">
                  <CheckCircle2 size={20} color="#10B981" />
                  <Text fontSize="$5" fontWeight="700" color="$color">Exact Match Found</Text>
                </XStack>
                <VenueResultCard venue={exactMatch} />
                <Button
                  size="$4"
                  backgroundColor="#10B981"
                  onPress={() => handleLinkVenue(exactMatch.fsq_place_id || exactMatch.fsq_id, exactMatch.name)}
                  disabled={linking}
                  icon={linking ? <Spinner size="small" color="white" /> : <Link2 size={16} color="white" />}
                >
                  <Text color="white" fontWeight="700">
                    {linking ? 'Linking...' : 'Link This Venue'}
                  </Text>
                </Button>
              </YStack>
            </Card>
          )}

          {/* Fuzzy search results */}
          {searchDone && !exactMatch && searchResults.length > 0 && (
            <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="rgba(168,85,247,0.3)" padding="$6">
              <YStack gap="$4">
                <Text fontSize="$5" fontWeight="700" color="$color">Possible Matches ({searchResults.length})</Text>
                {searchResults.map((venue) => (
                  <Card key={venue.fsq_place_id || venue.fsq_id} backgroundColor="$background" borderRadius="$4" borderWidth={1} borderColor="$borderColor" padding="$4">
                    <XStack alignItems="center" gap={12}>
                      <YStack flex={1}>
                        <VenueResultCard venue={venue} />
                      </YStack>
                      <Button
                        size="$3"
                        backgroundColor="rgba(168,85,247,0.1)"
                        borderWidth={1}
                        borderColor="rgba(168,85,247,0.3)"
                        onPress={() => handleLinkVenue(venue.fsq_place_id || venue.fsq_id, venue.name)}
                        disabled={linking}
                        icon={linking ? <Spinner size="small" color="#A855F7" /> : <Link2 size={14} color="#A855F7" />}
                      >
                        <Text color="#A855F7" fontWeight="700" fontSize={13}>Link</Text>
                      </Button>
                    </XStack>
                  </Card>
                ))}
              </YStack>
            </Card>
          )}

          {/* No results */}
          {searchDone && !exactMatch && searchResults.length === 0 && (
            <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="rgba(245,158,11,0.3)" padding="$6">
              <XStack gap={12} alignItems="center">
                <AlertCircle size={20} color="#F59E0B" />
                <Text fontSize="$4" color="$color" opacity={0.7}>
                  No existing Foursquare listings found. Use "Create New Listing" above to submit.
                </Text>
              </XStack>
            </Card>
          )}
        </>
      )}

      {/* Pending state */}
      {status === 'pending' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="rgba(245,158,11,0.3)" padding="$6">
          <YStack alignItems="center" gap="$4">
            <Spinner size="large" color="#A855F7" />
            <Text fontSize="$5" fontWeight="700" color="$color">Submission in progress...</Text>
            <Text fontSize="$4" color="$color" opacity={0.6}>
              {metadata.manual_export ? 'Data saved — awaiting manual submission to Foursquare' : 'Processing Foursquare submission'}
            </Text>
          </YStack>
        </Card>
      )}

      {/* Active state — rich venue details */}
      {foursquareVenueId && status === 'active' && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(16,185,129,0.3)" padding="$6">
          <YStack gap="$4">
            <XStack gap={12} alignItems="center" justifyContent="space-between">
              <XStack gap={8} alignItems="center" flex={1}>
                <CheckCircle2 size={20} color="#10B981" />
                <Text fontSize="$5" fontWeight="700" color="$color">
                  {venueDetails?.name || 'Venue Listed on Foursquare'}
                </Text>
              </XStack>
              <Button
                size="$2"
                backgroundColor="$background"
                borderWidth={1}
                borderColor="$borderColor"
                onPress={handleRefreshDetails}
                disabled={detailsLoading}
                icon={detailsLoading ? <Spinner size="small" color="$color" /> : <RefreshCw size={14} color="$color" />}
              >
                <Text fontSize={12} color="$color">Refresh</Text>
              </Button>
            </XStack>

            <Separator borderColor="$borderColor" />

            {detailsLoading && !venueDetails ? (
              <YStack alignItems="center" paddingVertical="$4">
                <Spinner size="large" color="#A855F7" />
              </YStack>
            ) : venueDetails ? (
              <YStack gap="$4">
                {/* Categories */}
                {venueDetails.categories && venueDetails.categories.length > 0 && (
                  <XStack gap={8} flexWrap="wrap">
                    <Tag size={14} color="#A855F7" style={{ marginTop: 2 }} />
                    {venueDetails.categories.map((cat) => (
                      <XStack key={cat.id} backgroundColor="rgba(168,85,247,0.1)" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$2">
                        <Text fontSize={12} fontWeight="600" color="#A855F7">{cat.name}</Text>
                      </XStack>
                    ))}
                  </XStack>
                )}

                {/* Details grid */}
                <YStack gap="$3">
                  {venueDetails.location?.formatted_address && (
                    <XStack gap={10} alignItems="flex-start">
                      <MapPin size={15} color="$color" opacity={0.4} style={{ marginTop: 2 }} />
                      <Text fontSize={13} color="$color" flex={1}>{venueDetails.location.formatted_address}</Text>
                    </XStack>
                  )}
                  {venueDetails.tel && (
                    <XStack gap={10} alignItems="center">
                      <Phone size={15} color="$color" opacity={0.4} />
                      <Text fontSize={13} color="$color">{venueDetails.tel}</Text>
                    </XStack>
                  )}
                  {venueDetails.website && (
                    <XStack gap={10} alignItems="center">
                      <Globe size={15} color="$color" opacity={0.4} />
                      <Text
                        fontSize={13}
                        color="#A855F7"
                        cursor="pointer"
                        onPress={() => window.open(venueDetails.website, '_blank')}
                      >
                        {venueDetails.website}
                      </Text>
                    </XStack>
                  )}
                </YStack>

                {/* Hours */}
                {venueDetails.hours?.display && (
                  <YStack gap="$2">
                    <XStack gap={8} alignItems="center">
                      <Clock size={14} color="$color" opacity={0.4} />
                      <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Hours</Text>
                    </XStack>
                    <Text fontSize={13} color="$color" opacity={0.8} paddingLeft={22}>
                      {venueDetails.hours.display}
                    </Text>
                  </YStack>
                )}
                {!venueDetails.hours?.display && venueDetails.hours?.regular && venueDetails.hours.regular.length > 0 && (
                  <YStack gap="$2">
                    <XStack gap={8} alignItems="center">
                      <Clock size={14} color="$color" opacity={0.4} />
                      <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Hours</Text>
                    </XStack>
                    <YStack paddingLeft={22} gap="$1">
                      {venueDetails.hours.regular.map((h, i) => (
                        <XStack key={i} gap={8}>
                          <Text fontSize={12} color="$color" opacity={0.6} width={32}>{DAY_NAMES[h.day] || h.day}</Text>
                          <Text fontSize={12} color="$color">{formatHour(h.open)} - {formatHour(h.close)}</Text>
                        </XStack>
                      ))}
                    </YStack>
                  </YStack>
                )}

                {/* Photos */}
                {venueDetails.photos && venueDetails.photos.length > 0 && (
                  <YStack gap="$2">
                    <Text fontSize={12} color="$color" opacity={0.5} fontWeight="500">Photos</Text>
                    <XStack gap={8} flexWrap="wrap">
                      {venueDetails.photos.slice(0, 4).map((photo) => (
                        <img
                          key={photo.id}
                          src={`${photo.prefix}150x150${photo.suffix}`}
                          alt=""
                          style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }}
                        />
                      ))}
                    </XStack>
                  </YStack>
                )}
              </YStack>
            ) : (
              <YStack gap="$2">
                <Text fontSize={12} color="$color" opacity={0.5}>Venue ID</Text>
                <Text fontSize={14} color="$color" fontWeight="600" fontFamily="$mono">{foursquareVenueId}</Text>
              </YStack>
            )}

            {/* Discrepancy warnings */}
            {discrepancies.length > 0 && !editing && (
              <>
                <Separator borderColor="$borderColor" />
                <YStack gap="$3">
                  <XStack gap={8} alignItems="center">
                    <AlertTriangle size={16} color="#F59E0B" />
                    <Text fontSize={13} fontWeight="700" color="#F59E0B">
                      {discrepancies.length} Discrepanc{discrepancies.length === 1 ? 'y' : 'ies'} Found
                    </Text>
                  </XStack>
                  {discrepancies.map((d) => (
                    <Card key={d.field} backgroundColor="rgba(245,158,11,0.05)" borderRadius="$3" borderWidth={1} borderColor="rgba(245,158,11,0.2)" padding="$3">
                      <YStack gap="$1">
                        <Text fontSize={11} fontWeight="600" color="$color" opacity={0.5} textTransform="uppercase">{d.field}</Text>
                        <XStack gap={8}>
                          <YStack flex={1}>
                            <Text fontSize={10} color="$color" opacity={0.4}>HubSpot</Text>
                            <Text fontSize={12} fontWeight="600" color="#10B981">{d.hubspot || '—'}</Text>
                          </YStack>
                          <YStack flex={1}>
                            <Text fontSize={10} color="$color" opacity={0.4}>Foursquare</Text>
                            <Text fontSize={12} fontWeight="600" color="#F59E0B">{d.foursquare || '—'}</Text>
                          </YStack>
                        </XStack>
                      </YStack>
                    </Card>
                  ))}
                  <XStack gap={12}>
                    <Button
                      flex={1}
                      size="$3"
                      backgroundColor="rgba(245,158,11,0.1)"
                      borderWidth={1}
                      borderColor="rgba(245,158,11,0.3)"
                      onPress={handleFixAll}
                      disabled={proposing}
                      icon={proposing ? <Spinner size="small" color="#F59E0B" /> : <Pencil size={14} color="#F59E0B" />}
                    >
                      <Text color="#F59E0B" fontWeight="700" fontSize={13}>
                        {proposing ? 'Submitting...' : 'Fix All on Foursquare'}
                      </Text>
                    </Button>
                    <Button
                      size="$3"
                      backgroundColor="$background"
                      borderWidth={1}
                      borderColor="$borderColor"
                      onPress={() => setEditing(true)}
                      icon={<Pencil size={14} color="$color" />}
                    >
                      <Text color="$color" fontWeight="700" fontSize={13}>Edit Manually</Text>
                    </Button>
                  </XStack>
                </YStack>
              </>
            )}

            {/* Manual edit form */}
            {editing && (
              <>
                <Separator borderColor="$borderColor" />
                <ProposeEditForm
                  venueDetails={venueDetails}
                  hubspotProps={props}
                  onSubmit={handleProposeEdits}
                  onCancel={() => setEditing(false)}
                  submitting={proposing}
                />
              </>
            )}

            {/* No discrepancies badge */}
            {venueDetails && discrepancies.length === 0 && !editing && (
              <>
                <Separator borderColor="$borderColor" />
                <XStack gap={8} alignItems="center">
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text fontSize={12} color="#10B981" fontWeight="600">All data matches HubSpot</Text>
                </XStack>
              </>
            )}

            <Separator borderColor="$borderColor" />

            <XStack gap={12}>
              <Button
                flex={1}
                size="$3"
                backgroundColor="$background"
                borderWidth={1}
                borderColor="rgba(168,85,247,0.3)"
                onPress={() => {
                  window.open(`https://foursquare.com/v/${foursquareVenueId}`, '_blank')
                }}
                icon={<ExternalLink size={14} color="#A855F7" />}
              >
                <Text color="#A855F7" fontWeight="600" fontSize={13}>View on Foursquare</Text>
              </Button>
              {!editing && venueDetails && (
                <Button
                  size="$3"
                  backgroundColor="$background"
                  borderWidth={1}
                  borderColor="$borderColor"
                  onPress={() => setEditing(true)}
                  icon={<Pencil size={14} color="$color" />}
                >
                  <Text color="$color" fontWeight="600" fontSize={13}>Edit</Text>
                </Button>
              )}
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Error with notes */}
      {status === 'error' && serviceStatus?.notes && (
        <Card backgroundColor="$background" borderRadius="$5" borderWidth={2} borderColor="rgba(239,68,68,0.3)" padding="$6">
          <XStack gap={12} alignItems="center">
            <AlertCircle size={20} color="#EF4444" />
            <Text fontSize="$4" color="$color" opacity={0.7} flex={1}>{serviceStatus.notes}</Text>
          </XStack>
        </Card>
      )}
    </YStack>
  )
}

/** Compact venue result display used in search results */
function VenueResultCard({ venue }: { venue: FoursquarePlace }) {
  const addr = venue.location?.formatted_address
    || [venue.location?.address, venue.location?.locality, venue.location?.region].filter(Boolean).join(', ')
  const cats = venue.categories?.map(c => c.name).join(', ')

  return (
    <YStack gap="$1">
      <Text fontSize={14} fontWeight="700" color="$color">{venue.name}</Text>
      {addr && <Text fontSize={12} color="$color" opacity={0.6}>{addr}</Text>}
      {cats && <Text fontSize={11} color="#A855F7" opacity={0.8}>{cats}</Text>}
      {venue.tel && <Text fontSize={11} color="$color" opacity={0.5}>{venue.tel}</Text>}
    </YStack>
  )
}

interface Discrepancy {
  field: string
  apiField: string
  hubspot: string
  foursquare: string
}

function normalize(val: string | undefined | null): string {
  return (val || '').trim().toLowerCase().replace(/[\s\-\(\)\.]+/g, '')
}

function computeDiscrepancies(hubspotProps: any, venue: FoursquarePlace): Discrepancy[] {
  const results: Discrepancy[] = []

  const checks: Array<{ field: string; apiField: string; hubspot: string; foursquare: string }> = [
    {
      field: 'Phone',
      apiField: 'tel',
      hubspot: hubspotProps.phone || hubspotProps.mobilephone || '',
      foursquare: venue.tel || '',
    },
    {
      field: 'Website',
      apiField: 'website',
      hubspot: hubspotProps.website || hubspotProps.current_website || '',
      foursquare: venue.website || '',
    },
    {
      field: 'Address',
      apiField: 'address',
      hubspot: hubspotProps.address || '',
      foursquare: venue.location?.address || '',
    },
    {
      field: 'City',
      apiField: 'city',
      hubspot: hubspotProps.city || '',
      foursquare: venue.location?.locality || '',
    },
    {
      field: 'State',
      apiField: 'state',
      hubspot: hubspotProps.state || '',
      foursquare: venue.location?.region || '',
    },
  ]

  for (const check of checks) {
    if (check.hubspot && check.foursquare && normalize(check.hubspot) !== normalize(check.foursquare)) {
      results.push(check)
    }
    if (check.hubspot && !check.foursquare) {
      results.push({ ...check, foursquare: '(missing)' })
    }
  }

  return results
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid rgba(0,0,0,0.15)',
  fontSize: 13,
  background: 'transparent',
  color: 'inherit',
  width: '100%',
}

function ProposeEditForm({
  venueDetails,
  hubspotProps,
  onSubmit,
  onCancel,
  submitting,
}: {
  venueDetails: FoursquarePlace | null
  hubspotProps: any
  onSubmit: (edits: Record<string, string>) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [name, setName] = useState(venueDetails?.name || '')
  const [address, setAddress] = useState(venueDetails?.location?.address || '')
  const [city, setCity] = useState(venueDetails?.location?.locality || '')
  const [state, setState] = useState(venueDetails?.location?.region || '')
  const [zip, setZip] = useState(venueDetails?.location?.postcode || '')
  const [tel, setTel] = useState(venueDetails?.tel || '')
  const [website, setWebsite] = useState(venueDetails?.website || '')

  const handleSubmit = () => {
    const edits: Record<string, string> = {}
    if (name && name !== venueDetails?.name) edits.name = name
    if (address && address !== (venueDetails?.location?.address || '')) edits.address = address
    if (city && city !== (venueDetails?.location?.locality || '')) edits.city = city
    if (state && state !== (venueDetails?.location?.region || '')) edits.state = state
    if (zip && zip !== (venueDetails?.location?.postcode || '')) edits.zip = zip
    if (tel && tel !== (venueDetails?.tel || '')) edits.tel = tel
    if (website && website !== (venueDetails?.website || '')) edits.website = website

    if (Object.keys(edits).length === 0) {
      onCancel()
      return
    }
    onSubmit(edits)
  }

  const fillFromHubSpot = () => {
    if (hubspotProps.company) setName(hubspotProps.company)
    if (hubspotProps.address) setAddress(hubspotProps.address)
    if (hubspotProps.city) setCity(hubspotProps.city)
    if (hubspotProps.state) setState(hubspotProps.state)
    if (hubspotProps.zip) setZip(hubspotProps.zip)
    if (hubspotProps.phone) setTel(hubspotProps.phone)
    if (hubspotProps.website || hubspotProps.current_website) setWebsite(hubspotProps.website || hubspotProps.current_website)
  }

  return (
    <YStack gap="$4">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$4" fontWeight="700" color="$color">Propose Edits</Text>
        <Button size="$2" backgroundColor="$background" borderWidth={1} borderColor="$borderColor" onPress={fillFromHubSpot}>
          <Text fontSize={11} color="$color" fontWeight="600">Fill from HubSpot</Text>
        </Button>
      </XStack>
      <YStack gap="$2">
        {[
          { label: 'Name', value: name, setter: setName },
          { label: 'Address', value: address, setter: setAddress },
          { label: 'City', value: city, setter: setCity },
          { label: 'State', value: state, setter: setState },
          { label: 'ZIP', value: zip, setter: setZip },
          { label: 'Phone', value: tel, setter: setTel },
          { label: 'Website', value: website, setter: setWebsite },
        ].map(({ label, value, setter }) => (
          <YStack key={label} gap="$1">
            <Text fontSize={11} color="$color" opacity={0.5} fontWeight="500">{label}</Text>
            <input
              type="text"
              value={value}
              onChange={(e) => setter(e.target.value)}
              style={inputStyle}
            />
          </YStack>
        ))}
      </YStack>
      <XStack gap={12}>
        <Button
          flex={1}
          size="$3"
          backgroundColor="#A855F7"
          onPress={handleSubmit}
          disabled={submitting}
          icon={submitting ? <Spinner size="small" color="white" /> : <Send size={14} color="white" />}
        >
          <Text color="white" fontWeight="700" fontSize={13}>
            {submitting ? 'Submitting...' : 'Submit Edits'}
          </Text>
        </Button>
        <Button
          size="$3"
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
          onPress={onCancel}
          disabled={submitting}
          icon={<X size={14} color="$color" />}
        >
          <Text color="$color" fontWeight="700" fontSize={13}>Cancel</Text>
        </Button>
      </XStack>
    </YStack>
  )
}