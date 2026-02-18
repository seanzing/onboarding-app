// @ts-nocheck
'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { XStack, YStack, Text, Button } from 'tamagui';
import { Home, Building2, LogIn, Settings, Database, BarChart3 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { AppShell, Sidebar, NavItem } from './tamagui';
import { useAuth } from '@/app/hooks/useAuth';
import DataChatWidget from './DataChatWidget';

interface ClientLayoutProps {
  children: ReactNode;
}

/**
 * Simple Text-Based Zing Logo Component
 * Matches the official Zing Work branding: "zing!" in lowercase with exclamation
 * EXACT colors from zing.work: Orange #E95614 (rgb(233, 86, 20))
 * Professional, clickable, with refined typography and spacing
 */
function ZingLogoTamagui({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        paddingTop: 'var(--t-space-5)',
        paddingBottom: 'var(--t-space-5)',
        paddingLeft: 'var(--t-space-4)',
        paddingRight: 'var(--t-space-4)',
        cursor: 'pointer',
        borderRadius: 'var(--t-radius-3)',
      }}
    >
      <YStack space="$2.5">
        {/* Main Wordmark - WHITE COLOR */}
        <Text
          fontSize={30}
          fontWeight="700"
          color="white"
          lineHeight={30}
          letterSpacing={0}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          zing
        </Text>

        {/* Subtitle - improved readability */}
        <Text
          fontSize={13}
          fontWeight="600"
          color="$color"
          opacity={0.6}
          lineHeight={16}
          letterSpacing={1.5}
          textTransform="uppercase"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          DIRECTORY SYNC
        </Text>
      </YStack>
    </div>
  );
}

/**
 * ClientLayout - Client-side layout wrapper with navigation
 *
 * Features:
 * - AppShell with Sidebar and TopBar
 * - Navigation items for Dashboard and Companies
 * - Responsive (sidebar hidden on mobile)
 * - Active route highlighting
 */
export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  // Determine active route
  const isHome = pathname === '/';
  const isCompanies = pathname?.startsWith('/companies');
  const isCompanyDetail = pathname?.match(/^\/companies\/[^\/]+$/);
  const isHubSpotAnalytics = pathname?.startsWith('/hubspot/analytics');
  const isGBP = pathname?.startsWith('/gbp');
  const isSettings = pathname?.startsWith('/settings');
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/forgot-password');

  // Dynamic TopBar title (no subtitles)
  let topBarTitle = 'Dashboard';

  if (isCompanyDetail) {
    topBarTitle = 'Company Details';
  } else if (isHubSpotAnalytics) {
    topBarTitle = 'Customer Intelligence';
  } else if (isGBP) {
    topBarTitle = 'Google Profiles';
  } else if (isCompanies) {
    topBarTitle = 'Companies';
  } else if (isSettings) {
    topBarTitle = 'Settings';
  }

  // TopBar actions: Show Sign In button if not logged in
  const topBarActions = !loading && !user && !isAuthPage && (
    <Button
      size="$3"
      backgroundColor="$zingPurple"
      color="white"
      paddingHorizontal="$5"
      paddingVertical="$2"
      borderRadius="$3"
      fontWeight="600"
      fontSize="$3"
      onPress={() => router.push('/login')}
      hoverStyle={{
        opacity: 0.9,
        backgroundColor: '$zingPurple',
      }}
      pressStyle={{
        opacity: 0.8,
      }}
      icon={<LogIn size={16} color="white" />}
    >
      Sign In
    </Button>
  );

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('[ClientLayout] Sign out error:', error);
    }
  };

  // For auth pages, skip AppShell and render children directly
  // Note: DataChatWidget is NOT shown on auth pages (user not authenticated)
  if (isAuthPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  // Navigation items (shared between Sidebar and MobileNav)
  const navItems = (
    <>
      <NavItem
        icon={<Home size={20} color={isHome ? '#A855F7' : 'currentColor'} strokeWidth={2} />}
        label="Dashboard"
        active={isHome}
        onClick={() => router.push('/')}
      />
      <NavItem
        icon={<Database size={20} color={isCompanies ? '#A855F7' : 'currentColor'} strokeWidth={2} />}
        label="Companies"
        active={isCompanies}
        onClick={() => router.push('/companies')}
      />
      <NavItem
        icon={<BarChart3 size={20} color={isHubSpotAnalytics ? '#A855F7' : 'currentColor'} strokeWidth={2} />}
        label="Analytics"
        active={isHubSpotAnalytics}
        onClick={() => router.push('/hubspot/analytics')}
      />
      <NavItem
        icon={<Building2 size={20} color={isGBP ? '#A855F7' : 'currentColor'} strokeWidth={2} />}
        label="Google Profiles"
        active={isGBP}
        onClick={() => router.push('/gbp')}
      />
      <NavItem
        icon={<Settings size={20} color={isSettings ? '#A855F7' : 'currentColor'} strokeWidth={2} />}
        label="Settings"
        active={isSettings}
        onClick={() => router.push('/settings')}
      />
    </>
  );

  const logo = <ZingLogoTamagui onClick={() => router.push('/')} />;

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            logo={logo}
            userEmail={user?.email}
            onSignOut={handleSignOut}
          >
            {navItems}
          </Sidebar>
        }
        topBarTitle={topBarTitle}
        topBarActions={topBarActions}
        mobileNavItems={navItems}
        mobileLogo={logo}
      >
        {children}
      </AppShell>
      <Toaster />
      {user && <DataChatWidget />}
    </>
  );
}
