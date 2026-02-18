// @ts-nocheck
/**
 * Mobile Navigation Drawer
 *
 * Slide-in navigation menu for mobile/tablet screens
 * Uses Tamagui Sheet component
 */

'use client';

import { useState } from 'react';
import { Sheet, YStack, XStack, Text, Button, Separator } from 'tamagui';
import { Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface MobileNavProps {
  children: ReactNode;
  logo?: ReactNode;
  trigger?: ReactNode;
}

export function MobileNav({ children, logo, trigger }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger Button (Hamburger) */}
      {trigger || (
        <Button
          size="$4"
          backgroundColor="transparent"
          borderWidth={1}
          borderColor="rgba(168, 85, 247, 0.3)"
          color="$color"
          onPress={() => setOpen(true)}
          hoverStyle={{
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            borderColor: '#A855F7',
          }}
          pressStyle={{
            scale: 0.95,
          }}
          animation="quick"
          icon={<Menu size={20} />}
          circular
          padding="$3"
        />
      )}

      {/* Mobile Drawer */}
      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[85]}
        dismissOnSnapToBottom
        zIndex={100000}
        animation="quick"
      >
        <Sheet.Overlay
          animation="quick"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0, 0, 0, 0.5)"
        />

        <Sheet.Frame
          padding="$4"
          backgroundColor="#050536"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6"
        >
          <Sheet.Handle backgroundColor="rgba(168, 85, 247, 0.5)" />

          <YStack space="$4" paddingTop="$4" height="100%">
            {/* Header with Logo and Close Button */}
            <XStack justifyContent="space-between" alignItems="center" paddingBottom="$2">
              {logo && <YStack>{logo}</YStack>}
              <Button
                size="$3"
                backgroundColor="transparent"
                borderWidth={1}
                borderColor="rgba(168, 85, 247, 0.3)"
                color="$color"
                onPress={() => setOpen(false)}
                hoverStyle={{
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                }}
                pressStyle={{
                  scale: 0.95,
                }}
                icon={<X size={18} />}
                circular
              />
            </XStack>

            <Separator borderColor="rgba(168, 85, 247, 0.3)" />

            {/* Navigation Items */}
            <YStack space="$2" flex={1} paddingTop="$2">
              {children}
            </YStack>

            {/* Footer */}
            <Separator borderColor="rgba(168, 85, 247, 0.3)" />
            <Text fontSize="$1" color="$color" opacity={0.5} textAlign="center">
              Zing Local Directory Sync
            </Text>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
