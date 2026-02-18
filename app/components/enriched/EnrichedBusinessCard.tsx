/**
 * EnrichedBusinessCard Component
 *
 * Professional business card displaying enriched data from Supabase
 * Features:
 * - Business logo/hero image
 * - Contact information with copy-to-clipboard
 * - Business hours with open/closed status
 * - Services and categories
 * - Social media links
 * - Expandable details section
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, YStack, XStack, Text, Button, ScrollView, Separator } from 'tamagui';
import {
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  Building2,
  Clock,
  Calendar,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  CreditCard,
  Tag,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Link2,
  Briefcase,
  Copy,
  Check,
  Mail,
  CheckCircle2,
  XCircle,
  Award,
  Languages,
  Wrench,
  FileText,
  Hash,
} from 'lucide-react';
import type { EnrichedBusiness, BusinessHours } from '@/app/hooks/useEnrichedBusinesses';
import { getBusinessOpenStatus, formatPhone } from '@/app/hooks/useEnrichedBusinesses';

// ============================================================
// CONSTANTS
// ============================================================

const TEAL_COLOR = '#14B8A6';
const TEAL_LIGHT = 'rgba(20, 184, 166, 0.1)';
const TEAL_BORDER = 'rgba(20, 184, 166, 0.3)';

// ============================================================
// UTILITY COMPONENTS
// ============================================================

function useCopyToClipboard() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  return { copiedField, copyToClipboard };
}

function getSocialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return Facebook;
    case 'instagram':
      return Instagram;
    case 'linkedin':
      return Linkedin;
    case 'twitter':
      return Twitter;
    case 'youtube':
      return Youtube;
    case 'yelp':
      return Globe;
    case 'tiktok':
      return Globe;
    default:
      return Link2;
  }
}

function formatHoursForDisplay(hours: BusinessHours) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return days.map((day, i) => {
    const value = hours[day as keyof BusinessHours];
    const isOpen = value && value.toLowerCase() !== 'closed';
    return {
      day: labels[i],
      hours: value || 'N/A',
      isOpen,
    };
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface EnrichedBusinessCardProps {
  business: EnrichedBusiness;
  expanded?: boolean;
}

export function EnrichedBusinessCard({ business, expanded = false }: EnrichedBusinessCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const { copiedField, copyToClipboard } = useCopyToClipboard();

  // Build full address
  const fullAddress = [
    business.street_address,
    business.city,
    business.state,
    business.zip_code,
  ]
    .filter(Boolean)
    .join(', ');

  // Get website display URL
  const displayUrl = business.website
    ? business.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    : '';

  // Check for rich data
  const hasImages = business.images && business.images.length > 0;
  const hasHours = business.business_hours;
  const hasSocialMedia = business.social_media && Object.values(business.social_media).some((v) => v);
  const hasServices = business.services && business.services.length > 0;
  const hasCategories = business.categories && business.categories.length > 0;
  const hasCertifications = business.certifications && business.certifications.length > 0;
  const hasAttributes = business.attributes;
  const hasRichData = hasHours || hasSocialMedia || hasServices || hasAttributes;

  // Get open status
  const openStatus = useMemo(
    () => getBusinessOpenStatus(business.business_hours),
    [business.business_hours]
  );

  // Get payment methods
  const paymentMethods = business.attributes?.paymentMethods || [];

  // Get social media links
  const socialLinks = hasSocialMedia
    ? Object.entries(business.social_media!)
        .filter(([, url]) => url)
        .map(([platform, url]) => ({ platform, url: url as string }))
    : [];

  return (
    <Card
      size="$4"
      bordered
      padding="$5"
      backgroundColor={TEAL_LIGHT}
      borderColor={TEAL_BORDER}
      borderLeftWidth={5}
      borderLeftColor={TEAL_COLOR}
      hoverStyle={{
        borderColor: 'rgba(20, 184, 166, 0.5)',
        scale: 1.003,
      }}
      animation="quick"
      $sm={{ padding: '$4' }}
    >
      <YStack gap="$4">
        {/* HEADER SECTION */}
        <XStack gap="$5" flexWrap="wrap" $sm={{ gap: '$4' }}>
          {/* Logo/Placeholder */}
          <YStack
            width={120}
            height={120}
            borderRadius="$4"
            overflow="hidden"
            backgroundColor="rgba(20, 184, 166, 0.15)"
            alignItems="center"
            justifyContent="center"
            $sm={{ width: 100, height: 100 }}
          >
            {business.logo ? (
              <img
                src={business.logo.replace(/^public\//, '/')}
                alt={`${business.business_name} logo`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  // Hide broken image and show fallback
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Building2 size={48} color={TEAL_COLOR} opacity={0.6} />
            )}
          </YStack>

          {/* Business Info */}
          <YStack flex={1} gap="$3" minWidth={250}>
            {/* Name & Categories */}
            <YStack gap="$2">
              <Text fontSize="$8" fontWeight="700" color="$color" $sm={{ fontSize: '$7' }}>
                {business.business_name}
              </Text>
              {business.business_name_alternate && (
                <Text fontSize="$5" color="$color" opacity={0.7} fontStyle="italic">
                  DBA: {business.business_name_alternate}
                </Text>
              )}
              {hasCategories && (
                <XStack gap="$2" flexWrap="wrap">
                  {business.categories.slice(0, 3).map((cat, idx) => (
                    <XStack
                      key={idx}
                      alignItems="center"
                      gap="$1.5"
                      paddingHorizontal="$2.5"
                      paddingVertical="$1.5"
                      borderRadius="$2"
                      backgroundColor="rgba(20, 184, 166, 0.2)"
                    >
                      <Tag size={14} color={TEAL_COLOR} />
                      <Text fontSize="$4" color={TEAL_COLOR} fontWeight="600">
                        {cat}
                      </Text>
                    </XStack>
                  ))}
                  {business.categories.length > 3 && (
                    <Text fontSize="$4" color="$color" opacity={0.5}>
                      +{business.categories.length - 3} more
                    </Text>
                  )}
                </XStack>
              )}
            </YStack>

            {/* Contact Info */}
            <YStack gap="$2.5">
              {/* Phone */}
              {business.phone && (
                <XStack gap="$3" alignItems="center">
                  <Phone size={18} color={TEAL_COLOR} opacity={0.8} />
                  <Text
                    flex={1}
                    fontSize="$5"
                    color="$color"
                    fontWeight="500"
                    cursor="pointer"
                    onPress={() => window.open(`tel:${business.phone}`, '_self')}
                    hoverStyle={{ color: TEAL_COLOR }}
                  >
                    {formatPhone(business.phone)}
                  </Text>
                  <Button
                    size="$3"
                    circular
                    backgroundColor={copiedField === 'phone' ? 'rgba(16, 185, 129, 0.2)' : TEAL_LIGHT}
                    onPress={() => copyToClipboard(business.phone!, 'phone')}
                    hoverStyle={{ backgroundColor: 'rgba(20, 184, 166, 0.2)' }}
                  >
                    {copiedField === 'phone' ? (
                      <Check size={16} color="#10B981" />
                    ) : (
                      <Copy size={16} color={TEAL_COLOR} />
                    )}
                  </Button>
                </XStack>
              )}

              {/* Email */}
              {business.email && (
                <XStack gap="$3" alignItems="center">
                  <Mail size={18} color={TEAL_COLOR} opacity={0.8} />
                  <Text
                    flex={1}
                    fontSize="$5"
                    color="$color"
                    fontWeight="500"
                    cursor="pointer"
                    onPress={() => window.open(`mailto:${business.email}`, '_self')}
                    hoverStyle={{ color: TEAL_COLOR }}
                    numberOfLines={1}
                  >
                    {business.email}
                  </Text>
                  <Button
                    size="$3"
                    circular
                    backgroundColor={copiedField === 'email' ? 'rgba(16, 185, 129, 0.2)' : TEAL_LIGHT}
                    onPress={() => copyToClipboard(business.email!, 'email')}
                    hoverStyle={{ backgroundColor: 'rgba(20, 184, 166, 0.2)' }}
                  >
                    {copiedField === 'email' ? (
                      <Check size={16} color="#10B981" />
                    ) : (
                      <Copy size={16} color={TEAL_COLOR} />
                    )}
                  </Button>
                </XStack>
              )}

              {/* Website */}
              {business.website && (
                <XStack gap="$3" alignItems="center">
                  <Globe size={18} color={TEAL_COLOR} opacity={0.8} />
                  <XStack
                    flex={1}
                    alignItems="center"
                    gap="$1.5"
                    cursor="pointer"
                    onPress={() => window.open(business.website!, '_blank')}
                    hoverStyle={{ opacity: 0.8 }}
                  >
                    <Text fontSize="$5" color={TEAL_COLOR} fontWeight="500" numberOfLines={1}>
                      {displayUrl}
                    </Text>
                    <ExternalLink size={16} color={TEAL_COLOR} />
                  </XStack>
                </XStack>
              )}

              {/* Address */}
              {fullAddress && (
                <XStack gap="$3" alignItems="flex-start">
                  <MapPin size={18} color={TEAL_COLOR} opacity={0.8} style={{ marginTop: 2 }} />
                  <Text flex={1} fontSize="$5" color="$color" fontWeight="500">
                    {fullAddress}
                  </Text>
                </XStack>
              )}
            </YStack>
          </YStack>

          {/* Status Badges */}
          <YStack gap="$2.5" alignItems="flex-end" $sm={{ alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap' }}>
            {/* Open/Closed Status */}
            {hasHours && (
              <XStack
                alignItems="center"
                gap="$2"
                paddingHorizontal="$3.5"
                paddingVertical="$2.5"
                borderRadius="$3"
                backgroundColor={openStatus.isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
              >
                {openStatus.isOpen ? (
                  <CheckCircle2 size={16} color="#10B981" />
                ) : (
                  <XCircle size={16} color="#EF4444" />
                )}
                <Text
                  fontSize="$4"
                  fontWeight="700"
                  color={openStatus.isOpen ? '#10B981' : '#EF4444'}
                >
                  {openStatus.statusText}
                </Text>
              </XStack>
            )}

            {/* BrightLocal Category */}
            {business.brightlocal_category_id && (
              <XStack
                alignItems="center"
                gap="$2"
                paddingHorizontal="$3.5"
                paddingVertical="$2.5"
                borderRadius="$3"
                backgroundColor="rgba(59, 130, 246, 0.15)"
              >
                <Hash size={16} color="#3B82F6" />
                <Text fontSize="$4" fontWeight="700" color="#3B82F6">
                  BL #{business.brightlocal_category_id}
                </Text>
              </XStack>
            )}

            {/* HubSpot Link */}
            <XStack
              alignItems="center"
              gap="$2"
              paddingHorizontal="$3.5"
              paddingVertical="$2.5"
              borderRadius="$3"
              backgroundColor="rgba(247, 107, 28, 0.15)"
              cursor="pointer"
              onPress={() => business.hubspot_url && window.open(business.hubspot_url, '_blank')}
              hoverStyle={{ backgroundColor: 'rgba(247, 107, 28, 0.25)' }}
            >
              <Link2 size={16} color="#F76B1C" />
              <Text fontSize="$4" fontWeight="700" color="#F76B1C">
                HubSpot
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* Short Description */}
        {business.short_description && (
          <Text fontSize="$5" color="$color" opacity={0.8} lineHeight="$6">
            {business.short_description}
          </Text>
        )}

        {/* Services */}
        {hasServices && (
          <XStack gap="$2.5" flexWrap="wrap">
            <Wrench size={18} color={TEAL_COLOR} style={{ marginTop: 4 }} />
            {business.services.slice(0, 5).map((service, idx) => (
              <XStack
                key={idx}
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$2"
                backgroundColor="rgba(20, 184, 166, 0.1)"
                borderWidth={1}
                borderColor="rgba(20, 184, 166, 0.2)"
              >
                <Text fontSize="$4" color="$color" opacity={0.9}>
                  {service}
                </Text>
              </XStack>
            ))}
            {business.services.length > 5 && (
              <Text fontSize="$4" color="$color" opacity={0.5} alignSelf="center">
                +{business.services.length - 5} more
              </Text>
            )}
          </XStack>
        )}

        {/* Social Media Links */}
        {socialLinks.length > 0 && (
          <XStack gap="$3" flexWrap="wrap">
            {socialLinks.map(({ platform, url }) => {
              const Icon = getSocialIcon(platform);
              return (
                <XStack
                  key={platform}
                  alignItems="center"
                  gap="$2"
                  paddingHorizontal="$3.5"
                  paddingVertical="$2.5"
                  borderRadius="$3"
                  backgroundColor="rgba(255,255,255,0.05)"
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.1)"
                  cursor="pointer"
                  hoverStyle={{
                    backgroundColor: TEAL_LIGHT,
                    borderColor: TEAL_BORDER,
                  }}
                  onPress={() => window.open(url, '_blank')}
                >
                  <Icon size={18} color={TEAL_COLOR} />
                  <Text fontSize="$4" color="$color" fontWeight="500" textTransform="capitalize">
                    {platform}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        )}

        {/* Expandable Section */}
        {(hasRichData || hasImages) && (
          <>
            <Button
              size="$4"
              variant="outlined"
              borderColor={TEAL_BORDER}
              backgroundColor="rgba(20, 184, 166, 0.05)"
              onPress={() => setIsExpanded(!isExpanded)}
              icon={isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            >
              <Text fontSize="$4" color={TEAL_COLOR} fontWeight="600">
                {isExpanded ? 'Hide Details' : 'Show More Details'}
              </Text>
            </Button>

            {isExpanded && (
              <YStack gap="$5" marginTop="$2" paddingTop="$4" borderTopWidth={1} borderTopColor="rgba(255,255,255,0.1)">
                {/* Images Gallery */}
                {hasImages && (
                  <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                      <ImageIcon size={20} color={TEAL_COLOR} />
                      <Text fontSize="$6" fontWeight="700" color="$color">
                        Photos ({business.images.length})
                      </Text>
                    </XStack>
                    <XStack gap="$3" flexWrap="wrap">
                      {business.images.map((imageUrl, idx) => (
                        <YStack
                          key={idx}
                          width={150}
                          height={100}
                          borderRadius="$3"
                          overflow="hidden"
                          backgroundColor="rgba(20, 184, 166, 0.1)"
                          borderWidth={1}
                          borderColor="rgba(20, 184, 166, 0.2)"
                          cursor="pointer"
                          hoverStyle={{
                            borderColor: TEAL_COLOR,
                            scale: 1.02,
                          }}
                          animation="quick"
                          onPress={() => window.open(imageUrl, '_blank')}
                        >
                          <img
                            src={imageUrl}
                            alt={`${business.business_name} photo ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </YStack>
                      ))}
                    </XStack>
                    {business.images_note && (
                      <Text fontSize="$4" color="$color" opacity={0.6} fontStyle="italic">
                        Note: {business.images_note}
                      </Text>
                    )}
                  </YStack>
                )}

                {/* Long Description */}
                {business.long_description && (
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <FileText size={20} color={TEAL_COLOR} />
                      <Text fontSize="$6" fontWeight="700" color="$color">
                        About
                      </Text>
                    </XStack>
                    <Text fontSize="$5" color="$color" opacity={0.8} lineHeight="$6">
                      {business.long_description}
                    </Text>
                  </YStack>
                )}

                {/* Business Hours */}
                {hasHours && (
                  <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                      <Clock size={20} color={TEAL_COLOR} />
                      <Text fontSize="$6" fontWeight="700" color="$color">
                        Business Hours
                      </Text>
                    </XStack>
                    <XStack gap="$3" flexWrap="wrap">
                      {formatHoursForDisplay(business.business_hours!).map((day, idx) => (
                        <YStack
                          key={idx}
                          width={110}
                          padding="$3"
                          borderRadius="$3"
                          backgroundColor={day.isOpen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                          borderWidth={1}
                          borderColor={day.isOpen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                          alignItems="center"
                        >
                          <Text fontSize="$5" fontWeight="700" color={day.isOpen ? '#10B981' : '#EF4444'}>
                            {day.day}
                          </Text>
                          <Text fontSize="$3" color="$color" opacity={0.75} textAlign="center">
                            {day.hours}
                          </Text>
                        </YStack>
                      ))}
                    </XStack>
                  </YStack>
                )}

                {/* All Services */}
                {hasServices && business.services.length > 5 && (
                  <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                      <Wrench size={20} color={TEAL_COLOR} />
                      <Text fontSize="$6" fontWeight="700" color="$color">
                        All Services ({business.services.length})
                      </Text>
                    </XStack>
                    <XStack gap="$2.5" flexWrap="wrap">
                      {business.services.map((service, idx) => (
                        <XStack
                          key={idx}
                          paddingHorizontal="$3"
                          paddingVertical="$2"
                          borderRadius="$2"
                          backgroundColor="rgba(20, 184, 166, 0.1)"
                          borderWidth={1}
                          borderColor="rgba(20, 184, 166, 0.2)"
                        >
                          <Text fontSize="$4" color="$color" opacity={0.9}>
                            {service}
                          </Text>
                        </XStack>
                      ))}
                    </XStack>
                  </YStack>
                )}

                {/* Certifications */}
                {hasCertifications && (
                  <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                      <Award size={20} color={TEAL_COLOR} />
                      <Text fontSize="$6" fontWeight="700" color="$color">
                        Certifications
                      </Text>
                    </XStack>
                    <XStack gap="$2.5" flexWrap="wrap">
                      {business.certifications.map((cert, idx) => (
                        <XStack
                          key={idx}
                          alignItems="center"
                          gap="$2"
                          paddingHorizontal="$3.5"
                          paddingVertical="$2.5"
                          borderRadius="$3"
                          backgroundColor="rgba(245, 158, 11, 0.1)"
                          borderWidth={1}
                          borderColor="rgba(245, 158, 11, 0.3)"
                        >
                          <Award size={16} color="#F59E0B" />
                          <Text fontSize="$4" color="#F59E0B" fontWeight="500">
                            {cert}
                          </Text>
                        </XStack>
                      ))}
                    </XStack>
                  </YStack>
                )}

                {/* Attributes */}
                {hasAttributes && (
                  <YStack gap="$3">
                    {/* Languages */}
                    {business.attributes!.languages && business.attributes!.languages.length > 0 && (
                      <XStack alignItems="center" gap="$3">
                        <Languages size={18} color={TEAL_COLOR} />
                        <Text fontSize="$5" color="$color" opacity={0.8}>
                          Languages: {business.attributes!.languages.join(', ')}
                        </Text>
                      </XStack>
                    )}

                    {/* Payment Methods */}
                    {paymentMethods.length > 0 && (
                      <YStack gap="$2">
                        <XStack alignItems="center" gap="$2">
                          <CreditCard size={18} color={TEAL_COLOR} />
                          <Text fontSize="$5" color="$color" fontWeight="600">
                            Payment Methods
                          </Text>
                        </XStack>
                        <XStack gap="$2.5" flexWrap="wrap">
                          {paymentMethods.map((method, idx) => (
                            <XStack
                              key={idx}
                              paddingHorizontal="$3"
                              paddingVertical="$2"
                              borderRadius="$2"
                              backgroundColor="rgba(59, 130, 246, 0.1)"
                              borderWidth={1}
                              borderColor="rgba(59, 130, 246, 0.2)"
                            >
                              <Text fontSize="$4" color="#3B82F6" fontWeight="500">
                                {method}
                              </Text>
                            </XStack>
                          ))}
                        </XStack>
                      </YStack>
                    )}

                    {/* Years in Business */}
                    {business.attributes!.yearsInBusiness && (
                      <XStack alignItems="center" gap="$3">
                        <Briefcase size={18} color={TEAL_COLOR} />
                        <Text fontSize="$5" color="$color" opacity={0.8}>
                          Years in Business: {business.attributes!.yearsInBusiness}
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                )}

                {/* Service Area */}
                {business.service_area && (
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <MapPin size={20} color={TEAL_COLOR} />
                      <Text fontSize="$6" fontWeight="700" color="$color">
                        Service Area
                      </Text>
                    </XStack>
                    <Text fontSize="$5" color="$color" opacity={0.8}>
                      {business.service_area}
                    </Text>
                  </YStack>
                )}
              </YStack>
            )}
          </>
        )}

        {/* Footer */}
        {business.enrichment_date && (
          <XStack
            marginTop="$2"
            paddingTop="$3"
            borderTopWidth={1}
            borderTopColor="rgba(255,255,255,0.05)"
            alignItems="center"
            gap="$2"
          >
            <Calendar size={16} color="$color" style={{ opacity: 0.5 }} />
            <Text fontSize="$4" color="$color" opacity={0.5}>
              Enriched: {new Date(business.enrichment_date).toLocaleDateString()}
            </Text>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}
