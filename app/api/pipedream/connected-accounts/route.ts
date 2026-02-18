/**
 * GET /api/pipedream/connected-accounts
 *
 * Retrieves all connected Pipedream accounts for the current user.
 * Used by useConnectedAccounts hook to display user's integrations.
 *
 * Response:
 * {
 *   "accounts": [
 *     {
 *       "id": "uuid",
 *       "pipedreamAccountId": "apn_5dhkDxM",
 *       "appName": "google_my_business",
 *       "accountName": "Nathan Clay",
 *       "accountEmail": "nathan@example.com",
 *       "healthy": true,
 *       "createdAt": "2025-11-16T12:00:00Z",
 *       "updatedAt": "2025-11-16T12:00:00Z"
 *     }
 *   ]
 * }
 *
 * Security:
 * - Uses Supabase auth to identify current user
 * - RLS policies ensure users only see their own accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with cookie-based auth
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[ConnectedAccounts] Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    console.log('[ConnectedAccounts] Fetching accounts for user:', user.id);

    // Fetch connected accounts for this user
    // RLS policies will automatically filter to only this user's accounts
    const { data: accounts, error: dbError } = await supabase
      .from('pipedream_connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('[ConnectedAccounts] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('[ConnectedAccounts] Found accounts:', accounts?.length || 0);

    // Transform to frontend format
    const formattedAccounts = (accounts || []).map((account) => ({
      id: account.id,
      pipedreamAccountId: account.pipedream_account_id,
      appName: account.app_name,
      accountName: account.account_name,
      accountEmail: account.account_email,
      healthy: account.healthy,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    }));

    return NextResponse.json({
      accounts: formattedAccounts,
    });
  } catch (error: any) {
    console.error('[ConnectedAccounts] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
