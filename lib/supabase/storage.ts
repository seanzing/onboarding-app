/**
 * Platform-Aware Storage Abstraction
 *
 * Universal storage that works on both Web and React Native
 * - Web: Uses localStorage
 * - React Native: Uses AsyncStorage (when installed)
 *
 * This enables the same Supabase client to work across platforms
 */

// Type definition for storage interface
interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null
  setItem: (key: string, value: string) => Promise<void> | void
  removeItem: (key: string) => Promise<void> | void
}

// Detect platform using environment checks
const isWebEnvironment = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

// Web storage implementation (localStorage)
const webStorage: StorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },
}

// Export platform-aware storage
// Currently optimized for web. React Native support can be added later.
export const storage: StorageAdapter = webStorage

// Helper for debugging platform
export const getPlatform = () => isWebEnvironment ? 'web' : 'native'
export const isWeb = isWebEnvironment
export const isNative = !isWebEnvironment

console.log('[Supabase Storage] Initialized for platform:', getPlatform())
