import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

/**
 * SWR hook to fetch chatbot config/status from the chatbot backend.
 */
export function useChatbotStatus(contactId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    contactId ? `/api/onboarding/${contactId}/chatbot/status` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    chatbot: data?.success ? data.data : null,
    loading: isLoading,
    error: error || (data && !data.success ? data.error : null),
    refetch: mutate,
  }
}
