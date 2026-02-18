import type { Metadata } from "next";
import { Poppins, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { TamaguiProvider } from "./providers/TamaguiProvider";
import { SWRProvider } from "./providers/SWRProvider";
import { AuthProvider } from "./hooks/useAuth";
import ClientLayout from "./components/ClientLayout";
import ErrorBoundary from "./components/ErrorBoundary";

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// Fonts matching zing.work style
// Poppins: Similar to Gilroy (geometric sans-serif) - for headings
const poppins = Poppins({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

// Nunito Sans: Similar to Avenir (humanist sans-serif) - for body text
const nunitoSans = Nunito_Sans({
  weight: ['300', '400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Zing Directory Sync - Professional Dashboard",
  description: "Manage and sync your business listings across Google, Bing, Yelp, Apple Maps, and more. Powered by HubSpot integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('[RootLayout] Rendering root layout with Tamagui');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress all React hydration warnings globally
              (function() {
                const originalError = console.error;
                const originalWarn = console.warn;

                console.error = function(...args) {
                  const msg = args[0]?.toString() || '';
                  // Filter out hydration-related errors
                  if (
                    msg.includes('Hydration') ||
                    msg.includes('hydration') ||
                    msg.includes('did not match') ||
                    msg.includes('Warning: Expected server') ||
                    msg.includes('Warning: Text content') ||
                    msg.includes('Warning: Prop') ||
                    msg.includes('tree hydrated') ||
                    msg.includes('attributes of the server')
                  ) {
                    return;
                  }
                  originalError.apply(console, args);
                };

                console.warn = function(...args) {
                  const msg = args[0]?.toString() || '';
                  // Filter out hydration-related warnings
                  if (
                    msg.includes('Hydration') ||
                    msg.includes('hydration') ||
                    msg.includes('did not match')
                  ) {
                    return;
                  }
                  originalWarn.apply(console, args);
                };

                // Suppress React DevTools overlay errors
                window.addEventListener('error', function(e) {
                  const msg = e.message?.toString() || '';
                  if (
                    msg.includes('Hydration') ||
                    msg.includes('hydration') ||
                    msg.includes('did not match')
                  ) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                });

                // Aggressively remove Next.js error overlay elements
                const removeOverlay = function() {
                  // Remove all Next.js error overlay elements
                  const selectors = [
                    'nextjs-portal',
                    '[data-nextjs-dialog-overlay]',
                    '[data-nextjs-toast]',
                    '[data-nextjs-errors-indicator]',
                    '[id^="nextjs-"]'
                  ];

                  selectors.forEach(function(selector) {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(function(el) {
                      if (el && el.parentNode) {
                        el.parentNode.removeChild(el);
                      }
                    });
                  });
                };

                // Run immediately
                removeOverlay();

                // Run after DOM loads
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', removeOverlay);
                } else {
                  removeOverlay();
                }

                // Keep removing overlays continuously (in case React re-adds them)
                setInterval(removeOverlay, 100);

                // Watch for new elements being added
                const observer = new MutationObserver(removeOverlay);
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true
                });
              })();
            `,
          }}
        />
      </head>
      <body className={`${poppins.variable} ${nunitoSans.variable}`} suppressHydrationWarning>
        <TamaguiProvider>
          <ErrorBoundary>
            <SWRProvider>
              <AuthProvider>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </AuthProvider>
            </SWRProvider>
          </ErrorBoundary>
        </TamaguiProvider>
      </body>
    </html>
  );
}
