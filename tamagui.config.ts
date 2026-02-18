// @ts-nocheck
import { config as configBase } from '@tamagui/config/v3'
import { createTamagui, createTokens } from 'tamagui'
import { createAnimations } from '@tamagui/animations-css'

// Custom tokens for Zing Directory App
const tokens = createTokens({
  ...configBase.tokens,
  color: {
    ...configBase.tokens.color,
    // ZING.work Brand Colors (EXACT from website - extracted via Playwright)
    zingNavy: '#050536',           // Deep navy heading (rgb(5, 5, 54))
    zingNavyLight: '#0a0e27',      // Slightly lighter navy
    zingBlue: '#5B7EFE',           // Hero bright blue
    zingBlueDark: '#4A6EEE',       // Darker blue for hover
    zingBlueLight: '#6C8FFF',      // Lighter blue
    zingCyan: '#00AEFF',           // Cyan accent (phone, links) - rgb(0, 174, 255)
    zingCyanLight: '#33C0FF',      // Light cyan
    zingCyanDark: '#0098E6',       // Dark cyan
    zingOrange: '#E95614',         // Orange CTA - rgb(233, 86, 20)
    zingOrangeLight: '#FF6B2B',    // Light orange
    zingOrangeDark: '#D64500',     // Dark orange

    // Purple accent (primary brand color from screenshots)
    zingPurple: '#A855F7',         // Main purple accent
    zingPurpleLight: '#C084FC',    // Light purple for hover
    zingPurpleDark: '#9333EA',     // Dark purple for press

    // Status colors
    syncedGreen: '#10B981',
    syncedGreenLight: '#34D399',
    syncedGreenDark: '#059669',
    pendingOrange: '#F59E0B',
    pendingOrangeLight: '#FBBF24',
    pendingOrangeDark: '#D97706',
    errorRed: '#EF4444',
    errorRedLight: '#F87171',
    errorRedDark: '#DC2626',

    // Neutral grays (Tailwind-style)
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Numbered grays (Tamagui standard - required for internal components)
    // Maps to Tailwind grays for consistency
    gray1: '#FCFCFC',
    gray2: '#F9FAFB',  // gray50
    gray3: '#F3F4F6',  // gray100
    gray4: '#E5E7EB',  // gray200
    gray5: '#D1D5DB',  // gray300
    gray6: '#9CA3AF',  // gray400
    gray7: '#6B7280',  // gray500
    gray8: '#4B5563',  // gray600
    gray9: '#374151',  // gray700
    gray10: '#1F2937', // gray800
    gray11: '#111827', // gray900
    gray12: '#030712',

    // ZING theme colors (navy + dark sections)
    navyDeep: '#050536',           // Deep navy background (EXACT from zing.work)
    navyDark: '#0a0e27',           // Slightly lighter navy
    navyCard: '#161b2e',           // Card backgrounds
    navyBorder: '#1f2533',         // Borders
    navyHover: '#1a2030',          // Hover states
    darkSection: '#272A2F',        // Dark sections from zing.work
  },

  radius: {
    ...configBase.tokens.radius,
    card: 16,
    button: 12,
    badge: 24,
    large: 20,
  },
})

