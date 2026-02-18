/**
 * Companies Page Error Boundary
 *
 * Catches errors in the companies route and displays recovery UI.
 */

'use client';

import { Building2 } from 'lucide-react';
import { RouteError } from '@/app/components/errors/RouteError';

export default function CompaniesError({
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
      title="Companies Error"
      icon={<Building2 size={36} color="#10B981" />}
      color="#10B981"
    />
  );
}
