/**
 * Onboarding System Types
 *
 * Types for the unified onboarding dashboard that manages
 * 4 services: Foursquare, Chatbot, Blogs, and Landing Pages.
 */

export type ServiceType = 'chatbot' | 'blogs' | 'landing_pages' | 'foursquare'

export type ServiceStatus = 'not_started' | 'pending' | 'active' | 'error' | 'paused'

export interface ServiceIdentity {
  hubspot_contact_id: string
  duda_site_code: string | null
  chatbot_slug: string | null
  foursquare_venue_id: string | null
}

export interface OnboardingServiceStatus {
  service: ServiceType
  status: ServiceStatus
  metadata: Record<string, unknown>
  provisioned_at: string | null
  last_triggered_at: string | null
  notes: string | null
}

export interface CustomerOnboarding {
  identity: ServiceIdentity
  services: Partial<Record<ServiceType, OnboardingServiceStatus>>
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  chatbot: 'AI Chatbot',
  blogs: 'SEO Blogs',
  landing_pages: 'Landing Pages',
  foursquare: 'Foursquare',
}

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  not_started: 'Not Started',
  pending: 'Pending',
  active: 'Active',
  error: 'Error',
  paused: 'Paused',
}

export const SERVICE_COLORS: Record<ServiceType, string> = {
  foursquare: 'rgba(168,85,247,1)',
  chatbot: 'rgba(0,174,255,1)',
  blogs: 'rgba(233,86,20,1)',
  landing_pages: 'rgba(16,185,129,1)',
}

export const STATUS_COLORS: Record<ServiceStatus, string> = {
  not_started: '#6B7280',
  pending: '#F59E0B',
  active: '#10B981',
  error: '#EF4444',
  paused: '#8B5CF6',
}
