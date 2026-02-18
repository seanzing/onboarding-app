/**
 * GBP Dashboard Error Boundary
 *
 * Catches errors in the GBP dashboard route and displays recovery UI.
 */

'use client';

import { MapPin } from 'lucide-react';
import { RouteError } from '@/app/components/errors/RouteError';

export default function GBPError({
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
      title="GBP Dashboard Error"
      icon={<MapPin size={36} color="#3B82F6" />}
      color="#3B82F6"
    />
  );
}
