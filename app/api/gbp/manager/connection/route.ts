/**
 * GET /api/gbp/manager/connection
 *
 * Fetches ALL GBP connections in the system, categorized as:
 * 1. Manager Account: Connected to ZING_MANAGER client (Zing's master account)
 * 2. Client Accounts: Connected to other clients (individual business accounts)
 *
 * Returns all accounts so the UI can display:
 * - Zing Admin GBP profiles
 * - All other connected Google account GBP profiles
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ZING_MANAGER_ID = 'ZING_MANAGER';

interface GBPConnection {
  id: string;
  pipedream_account_id: string;
  account_name: string;
  account_email: string | null;
  external_id: string | null;
  healthy: boolean;
  created_at: string;
  type: 'manager' | 'client';
  client_name?: string;
  client_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API /gbp/manager/connection] Fetching ALL GBP connections...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the ZING_MANAGER client ID for categorization
    const { data: managerClient } = await supabase
      .from('clients')
      .select('id, name')
      .eq('hubspot_contact_id', ZING_MANAGER_ID)
      .single();

    const managerClientId = managerClient?.id;
    console.log('[API] ZING_MANAGER client ID:', managerClientId);

    // Fetch ALL GBP accounts with their linked client info
    const { data: allAccounts, error: accountsError } = await supabase
      .from('pipedream_connected_accounts')
      .select(`
        id,
        pipedream_account_id,
        account_name,
        account_email,
        external_id,
        healthy,
        created_at,
        client_id,
        clients (
          id,
          name,
          business_name,
          hubspot_contact_id
        )
      `)
      .eq('app_name', 'google_my_business')
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('[API] Error fetching accounts:', accountsError);
      throw accountsError;
    }

    console.log('[API] Found', allAccounts?.length || 0, 'GBP accounts');

    // Categorize accounts
    const managerAccounts: GBPConnection[] = [];
    const clientAccounts: GBPConnection[] = [];

    for (const account of allAccounts || []) {
      const clientInfo = account.clients as any;
      const isManager = clientInfo?.hubspot_contact_id === ZING_MANAGER_ID;

      const connection: GBPConnection = {
        id: account.id,
        pipedream_account_id: account.pipedream_account_id,
        account_name: account.account_name,
        account_email: account.account_email,
        external_id: account.external_id,
        healthy: account.healthy,
        created_at: account.created_at,
        type: isManager ? 'manager' : 'client',
        client_name: clientInfo?.business_name || clientInfo?.name,
        client_id: account.client_id,
      };

      if (isManager) {
        managerAccounts.push(connection);
      } else {
        clientAccounts.push(connection);
      }
    }

    console.log('[API] Manager accounts:', managerAccounts.length);
    console.log('[API] Client accounts:', clientAccounts.length);

    // For backwards compatibility, set "connection" to the first available account
    const primaryConnection = managerAccounts[0] || clientAccounts[0] || null;

    return NextResponse.json({
      success: true,
      connected: !!primaryConnection,
      // Primary connection for backwards compatibility
      connection: primaryConnection,
      // All accounts categorized
      allConnections: {
        manager: managerAccounts,
        clients: clientAccounts,
        total: (managerAccounts.length + clientAccounts.length),
      },
      // ZING_MANAGER client info
      managerClient: managerClient ? {
        id: managerClient.id,
        name: managerClient.name,
        hasConnection: managerAccounts.length > 0,
      } : null,
    });

  } catch (error: any) {
    console.error('[API] Error fetching GBP connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GBP connections', details: error.message },
      { status: 500 }
    );
  }
}
