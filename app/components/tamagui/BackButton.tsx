// @ts-nocheck
/**
 * Standardized Back Button Component
 *
 * Consistent styling and behavior for all "Back" navigation buttons
 * across the application.
 */

'use client'

import { Button } from 'tamagui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export interface BackButtonProps {
  href: string
  onClick?: () => void
}

export function BackButton({ href, onClick }: BackButtonProps) {
  const buttonContent = (
    <Button
      size="$3"
      backgroundColor="rgba(168, 85, 247, 0.1)"
      borderWidth={1}
      borderColor="rgba(168, 85, 247, 0.3)"
      color="$zingPurple"
      fontWeight="600"
      paddingHorizontal="$4"
      paddingVertical="$2.5"
      borderRadius="$3"
      alignSelf="flex-start"
      icon={<ArrowLeft size={16} color="#A855F7" strokeWidth={2.5} />}
      hoverStyle={{
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        borderColor: 'rgba(168, 85, 247, 0.5)',
        scale: 1.02,
      }}
      pressStyle={{
        scale: 0.98,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
      }}
      animation="quick"
      cursor="pointer"
      onPress={onClick}
    >
      Back
    </Button>
  )

  if (onClick) {
    // If onClick is provided, just return the button (no Link wrapper)
    return buttonContent
  }

  // Otherwise wrap in Link for navigation
  return (
    <Link href={href} passHref style={{ alignSelf: 'flex-start' }}>
      {buttonContent}
    </Link>
  )
}
