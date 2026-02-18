/**
 * AuthInput Component
 *
 * Styled input field for authentication forms with label and error states
 * Supports password show/hide toggle
 * Universal - works on web and React Native
 * Updated with Zing.work design system (purple focus states)
 */

// @ts-nocheck - Tamagui InputProps typing issues
'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Input, Button, type InputProps } from 'tamagui'
import { Eye, EyeOff } from 'lucide-react'

export interface AuthInputProps extends Omit<InputProps, 'size'> {
  label: string
  error?: string
  type?: 'text' | 'email' | 'password'
}

export function AuthInput({
  label,
  error,
  type = 'text',
  ...props
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && !showPassword ? 'password' : 'text'

  return (
    <YStack space="$2" width="100%">
      {/* Label */}
      <Text
        fontSize="$4"
        fontWeight="600"
        color="$color"
        opacity={0.9}
      >
        {label}
      </Text>

      {/* Input with optional password toggle - Enhanced */}
      <XStack width="100%" position="relative">
        <Input
          size="$4"
          backgroundColor="rgba(30, 40, 71, 0.5)"
          borderColor={error ? "$errorRed" : "rgba(170, 64, 255, 0.3)"}
          borderWidth={2}
          borderRadius="$4"
          paddingHorizontal="$4"
          paddingVertical="$3"
          paddingRight={isPassword ? "$10" : "$4"}
          fontSize="$4"
          color="$color"
          flex={1}
          animation="quick"
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor="$colorTransparent"
          shadowColor={error ? "rgba(239, 68, 68, 0.2)" : "rgba(170, 64, 255, 0.15)"}
          shadowRadius={4}
          shadowOffset={{ width: 0, height: 2 }}
          focusStyle={{
            borderColor: error ? "$errorRed" : "$zingPurple",
            backgroundColor: "rgba(30, 40, 71, 0.7)",
            borderWidth: 2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            outlineWidth: 0,
          }}
          hoverStyle={{
            borderColor: error ? "$errorRed" : "rgba(170, 64, 255, 0.5)",
            backgroundColor: "rgba(30, 40, 71, 0.6)",
          }}
          {...props}
          type={inputType as any}
        />

        {/* Show/Hide Password Toggle */}
        {isPassword && (
          <Button
            position="absolute"
            right="$2"
            top="50%"
            transform={[{ translateY: '-50%' }]}
            size="$3"
            chromeless
            circular
            padding="$2"
            onPress={() => setShowPassword(!showPassword)}
            hoverStyle={{
              backgroundColor: '$backgroundHover',
            }}
            pressStyle={{
              opacity: 0.7,
            }}
          >
            {showPassword ? (
              <EyeOff size={20} color="var(--color)" opacity={0.6} />
            ) : (
              <Eye size={20} color="var(--color)" opacity={0.6} />
            )}
          </Button>
        )}
      </XStack>

      {/* Error Message */}
      {error && (
        <Text
          fontSize="$2"
          color="$errorRed"
          opacity={0.9}
        >
          {error}
        </Text>
      )}
    </YStack>
  )
}
