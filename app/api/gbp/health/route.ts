/**
 * GBP Health Check Route
 *
 * GET /api/gbp/health
 * Verifies GBP API connectivity and token validity.
 */

import { NextResponse } from 'next/server';
import { createGBPClient } from '@/lib/gbp/client';
import { getGBPAccessToken } from '@/lib/gbp/token-manager';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; details?: any }> = {};
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

  // Check 1: Environment variables
  const hasClientId = !!process.env.GBP_CLIENT_ID || !!process.env.GOOGLE_CLIENT_ID || !!process.env.GOOGLE_OAUTH_CLIENT_ID;
  const hasClientSecret = !!process.env.GBP_CLIENT_SECRET || !!process.env.GOOGLE_CLIENT_SECRET || !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const hasRefreshToken = !!process.env.GBP_REFRESH_TOKEN;
  const hasAccessToken = !!process.env.GBP_ACCESS_TOKEN;

  checks['environment'] = {
    status: hasClientId && hasClientSecret ? 'ok' : 'error',
    details: {
      hasClientId,
      hasClientSecret,
      hasRefreshToken,
      hasAccessToken,
    },
  };

  if (checks['environment'].status === 'error') {
    overallStatus = 'error';
  }

  // Check 2: Token Manager
  try {
    const token = await getGBPAccessToken();
    checks['tokenManager'] = {
      status: token ? 'ok' : 'error',
      message: token ? 'Token retrieved successfully' : 'No token available',
    };
  } catch (error) {
    checks['tokenManager'] = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Token retrieval failed',
    };
    overallStatus = 'error';
  }

  // Check 3: GBP API connectivity (list accounts)
  if (checks['tokenManager'].status === 'ok') {
    try {
      const token = await getGBPAccessToken();
      const client = createGBPClient(token);
      const accounts = await client.listAccounts();

      checks['gbpApi'] = {
        status: 'ok',
        message: `Connected - ${accounts.accounts?.length || 0} accounts found`,
        details: {
          accountCount: accounts.accounts?.length || 0,
        },
      };
    } catch (error) {
      checks['gbpApi'] = {
        status: 'error',
        message: error instanceof Error ? error.message : 'API call failed',
      };
      overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus;
    }
  } else {
    checks['gbpApi'] = {
      status: 'error',
      message: 'Skipped - no valid token',
    };
  }

  // Check 4: Supabase connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    checks['supabase'] = {
      status: supabaseUrl && supabaseKey ? 'ok' : 'error',
      message: supabaseUrl && supabaseKey ? 'Configured' : 'Missing credentials',
    };
  } catch (error) {
    checks['supabase'] = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Configuration error',
    };
  }

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total: Object.keys(checks).length,
      passing: Object.values(checks).filter((c) => c.status === 'ok').length,
      failing: Object.values(checks).filter((c) => c.status === 'error').length,
    },
  });
}
