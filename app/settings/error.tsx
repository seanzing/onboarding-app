/**
 * Settings Page Error Boundary
 *
 * Catches errors in the settings route and displays recovery UI.
 */

'use client';

import { Settings } from 'lucide-react';
import { RouteError } from '@/app/components/errors/RouteError';

export default function SettingsError({
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
      title="Settings Error"
      icon={<Settings size={36} color="#6366F1" />}
      color="#6366F1"
    />
  );
}
