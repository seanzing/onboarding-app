/**
 * AuthButton Component
 *
 * Styled button for authentication forms
 * Supports primary (purple theme) and secondary (bordered) variants
 * Universal - works on web and React Native
 * Updated with Zing.work design system
 */

// @ts-nocheck - Tamagui ButtonProps typing issues
'use client'

import { Button, Spinner, type ButtonProps } from 'tamagui'

export interface AuthButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function AuthButton({
  variant = 'primary',
  loading = false,
  children,
  disabled,
  ...props
}: AuthButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <Button
      theme={isPrimary ? "purple" : undefined}
      size="$5"
      width="100%"
      backgroundColor={isPrimary ? "$zingPurple" : "$background"}
      borderWidth={isPrimary ? 0 : 2}
      borderColor={isPrimary ? undefined : "$borderColor"}
      color={isPrimary ? "white" : "$color"}
      fontWeight="700"
      fontSize="$4"
      paddingVertical="$4"
      borderRadius="$button"
      animation="quick"
      disabled={disabled || loading}
      opacity={disabled || loading ? 0.6 : 1}
      pressStyle={{
        opacity: 0.8,
        scale: 0.98,
      }}
      hoverStyle={{
        opacity: 0.9,
        backgroundColor: isPrimary ? "$zingPurpleDark" : "$backgroundHover",
        borderColor: isPrimary ? undefined : "$borderColorHover",
      }}
      icon={loading ? <Spinner color={isPrimary ? "white" : "$color"} /> : undefined}
      {...props}
    >
      {children}
    </Button>
  )
}
