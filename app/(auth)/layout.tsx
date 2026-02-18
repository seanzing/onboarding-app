/**
 * Auth Layout
 *
 * Standalone layout for authentication pages (login, forgot-password)
 * Excludes the AppShell (sidebar + topbar) for full-page auth experience
 */

import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
