'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * ClientOnly component - Only renders children on client side
 *
 * This prevents hydration mismatches for components that inject
 * styles or content dynamically on the client (like Tamagui).
 */
export default function ClientOnly({ children }: { children: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return null
  }

  return <>{children}</>
}
