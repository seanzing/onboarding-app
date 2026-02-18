import useSWR from 'swr'
import type { CustomerOnboarding } from '@/app/types/onboarding'

const fetcher = (url: string) => fetch(url).then(res => res.json())

/**
 * SWR hook to fetch full onboarding status for a contact.
 * Returns identity + all 4 service statuses.
 */
export function useOnboardingStatus(contactId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    contactId ? `/api/onboarding/${contactId}/status` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    onboarding: data?.success ? (data.data as CustomerOnboarding) : null,
    loading: isLoading,
    error: error || (data && !data.success ? data.error : null),
    refetch: mutate,
  }
}
