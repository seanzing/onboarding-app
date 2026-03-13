// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { YStack, XStack, Text, Card, Button, Spinner, Separator } from 'tamagui'
import { MapPin, AlertCircle, AlertTriangle, CheckCircle2, Send, Download, ExternalLink, Search, Link2, Plus, RefreshCw, Phone, Globe, Clock, Tag, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingServiceStatus, FoursquarePlace } from '@/app/types/onboarding'
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

  const status = serviceStatus?.status ?? 'not_started'
  const metadata = serviceStatus?.metadata ?? {}
  const props = company.properties

  // Compute discrepancies between HubSpot data and Foursquare data
  const discrepancies = venueDetails ? computeDiscrepancies(props, venueDetails) : []

  // Fetch venue details when active
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
        body: JSON.stringify({
          name: venueName,
          fsq_id: fsqId,
        }),
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
      const res = await fetch(`/api/onboarding/${contactId}/foursquare/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: props.company || `${props.firstname} ${props.lastname}`,
          address: props.address || '',
          city: props.city || '',
          state: props.state || '',
          zip: props.zip || '',
          phone: props.phone || '',
          website: props.website || '',
          categories: [],
        }),
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
    const exportData = {
      name: props.company || `${props.firstname || ''} ${props.lastname || ''}`.trim(),
      address: props.address || '',
      city: props.city || '',
      state: props.state || '',
      zip: props.zip || '',
      phone: props.phone || '',
      website: props.website || '',
      email: props.email || '',
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

      {/* Not started / Error — Search & Submit workflow */}
      {!foursquareVenueId && (status === 'not_started' || status === 'error') && (
        <>
          {/* Business data preview */}
          <Card backgroundColor="$background" borderRadius="$5" borderWidth={1} borderColor="$borderColor" padding="$6">
            <YStack gap="$5">
              <Text fontSize="$5" fontWeight="700" color="$color">Business Data for Submission</Text>

              <YStack gap="$3">
                {[
                  { label: 'Business Name', value: props.company || `${props.firstname || ''} ${props.lastname || ''}`.trim() },
                  { label: 'Address', value: props.address },
                  { label: 'City', value: props.city },
                  { label: 'State', value: props.state },
                  { label: 'ZIP', value: props.zip },
                  { label: 'Phone', value: props.phone },
                  { label: 'Website', value: props.website },
                ].map(({ label, value }) => (
                  <XStack key={label} gap={12}>
                    <Text fontSize={13} color="$color" opacity={0.5} fontWeight="500" width={120}>{label}</Text>
                    <Text fontSize={13} color="$color" fontWeight="500" flex={1}>{value || '—'}</Text>
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
              /* Fallback: just show venue ID */
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
    // Only flag if both sides have a value and they differ
    if (check.hubspot && check.foursquare && normalize(check.hubspot) !== normalize(check.foursquare)) {
      results.push(check)
    }
    // Also flag if HubSpot has data but Foursquare is missing it
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