// Custom themes
const themes = {
  light: {
    background: tokens.color.white,
    backgroundHover: tokens.color.gray50,
    backgroundPress: tokens.color.gray100,
    backgroundFocus: tokens.color.gray50,
    backgroundStrong: tokens.color.gray100,
    backgroundTransparent: 'rgba(255, 255, 255, 0.8)',

    color: tokens.color.gray900,
    colorHover: tokens.color.gray800,
    colorPress: tokens.color.gray900,
    colorFocus: tokens.color.gray900,
    colorTransparent: 'rgba(0, 0, 0, 0.5)',

    borderColor: tokens.color.gray200,
    borderColorHover: tokens.color.gray300,
    borderColorFocus: tokens.color.zingBlue,
    borderColorPress: tokens.color.gray400,

    outlineColor: tokens.color.gray300,
    outlineColorHover: tokens.color.gray400,
    outlineColorFocus: tokens.color.zingBlue,
    outlineColorPress: tokens.color.gray500,

    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowColorHover: 'rgba(0, 0, 0, 0.1)',
    shadowColorPress: 'rgba(0, 0, 0, 0.15)',
    shadowColorFocus: 'rgba(59, 130, 246, 0.3)',
  },

  dark: {
    background: tokens.color.navyDeep,
    backgroundHover: tokens.color.navyHover,
    backgroundPress: tokens.color.navyCard,
    backgroundFocus: tokens.color.navyHover,
    backgroundStrong: tokens.color.navyCard,
    backgroundTransparent: 'rgba(10, 14, 39, 0.95)',

    color: tokens.color.gray50,
    colorHover: tokens.color.white,
    colorPress: tokens.color.gray50,
    colorFocus: tokens.color.white,
    colorTransparent: 'rgba(255, 255, 255, 0.5)',

    borderColor: tokens.color.navyBorder,
    borderColorHover: tokens.color.zingCyan,
    borderColorFocus: tokens.color.zingBlue,
    borderColorPress: tokens.color.zingBlueDark,

    outlineColor: tokens.color.navyBorder,
    outlineColorHover: tokens.color.zingCyan,
    outlineColorFocus: tokens.color.zingBlue,
    outlineColorPress: tokens.color.zingBlueDark,

    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowColorHover: 'rgba(0, 174, 255, 0.15)',
    shadowColorPress: 'rgba(91, 126, 254, 0.2)',
    shadowColorFocus: 'rgba(91, 126, 254, 0.3)',
  },

  // Status-specific themes
  success: {
    background: tokens.color.syncedGreen,
    backgroundHover: tokens.color.syncedGreenDark,
    backgroundPress: tokens.color.syncedGreenDark,
    backgroundFocus: tokens.color.syncedGreenLight,
    backgroundStrong: tokens.color.syncedGreenDark,
    backgroundTransparent: 'rgba(16, 185, 129, 0.8)',
    color: tokens.color.white,
    colorHover: tokens.color.white,
    colorPress: tokens.color.white,
    colorFocus: tokens.color.white,
    colorTransparent: 'rgba(255, 255, 255, 0.8)',
    borderColor: tokens.color.syncedGreenDark,
    borderColorHover: tokens.color.syncedGreenDark,
    borderColorPress: tokens.color.syncedGreenDark,
    borderColorFocus: tokens.color.syncedGreenLight,
    outlineColor: tokens.color.syncedGreenDark,
    outlineColorHover: tokens.color.syncedGreenDark,
    outlineColorPress: tokens.color.syncedGreenDark,
    outlineColorFocus: tokens.color.syncedGreenLight,
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowColorHover: 'rgba(16, 185, 129, 0.5)',
    shadowColorPress: 'rgba(16, 185, 129, 0.7)',
    shadowColorFocus: 'rgba(16, 185, 129, 0.4)',
  },

  warning: {
    background: tokens.color.pendingOrange,
    backgroundHover: tokens.color.pendingOrangeDark,
    backgroundPress: tokens.color.pendingOrangeDark,
    backgroundFocus: tokens.color.pendingOrangeLight,
    backgroundStrong: tokens.color.pendingOrangeDark,
    backgroundTransparent: 'rgba(245, 158, 11, 0.8)',
    color: tokens.color.white,
    colorHover: tokens.color.white,
    colorPress: tokens.color.white,
    colorFocus: tokens.color.white,
    colorTransparent: 'rgba(255, 255, 255, 0.8)',
    borderColor: tokens.color.pendingOrangeDark,
    borderColorHover: tokens.color.pendingOrangeDark,
    borderColorPress: tokens.color.pendingOrangeDark,
    borderColorFocus: tokens.color.pendingOrangeLight,
    outlineColor: tokens.color.pendingOrangeDark,
    outlineColorHover: tokens.color.pendingOrangeDark,
    outlineColorPress: tokens.color.pendingOrangeDark,
    outlineColorFocus: tokens.color.pendingOrangeLight,
    shadowColor: 'rgba(245, 158, 11, 0.3)',
    shadowColorHover: 'rgba(245, 158, 11, 0.5)',
    shadowColorPress: 'rgba(245, 158, 11, 0.7)',
    shadowColorFocus: 'rgba(245, 158, 11, 0.4)',
  },

  error: {
    background: tokens.color.errorRed,
    backgroundHover: tokens.color.errorRedDark,
    backgroundPress: tokens.color.errorRedDark,
    backgroundFocus: tokens.color.errorRedLight,
    backgroundStrong: tokens.color.errorRedDark,
    backgroundTransparent: 'rgba(239, 68, 68, 0.8)',
    color: tokens.color.white,
    colorHover: tokens.color.white,
    colorPress: tokens.color.white,
    colorFocus: tokens.color.white,
    colorTransparent: 'rgba(255, 255, 255, 0.8)',
    borderColor: tokens.color.errorRedDark,
    borderColorHover: tokens.color.errorRedDark,
    borderColorPress: tokens.color.errorRedDark,
    borderColorFocus: tokens.color.errorRedLight,
    outlineColor: tokens.color.errorRedDark,
    outlineColorHover: tokens.color.errorRedDark,
    outlineColorPress: tokens.color.errorRedDark,
    outlineColorFocus: tokens.color.errorRedLight,
    shadowColor: 'rgba(239, 68, 68, 0.3)',
    shadowColorHover: 'rgba(239, 68, 68, 0.5)',
    shadowColorPress: 'rgba(239, 68, 68, 0.7)',
    shadowColorFocus: 'rgba(239, 68, 68, 0.4)',
  },

  blue: {
    background: tokens.color.zingBlue,
    backgroundHover: tokens.color.zingBlueDark,
    backgroundPress: tokens.color.zingBlueDark,
    backgroundFocus: tokens.color.zingBlueLight,
    backgroundStrong: tokens.color.zingBlueDark,
    backgroundTransparent: 'rgba(91, 126, 254, 0.9)',
    color: tokens.color.white,
    colorHover: tokens.color.white,
    colorPress: tokens.color.white,
    colorFocus: tokens.color.white,
    colorTransparent: 'rgba(255, 255, 255, 0.8)',
    borderColor: tokens.color.zingBlueDark,
    borderColorHover: tokens.color.zingBlueDark,
    borderColorPress: tokens.color.zingBlueDark,
    borderColorFocus: tokens.color.zingBlueLight,
    outlineColor: tokens.color.zingBlueDark,
    outlineColorHover: tokens.color.zingBlueDark,
    outlineColorPress: tokens.color.zingBlueDark,
    outlineColorFocus: tokens.color.zingBlueLight,
    shadowColor: 'rgba(91, 126, 254, 0.3)',
    shadowColorHover: 'rgba(91, 126, 254, 0.5)',
    shadowColorPress: 'rgba(91, 126, 254, 0.7)',
    shadowColorFocus: 'rgba(91, 126, 254, 0.4)',
  },

  cyan: {
    background: tokens.color.zingCyan,
    backgroundHover: tokens.color.zingCyanDark,
    backgroundPress: tokens.color.zingCyanDark,
    backgroundFocus: tokens.color.zingCyanLight,
    backgroundStrong: tokens.color.zingCyanDark,
    backgroundTransparent: 'rgba(0, 174, 255, 0.9)',
    color: tokens.color.white,
    colorHover: tokens.color.white,
    colorPress: tokens.color.white,
    colorFocus: tokens.color.white,
    colorTransparent: 'rgba(255, 255, 255, 0.8)',
    borderColor: tokens.color.zingCyanDark,
    borderColorHover: tokens.color.zingCyanDark,
    borderColorPress: tokens.color.zingCyanDark,
    borderColorFocus: tokens.color.zingCyanLight,
    outlineColor: tokens.color.zingCyanDark,
    outlineColorHover: tokens.color.zingCyanDark,
    outlineColorPress: tokens.color.zingCyanDark,
    outlineColorFocus: tokens.color.zingCyanLight,
    shadowColor: 'rgba(0, 174, 255, 0.3)',
    shadowColorHover: 'rgba(0, 174, 255, 0.5)',
    shadowColorPress: 'rgba(0, 174, 255, 0.7)',
    shadowColorFocus: 'rgba(0, 174, 255, 0.4)',
  },
}

const config = createTamagui({
  ...configBase,
  tokens,
  themes,

  // Media queries for responsive design
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },

  // Animation configurations
  animations: createAnimations({
    bouncy: {
      type: 'spring',
      damping: 10,
      mass: 0.9,
      stiffness: 100,
    },
    lazy: {
      type: 'spring',
      damping: 20,
      stiffness: 60,
    },
    quick: {
      type: 'spring',
      damping: 20,
      mass: 1.2,
      stiffness: 250,
    },
    smooth: {
      type: 'timing',
      duration: 300,
    },
    fast: {
      type: 'timing',
      duration: 150,
    },
    slow: {
      type: 'timing',
      duration: 500,
    },
  }),

  settings: {
    allowedStyleValues: 'somewhat-strict',
    autocompleteSpecificTokens: 'except-special',
  },
})

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
