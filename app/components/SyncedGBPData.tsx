/**
 * Synced GBP Data Display Component
 *
 * BUSINESS-BY-BUSINESS ORGANIZATION
 * Displays GBP data grouped by business/location:
 * - Each business has its own section
 * - Reviews, Analytics, Posts, Media shown per business
 * - Clear "No Data" states when sections are empty
 *
 * This data is synced via CRON jobs from Supabase.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { YStack, XStack, Card, Text, Spinner, Button, Separator, ScrollView } from 'tamagui';
import {
  Star,
  MessageSquare,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  Clock,
  User,
  BarChart3,
  Search,
  Eye,
  Calendar,
  CheckCircle,
  Building2,
  MapPin,
  Phone,
  Globe,
  Tag,
  ShieldCheck,
  AlertCircle,
  Inbox,
  Camera,
  Megaphone,
  ChevronDown,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import { useSupabaseGBP } from '@/app/hooks/useSupabaseGBP';
import type {
  GBPReview,
  GBPAnalyticsSnapshot,
  GBPPost,
  GBPMedia,
  GBPLocationSync,
} from '@/app/api/supabase/gbp/route';

interface SyncedGBPDataProps {
  locationId?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * NoDataSection - Displays a friendly empty state for missing data
 */
function NoDataSection({
  icon: Icon,
  title,
  description,
  color = '#6b7280',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color?: string;
}) {
  return (
    <Card
      backgroundColor={`${color}08` as any}
      borderRadius="$4"
      borderWidth={1}
      borderColor={`${color}20` as any}
      borderStyle="dashed"
      padding="$5"
    >
      <YStack alignItems="center" space="$3">
        <YStack
          width={48}
          height={48}
          borderRadius="$4"
          backgroundColor={`${color}15` as any}
          justifyContent="center"
          alignItems="center"
        >
          <Icon size={24} color={color as any} strokeWidth={1.5} />
        </YStack>
        <YStack alignItems="center" space="$1">
          <Text fontSize="$4" fontWeight="700" color={color as any}>
            {title}
          </Text>
          <Text fontSize="$3" color="$color" opacity={0.6} textAlign="center">
            {description}
          </Text>
        </YStack>
      </YStack>
    </Card>
  );
}

/**
 * Star Rating Display - Safe handling of null ratings
 */
function StarRating({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined) {
    return <Text fontSize="$3" color="$color" opacity={0.5}>No rating</Text>;
  }

  return (
    <XStack space="$1" alignItems="center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= rating ? '#f59e0b' : 'transparent'}
          color={star <= rating ? '#f59e0b' : '#d1d5db'}
          strokeWidth={1.5}
        />
      ))}
      <Text fontSize="$3" fontWeight="700" color="#f59e0b" marginLeft="$1">
        {rating}
      </Text>
    </XStack>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
  color: string;
}) {
  return (
    <Card
      flex={1}
      minWidth={120}
      padding="$3"
      backgroundColor={`${color}10` as any}
      borderRadius="$3"
      borderWidth={1}
      borderColor={`${color}30` as any}
    >
      <YStack space="$1">
        <XStack alignItems="center" space="$2">
          <Icon size={16} color={color as any} strokeWidth={2} />
          <Text fontSize="$2" color={color as any} fontWeight="600" opacity={0.9}>
            {label}
          </Text>
        </XStack>
        <Text fontSize="$6" fontWeight="800" color={color as any}>
          {value ?? 0}
        </Text>
        {sublabel && (
          <Text fontSize="$1" color="$color" opacity={0.6}>
            {sublabel}
          </Text>
        )}
      </YStack>
    </Card>
  );
}

/**
 * Safe date formatting
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown date';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * CollapsibleSection - A section that can be expanded/collapsed
 */
