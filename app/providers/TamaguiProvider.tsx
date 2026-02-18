'use client'

import { ReactNode } from 'react'
import { TamaguiProvider as TamaguiProviderOG } from 'tamagui'
import config from '../../tamagui.config'

export function TamaguiProvider({ children }: { children: ReactNode }) {
  return (
    <TamaguiProviderOG config={config} defaultTheme="dark">
      {children}
    </TamaguiProviderOG>
  )
}
