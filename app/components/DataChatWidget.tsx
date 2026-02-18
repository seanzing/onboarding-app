// @ts-nocheck
'use client';

import { useState } from 'react';
import { YStack, XStack, Text, Button } from 'tamagui';
import { MessageCircle, X, Database, Minimize2 } from 'lucide-react';

/**
 * DataChatWidget - Floating chat widget for Supabase data queries
 *
 * This component renders a floating chat button at the bottom-right corner
 * of every page. When clicked, it expands into a chat panel that embeds
 * the Zing Supabase Chat application via an iframe.
 *
 * Features:
 * - Fixed position floating button (bottom-right)
 * - Expandable chat panel (420x600px)
 * - Smooth animations for open/close
 * - Uses the deployed Vercel frontend with ?embed=true&header=false mode
 * - Indigo theme (#6366F1) matching ZING Data Chat branding
 * - Custom header: "ZING Data Chat" with "AI-Powered Analytics" subtitle
 */
export default function DataChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  // Production URL for the embedded chat
  // header=false hides the EmbedView header since we provide our own
  const CHAT_EMBED_URL = 'https://zing-supabase-chat.vercel.app?embed=true&header=false';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
      }}
    >
      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 0,
            width: 420,
            height: 600,
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          <YStack
            backgroundColor="$background"
            borderRadius="$4"
            overflow="hidden"
            height="100%"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            {/* Widget Header - Matches original EmbedView styling */}
            <XStack
              backgroundColor="#6366F1"
              paddingHorizontal="$3"
              paddingVertical="$2.5"
              alignItems="center"
              justifyContent="space-between"
            >
              <XStack alignItems="center" space="$2">
                {/* Icon with rounded background pill */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Database size={16} color="white" strokeWidth={2} />
                </div>
                <YStack>
                  <Text color="white" fontWeight="600" fontSize={14} lineHeight={18}>
                    ZING Data Chat
                  </Text>
                  <Text color="rgba(255,255,255,0.7)" fontSize={10} lineHeight={12}>
                    AI-Powered Analytics
                  </Text>
                </YStack>
              </XStack>
              <XStack space="$1">
                <Button
                  size="$2"
                  circular
                  backgroundColor="transparent"
                  onPress={() => setIsOpen(false)}
                  hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  pressStyle={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <Minimize2 size={16} color="white" />
                </Button>
                <Button
                  size="$2"
                  circular
                  backgroundColor="transparent"
                  onPress={() => setIsOpen(false)}
                  hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  pressStyle={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <X size={16} color="white" />
                </Button>
              </XStack>
            </XStack>

            {/* Chat Content - Iframe */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <iframe
                src={CHAT_EMBED_URL}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title="Data Chat Assistant"
                allow="clipboard-write"
              />
            </div>
          </YStack>
        </div>
      )}

      {/* Floating Toggle Button - Indigo to match header */}
      <Button
        size="$6"
        circular
        backgroundColor="#6366F1"
        onPress={() => setIsOpen(!isOpen)}
        hoverStyle={{
          backgroundColor: '#5558E3',
          scale: 1.05,
        }}
        pressStyle={{
          backgroundColor: '#4F46E5',
          scale: 0.95,
        }}
        style={{
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)',
          width: 64,
          height: 64,
        }}
      >
        {isOpen ? (
          <X size={28} color="white" strokeWidth={2.5} />
        ) : (
          <MessageCircle size={28} color="white" strokeWidth={2.5} />
        )}
      </Button>

      {/* CSS Animation Keyframes */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