function CollapsibleSection({
  icon: Icon,
  title,
  count,
  color,
  isExpanded,
  onToggle,
  children,
  emptyComponent,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  emptyComponent: React.ReactNode;
}) {
  const hasContent = count > 0;

  return (
    <YStack space="$3">
      {/* Clickable Header */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        padding="$3"
        backgroundColor={`${color}08` as any}
        borderRadius="$3"
        cursor="pointer"
        hoverStyle={{ backgroundColor: `${color}15` as any }}
        pressStyle={{ backgroundColor: `${color}20` as any }}
        onPress={onToggle}
      >
        <XStack alignItems="center" space="$2" flex={1}>
          <Icon size={18} color={color as any} strokeWidth={2} />
          <Text fontSize="$4" fontWeight="700" color="$color">
            {title}
          </Text>
          {/* Count Badge */}
          <XStack
            backgroundColor={hasContent ? (`${color}20` as any) : 'rgba(156, 163, 175, 0.2)'}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text
              fontSize="$2"
              fontWeight="700"
              color={hasContent ? (color as any) : '#9ca3af'}
            >
              {count}
            </Text>
          </XStack>
        </XStack>
        {/* Expand/Collapse Icon */}
        {isExpanded ? (
          <ChevronDown size={20} color={color as any} strokeWidth={2} />
        ) : (
          <ChevronRight size={20} color={color as any} strokeWidth={2} />
        )}
      </XStack>

      {/* Collapsible Content */}
      {isExpanded && (
        <YStack
          animation="quick"
          enterStyle={{ opacity: 0, y: -10 }}
          exitStyle={{ opacity: 0, y: -10 }}
          paddingLeft="$2"
        >
          {hasContent ? children : emptyComponent}
        </YStack>
      )}
    </YStack>
  );
}

// =============================================================================
// DATA DISPLAY COMPONENTS
// =============================================================================

/**
 * Review Card Component - Safe handling of all fields
 */
function ReviewCard({ review }: { review: GBPReview }) {
  return (
    <Card
      backgroundColor="$background"
      borderRadius="$4"
      borderWidth={1}
      borderColor="rgba(245, 158, 11, 0.2)"
      padding="$4"
    >
      <YStack space="$3">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <XStack space="$3" alignItems="center" flex={1}>
            <YStack
              width={40}
              height={40}
              borderRadius="$3"
              backgroundColor="rgba(245, 158, 11, 0.1)"
              justifyContent="center"
              alignItems="center"
            >
              <User size={20} color="#f59e0b" strokeWidth={2} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={1}>
                {review.reviewer_display_name || 'Anonymous'}
              </Text>
              <Text fontSize="$2" color="$color" opacity={0.6}>
                {formatDate(review.create_time)}
              </Text>
            </YStack>
          </XStack>
          <StarRating rating={review.star_rating} />
        </XStack>

        {/* Comment */}
        {review.comment && (
          <Text fontSize="$3" color="$color" opacity={0.85} lineHeight={20}>
            {review.comment}
          </Text>
        )}

        {/* Reply */}
        {review.reply_comment && (
          <YStack
            backgroundColor="rgba(16, 185, 129, 0.08)"
            padding="$3"
            borderRadius="$3"
            borderLeftWidth={3}
            borderLeftColor="#10b981"
          >
            <XStack space="$2" alignItems="center" marginBottom="$2">
              <CheckCircle size={14} color="#10b981" strokeWidth={2} />
              <Text fontSize="$2" color="#10b981" fontWeight="700">
                Owner Response
              </Text>
            </XStack>
            <Text fontSize="$3" color="$color" opacity={0.8} lineHeight={18}>
              {review.reply_comment}
            </Text>
          </YStack>
        )}
      </YStack>
    </Card>
  );
}

/**
 * Keyword Card Component
 */
function KeywordCard({ keyword, impressions, rank }: { keyword: string; impressions: number; rank: number }) {
  return (
    <XStack
      padding="$3"
      backgroundColor="rgba(59, 130, 246, 0.08)"
      borderRadius="$3"
      alignItems="center"
      justifyContent="space-between"
    >
      <XStack space="$3" alignItems="center" flex={1}>
        <YStack
          width={28}
          height={28}
          borderRadius="$2"
          backgroundColor="rgba(59, 130, 246, 0.2)"
          justifyContent="center"
          alignItems="center"
        >
          <Text fontSize="$3" fontWeight="700" color="#3b82f6">
            #{rank}
          </Text>
        </YStack>
        <Text fontSize="$3" fontWeight="600" color="$color" flex={1} numberOfLines={1}>
          {keyword || 'Unknown keyword'}
        </Text>
      </XStack>
      <XStack space="$1" alignItems="center">
        <Eye size={14} color="#3b82f6" strokeWidth={2} />
        <Text fontSize="$3" fontWeight="700" color="#3b82f6">
          {(impressions ?? 0).toLocaleString()}
        </Text>
      </XStack>
    </XStack>
  );
}

/**
 * Media Card Component - With error handling for broken images
 */
function MediaCard({ item }: { item: GBPMedia }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.thumbnail_url || item.google_url;

  return (
    <Card
      width={160}
      height={200}
      borderRadius="$4"
      overflow="hidden"
      borderWidth={1}
      borderColor="rgba(139, 92, 246, 0.2)"
    >
      {imageUrl && !imageError ? (
        <YStack flex={1}>
          <img
            src={imageUrl}
            alt={item.media_format || 'Media'}
            style={{
              width: '100%',
              height: 140,
              objectFit: 'cover',
            }}
            onError={() => setImageError(true)}
          />
          <YStack padding="$2" backgroundColor="$background">
            <Text fontSize="$2" color="$color" opacity={0.7} numberOfLines={1}>
              {item.media_format || 'Unknown'}
            </Text>
            {(item.view_count ?? 0) > 0 && (
              <XStack space="$1" alignItems="center">
                <Eye size={12} color="#8b5cf6" />
                <Text fontSize="$2" color="#8b5cf6" fontWeight="600">
                  {item.view_count?.toLocaleString() ?? 0} views
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>
      ) : (
        <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="rgba(139, 92, 246, 0.1)">
          <ImageIcon size={32} color="#8b5cf6" strokeWidth={1.5} />
          <Text fontSize="$2" color="#8b5cf6" marginTop="$2" textAlign="center">
            {imageError ? 'Image unavailable' : 'No preview'}
          </Text>
        </YStack>
      )}
    </Card>
  );
}

/**
 * Post Card Component
 */
function PostCard({ post }: { post: GBPPost }) {
  const getPostTypeColor = (type: string | null | undefined) => {
    switch (type?.toUpperCase()) {
      case 'STANDARD': return '#3b82f6';
      case 'EVENT': return '#8b5cf6';
      case 'OFFER': return '#10b981';
      case 'ALERT': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <Card
      backgroundColor="$background"
      borderRadius="$4"
      borderWidth={1}
      borderColor="rgba(59, 130, 246, 0.2)"
      padding="$4"
    >
      <YStack space="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} space="$1">
            {post.topic_type && (
              <XStack
                backgroundColor={`${getPostTypeColor(post.topic_type)}15`}
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
                alignSelf="flex-start"
              >
                <Text fontSize="$2" fontWeight="700" color={getPostTypeColor(post.topic_type)}>
                  {post.topic_type}
                </Text>
              </XStack>
            )}
            <XStack space="$1" alignItems="center">
              <Calendar size={12} color="#6b7280" strokeWidth={2} />
              <Text fontSize="$2" color="$color" opacity={0.6}>
                {formatDate(post.create_time)}
              </Text>
            </XStack>
          </YStack>
          {post.state && (
            <XStack
              backgroundColor={post.state === 'LIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)'}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text
                fontSize="$2"
                fontWeight="600"
                color={post.state === 'LIVE' ? '#10b981' : '#6b7280'}
              >
                {post.state}
              </Text>
            </XStack>
          )}
        </XStack>

        {post.summary && (
          <Text fontSize="$3" color="$color" opacity={0.85} lineHeight={20} numberOfLines={3}>
            {post.summary}
          </Text>
        )}

        {post.event_title && (
          <XStack space="$2" alignItems="center" backgroundColor="rgba(139, 92, 246, 0.08)" padding="$2" borderRadius="$2">
            <Calendar size={14} color="#8b5cf6" strokeWidth={2} />
            <Text fontSize="$3" fontWeight="600" color="#8b5cf6">
              {post.event_title}
            </Text>
          </XStack>
        )}

        {post.call_to_action_type && post.call_to_action_url && (
          <XStack space="$2" alignItems="center">
            <Button
              size="$2"
              backgroundColor="$zingBlue"
              borderRadius="$2"
              onPress={() => window.open(post.call_to_action_url!, '_blank')}
            >
              <Text fontSize="$2" color="white" fontWeight="600">
                {post.call_to_action_type.replace(/_/g, ' ')}
              </Text>
            </Button>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}

// =============================================================================
// BUSINESS SECTION COMPONENT
// =============================================================================

interface BusinessData {
  location: GBPLocationSync | null;
  reviews: GBPReview[];
  analytics: GBPAnalyticsSnapshot[];
  posts: GBPPost[];
  media: GBPMedia[];
}

// Section keys for tracking expanded state
type SectionKey = 'reviews' | 'keywords' | 'posts' | 'media';

/**
 * BusinessSection - Displays ALL data for one business in organized sections
 * All sections are COLLAPSIBLE - default to collapsed
 */
function BusinessSection({ data, businessId }: { data: BusinessData; businessId: string }) {
  const { location, reviews, analytics, posts, media } = data;

  // Track which sections are expanded (default: all collapsed)
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set());

  const toggleSection = useCallback((section: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const isSectionExpanded = (section: SectionKey) => expandedSections.has(section);

  // Parse keywords from analytics - safe handling
  const latestAnalytics = analytics[0];
  const keywords = useMemo(() => {
    if (!latestAnalytics?.keywords) return [];
    try {
      const parsed = typeof latestAnalytics.keywords === 'string'
        ? JSON.parse(latestAnalytics.keywords)
        : latestAnalytics.keywords;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [latestAnalytics?.keywords]);

  // Calculate stats for this business
  const reviewsWithRating = reviews.filter(r => r.star_rating !== null && r.star_rating !== undefined);
  const avgRating = reviewsWithRating.length > 0
    ? reviewsWithRating.reduce((sum, r) => sum + (r.star_rating || 0), 0) / reviewsWithRating.length
    : 0;

  // Safe address formatting
  const formatAddress = () => {
    if (!location) return null;
    const parts = [
      location.address_lines?.join(', '),
      location.locality,
      location.administrative_area,
      location.postal_code,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const hasAddress = location && (location.address_lines?.length || location.locality);
  const formattedAddress = formatAddress();

  return (
    <Card
      backgroundColor="$background"
      borderRadius="$5"
      borderWidth={2}
      borderColor="rgba(59, 130, 246, 0.2)"
      padding="$5"
      shadowColor="rgba(0, 0, 0, 0.08)"
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 2 }}
    >
      <YStack space="$5">
        {/* Business Header */}
        <YStack space="$3">
          <XStack alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap="$3">
            <YStack flex={1} space="$2">
              <XStack alignItems="center" space="$2">
                <Building2 size={24} color="#3b82f6" strokeWidth={2} />
                <Text fontSize="$6" fontWeight="800" color="$color">
                  {location?.title || 'Unknown Business'}
                </Text>
              </XStack>
              {location?.primary_category_name && (
                <XStack alignItems="center" space="$2">
                  <Tag size={14} color="#8b5cf6" strokeWidth={2} />
                  <Text fontSize="$3" color="#8b5cf6" fontWeight="600">
                    {location.primary_category_name}
                  </Text>
                </XStack>
              )}
            </YStack>

            {/* Verification Badge */}
            {location?.verification_state === 'VERIFIED' && (
              <XStack
                backgroundColor="rgba(16, 185, 129, 0.1)"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$3"
                borderWidth={1}
                borderColor="rgba(16, 185, 129, 0.3)"
                alignItems="center"
                space="$2"
              >
                <ShieldCheck size={16} color="#10b981" strokeWidth={2} />
                <Text fontSize="$3" color="#10b981" fontWeight="700">
                  Verified
                </Text>
              </XStack>
            )}
          </XStack>

          {/* Contact Info */}
          <YStack space="$2">
            {hasAddress && formattedAddress && (
              <XStack alignItems="center" space="$2">
                <MapPin size={14} color="#6b7280" strokeWidth={2} />
                <Text fontSize="$3" color="$color" opacity={0.7}>
                  {formattedAddress}
                </Text>
              </XStack>
            )}
            {location?.primary_phone && (
              <XStack alignItems="center" space="$2">
                <Phone size={14} color="#6b7280" strokeWidth={2} />
                <Text fontSize="$3" color="$color" opacity={0.7}>
                  {location.primary_phone}
                </Text>
              </XStack>
            )}
            {location?.website_uri && (
              <XStack alignItems="center" space="$2">
                <Globe size={14} color="#6b7280" strokeWidth={2} />
                <Text
                  fontSize="$3"
                  color="#3b82f6"
                  opacity={0.9}
                  cursor="pointer"
                  onPress={() => window.open(location.website_uri!, '_blank')}
                >
                  {location.website_uri.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>

        <Separator borderColor="rgba(59, 130, 246, 0.15)" />

        {/* Stats Row */}
        <XStack space="$2" flexWrap="wrap">
          <StatCard
            icon={Star}
            label="Reviews"
            value={reviews.length}
            sublabel={avgRating > 0 ? `${avgRating.toFixed(1)} avg` : undefined}
            color="#f59e0b"
          />
          <StatCard
            icon={TrendingUp}
            label="Impressions"
            value={(latestAnalytics?.total_impressions ?? 0).toLocaleString()}
            sublabel={`${keywords.length} keywords`}
            color="#3b82f6"
          />
          <StatCard
            icon={FileText}
            label="Posts"
            value={posts.length}
            color="#8b5cf6"
          />
          <StatCard
            icon={ImageIcon}
            label="Media"
            value={media.length}
            color="#10b981"
          />
        </XStack>

        <Separator borderColor="rgba(59, 130, 246, 0.15)" />

        {/* Reviews Section - COLLAPSIBLE */}
        <CollapsibleSection
          icon={Star}
          title="Reviews"
          count={reviews.length}
          color="#f59e0b"
          isExpanded={isSectionExpanded('reviews')}
          onToggle={() => toggleSection('reviews')}
          emptyComponent={
            <NoDataSection
              icon={MessageSquare}
              title="No Reviews Yet"
              description="Reviews will appear here once customers leave feedback"
              color="#f59e0b"
            />
          }
        >
          <YStack space="$3">
            {reviews.slice(0, 5).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {reviews.length > 5 && (
              <Text fontSize="$3" color="#3b82f6" fontWeight="600" textAlign="center">
                + {reviews.length - 5} more reviews
              </Text>
            )}
          </YStack>
        </CollapsibleSection>

        {/* Analytics Section - COLLAPSIBLE */}
        <CollapsibleSection
          icon={Search}
          title="Search Keywords"
          count={keywords.length}
          color="#3b82f6"
          isExpanded={isSectionExpanded('keywords')}
          onToggle={() => toggleSection('keywords')}
          emptyComponent={
            <NoDataSection
              icon={BarChart3}
              title="No Analytics Data"
              description="Search keyword data will appear after Google indexes your business"
              color="#3b82f6"
            />
          }
        >
          <YStack space="$2">
            {keywords.slice(0, 10).map((kw: { keyword: string; impressions: number }, index: number) => (
              <KeywordCard
                key={kw.keyword || index}
                keyword={kw.keyword}
                impressions={kw.impressions}
                rank={index + 1}
              />
            ))}
            {keywords.length > 10 && (
              <Text fontSize="$3" color="#3b82f6" fontWeight="600" textAlign="center">
                + {keywords.length - 10} more keywords
              </Text>
            )}
          </YStack>
        </CollapsibleSection>

        {/* Posts Section - COLLAPSIBLE */}
        <CollapsibleSection
          icon={Megaphone}
          title="Posts"
          count={posts.length}
          color="#8b5cf6"
          isExpanded={isSectionExpanded('posts')}
          onToggle={() => toggleSection('posts')}
          emptyComponent={
            <NoDataSection
              icon={FileText}
              title="No Posts Yet"
              description="Create Google Business posts to engage with customers"
              color="#8b5cf6"
            />
          }
        >
          <YStack space="$3">
            {posts.slice(0, 5).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {posts.length > 5 && (
              <Text fontSize="$3" color="#8b5cf6" fontWeight="600" textAlign="center">
                + {posts.length - 5} more posts
              </Text>
            )}
          </YStack>
        </CollapsibleSection>

        {/* Media Section - COLLAPSIBLE */}
        <CollapsibleSection
          icon={Camera}
          title="Media Gallery"
          count={media.length}
          color="#10b981"
          isExpanded={isSectionExpanded('media')}
          onToggle={() => toggleSection('media')}
          emptyComponent={
            <NoDataSection
              icon={ImageIcon}
              title="No Media Uploaded"
              description="Add photos and videos to showcase your business"
              color="#10b981"
            />
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack space="$3" paddingVertical="$2">
              {media.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </XStack>
          </ScrollView>
        </CollapsibleSection>

        {/* Action Buttons */}
        {location?.metadata?.mapsUri && (
          <>
            <Separator borderColor="rgba(59, 130, 246, 0.15)" />
            <XStack space="$3" flexWrap="wrap">
              <Button
                size="$3"
                backgroundColor="$zingBlue"
                borderRadius="$3"
                onPress={() => window.open(location.metadata.mapsUri, '_blank')}
              >
                <XStack space="$2" alignItems="center">
                  <MapPin size={16} color="white" strokeWidth={2} />
                  <Text color="white" fontWeight="700" fontSize="$3">
                    View on Maps
                  </Text>
                </XStack>
              </Button>
              {location.metadata?.newReviewUri && (
                <Button
                  size="$3"
                  variant="outlined"
                  borderColor="rgba(245, 158, 11, 0.4)"
                  borderRadius="$3"
                  onPress={() => window.open(location.metadata.newReviewUri, '_blank')}
                >
                  <XStack space="$2" alignItems="center">
                    <Star size={16} color="#f59e0b" strokeWidth={2} />
                    <Text color="#f59e0b" fontWeight="600" fontSize="$3">
                      Get Review Link
                    </Text>
                  </XStack>
                </Button>
              )}
            </XStack>
          </>
        )}
      </YStack>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SyncedGBPData({ locationId }: SyncedGBPDataProps) {
  const {
    reviews,
    analytics,
    posts,
    media,
    locations,
    stats,
    loading,
    error,
    refetch,
  } = useSupabaseGBP(locationId);

  // Group all data by location_id for business-by-business display
  const businessDataMap = useMemo(() => {
    const map = new Map<string, BusinessData>();

    // First, add all locations
    locations.forEach((loc) => {
      map.set(loc.location_id, {
        location: loc,
        reviews: [],
        analytics: [],
        posts: [],
        media: [],
      });
    });

    // Group reviews by location
    reviews.forEach((review) => {
      const locId = review.location_id;
      if (!map.has(locId)) {
        map.set(locId, { location: null, reviews: [], analytics: [], posts: [], media: [] });
      }
      map.get(locId)!.reviews.push(review);
    });

    // Group analytics by location
    analytics.forEach((item) => {
      const locId = item.location_id;
      if (!map.has(locId)) {
        map.set(locId, { location: null, reviews: [], analytics: [], posts: [], media: [] });
      }
      map.get(locId)!.analytics.push(item);
    });

    // Group posts by location
    posts.forEach((post) => {
      const locId = post.location_id;
      if (!map.has(locId)) {
        map.set(locId, { location: null, reviews: [], analytics: [], posts: [], media: [] });
      }
      map.get(locId)!.posts.push(post);
    });

    // Group media by location
    media.forEach((item) => {
      const locId = item.location_id;
      if (!map.has(locId)) {
        map.set(locId, { location: null, reviews: [], analytics: [], posts: [], media: [] });
      }
      map.get(locId)!.media.push(item);
    });

    return map;
  }, [locations, reviews, analytics, posts, media]);

  // Convert to array for rendering
  const businesses = Array.from(businessDataMap.entries());

  // Loading state
  if (loading) {
    return (
      <Card
        backgroundColor="$background"
        borderRadius="$6"
        borderWidth={2}
        borderColor="rgba(59, 130, 246, 0.15)"
        padding="$10"
        shadowColor="rgba(59, 130, 246, 0.1)"
        shadowRadius={20}
        shadowOffset={{ width: 0, height: 8 }}
      >
        <YStack alignItems="center" space="$5">
          <YStack
            width={80}
            height={80}
            borderRadius="$6"
            backgroundColor="rgba(59, 130, 246, 0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(59, 130, 246, 0.2)"
          >
            <Spinner size="large" color="#3b82f6" />
          </YStack>
          <YStack space="$2" alignItems="center">
            <Text fontSize="$5" fontWeight="700" color="$color">
              Loading Your Businesses
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              Fetching synced GBP data from Supabase...
            </Text>
          </YStack>
          <XStack space="$2" opacity={0.5}>
            <YStack width={8} height={8} borderRadius={4} backgroundColor="#3b82f6" animation="bouncy" />
            <YStack width={8} height={8} borderRadius={4} backgroundColor="#3b82f6" animation="bouncy" style={{ animationDelay: '0.1s' }} />
            <YStack width={8} height={8} borderRadius={4} backgroundColor="#3b82f6" animation="bouncy" style={{ animationDelay: '0.2s' }} />
          </XStack>
        </YStack>
      </Card>
    );
  }

  // Error state - detect if it's an auth error
  if (error) {
    const isAuthError = error.toLowerCase().includes('log in') || error.toLowerCase().includes('login');

    return (
      <Card
        backgroundColor={isAuthError ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)'}
        borderRadius="$6"
        borderWidth={2}
        borderColor={isAuthError ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
        padding="$8"
        shadowColor={isAuthError ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
        shadowRadius={16}
        shadowOffset={{ width: 0, height: 6 }}
      >
        <YStack space="$4" alignItems="center">
          <YStack
            width={72}
            height={72}
            borderRadius="$5"
            backgroundColor={isAuthError ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor={isAuthError ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
          >
            {isAuthError ? (
              <LogIn size={36} color="#f59e0b" strokeWidth={1.5} />
            ) : (
              <AlertCircle size={36} color="#ef4444" strokeWidth={1.5} />
            )}
          </YStack>
          <YStack space="$2" alignItems="center">
            <Text fontSize="$6" fontWeight="800" color={isAuthError ? '#f59e0b' : '#ef4444'}>
              {isAuthError ? 'Authentication Required' : 'Failed to Load Data'}
            </Text>
            <Text fontSize="$4" color="$color" opacity={0.7} textAlign="center" maxWidth={400}>
              {error}
            </Text>
          </YStack>
          <XStack space="$3" marginTop="$2">
            {isAuthError ? (
              <Link href="/login">
                <Button
                  backgroundColor="#f59e0b"
                  borderRadius="$4"
                  size="$4"
                  pressStyle={{ backgroundColor: '#d97706' }}
                >
                  <XStack space="$2" alignItems="center">
                    <LogIn size={18} color="white" strokeWidth={2} />
                    <Text color="white" fontWeight="700" fontSize="$4">Go to Login</Text>
                  </XStack>
                </Button>
              </Link>
            ) : (
              <Button
                backgroundColor="#ef4444"
                borderRadius="$4"
                onPress={refetch}
                size="$4"
                pressStyle={{ backgroundColor: '#dc2626' }}
              >
                <XStack space="$2" alignItems="center">
                  <RefreshCw size={18} color="white" strokeWidth={2} />
                  <Text color="white" fontWeight="700" fontSize="$4">Try Again</Text>
                </XStack>
              </Button>
            )}
          </XStack>
        </YStack>
      </Card>
    );
  }

  // No businesses at all
  if (businesses.length === 0) {
    return (
      <Card
        backgroundColor="$background"
        borderRadius="$6"
        borderWidth={2}
        borderColor="rgba(245, 158, 11, 0.2)"
        padding="$10"
        shadowColor="rgba(245, 158, 11, 0.1)"
        shadowRadius={20}
        shadowOffset={{ width: 0, height: 8 }}
      >
        <YStack space="$5" alignItems="center">
          <YStack
            width={88}
            height={88}
            borderRadius="$6"
            backgroundColor="rgba(245, 158, 11, 0.1)"
            justifyContent="center"
            alignItems="center"
            borderWidth={2}
            borderColor="rgba(245, 158, 11, 0.3)"
          >
            <Inbox size={44} color="#f59e0b" strokeWidth={1.5} />
          </YStack>
          <YStack space="$2" alignItems="center">
            <Text fontSize="$7" fontWeight="800" color="$color" textAlign="center">
              No Businesses Synced Yet
            </Text>
            <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center" maxWidth={450}>
              Connect a Google Business Profile account to start syncing data.
              Once connected, your business data will appear here automatically.
            </Text>
          </YStack>

          {/* Sync Schedule Info */}
          <Card
            backgroundColor="rgba(59, 130, 246, 0.05)"
            borderRadius="$4"
            borderWidth={1}
            borderColor="rgba(59, 130, 246, 0.15)"
            padding="$4"
            marginTop="$2"
            width="100%"
            maxWidth={400}
          >
            <YStack space="$3">
              <XStack alignItems="center" space="$2" justifyContent="center">
                <Clock size={16} color="#3b82f6" strokeWidth={2} />
                <Text fontSize="$3" color="#3b82f6" fontWeight="700">
                  Automatic Sync Schedule
                </Text>
              </XStack>
              <XStack justifyContent="space-around" flexWrap="wrap" gap="$2">
                <YStack alignItems="center" space="$1">
                  <Text fontSize="$2" color="$color" opacity={0.5}>Reviews</Text>
                  <Text fontSize="$3" color="#3b82f6" fontWeight="700">Daily</Text>
                </YStack>
                <YStack alignItems="center" space="$1">
                  <Text fontSize="$2" color="$color" opacity={0.5}>Analytics</Text>
                  <Text fontSize="$3" color="#8b5cf6" fontWeight="700">Weekly</Text>
                </YStack>
                <YStack alignItems="center" space="$1">
                  <Text fontSize="$2" color="$color" opacity={0.5}>Posts/Media</Text>
                  <Text fontSize="$3" color="#10b981" fontWeight="700">Weekly</Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </Card>
    );
  }

  return (
    <YStack space="$5">
      {/* Enhanced Header */}
      <Card
        backgroundColor="$background"
        borderRadius="$5"
        borderWidth={1}
        borderColor="rgba(59, 130, 246, 0.1)"
        padding="$4"
        shadowColor="rgba(0, 0, 0, 0.03)"
        shadowRadius={8}
        shadowOffset={{ width: 0, height: 2 }}
      >
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$3">
          <XStack alignItems="center" space="$3">
            <YStack
              width={48}
              height={48}
              borderRadius="$4"
              backgroundColor="rgba(59, 130, 246, 0.1)"
              justifyContent="center"
              alignItems="center"
              borderWidth={1}
              borderColor="rgba(59, 130, 246, 0.2)"
            >
              <Building2 size={24} color="#3b82f6" strokeWidth={2} />
            </YStack>
            <YStack>
              <XStack alignItems="center" space="$2">
                <Text fontSize="$5" fontWeight="800" color="$color">
                  Synced Businesses
                </Text>
                <XStack
                  backgroundColor="rgba(59, 130, 246, 0.15)"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$3" fontWeight="800" color="#3b82f6">
                    {businesses.length}
                  </Text>
                </XStack>
              </XStack>
              {stats?.lastSyncDate && (
                <XStack space="$2" alignItems="center">
                  <Clock size={12} color="#6b7280" strokeWidth={2} />
                  <Text fontSize="$2" color="$color" opacity={0.5}>
                    Last synced: {formatDate(stats.lastSyncDate)}
                  </Text>
                </XStack>
              )}
            </YStack>
          </XStack>
          <Button
            size="$3"
            backgroundColor="rgba(59, 130, 246, 0.1)"
            borderRadius="$3"
            borderWidth={1}
            borderColor="rgba(59, 130, 246, 0.2)"
            onPress={refetch}
            hoverStyle={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
            pressStyle={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
          >
            <XStack space="$2" alignItems="center">
              <RefreshCw size={16} color="#3b82f6" strokeWidth={2} />
              <Text color="#3b82f6" fontWeight="700">Refresh</Text>
            </XStack>
          </Button>
        </XStack>
      </Card>

      {/* Business Cards */}
      <YStack space="$5">
        {businesses.map(([locationId, data]) => (
          <BusinessSection key={locationId} businessId={locationId} data={data} />
        ))}
      </YStack>
    </YStack>
  );
}
