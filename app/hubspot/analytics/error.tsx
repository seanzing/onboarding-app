/**
 * HubSpot Analytics Error Boundary
 *
 * Catches errors in the HubSpot analytics route and displays recovery UI.
 */

'use client';

import { TrendingUp } from 'lucide-react';
import { RouteError } from '@/app/components/errors/RouteError';

export default function HubSpotAnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Analytics Error"
      icon={<TrendingUp size={36} color="#FF7A59" />}
      color="#FF7A59"
    />
  );
}
