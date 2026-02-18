/**
 * POST /api/gbp/disconnect
 *
 * Disconnects a GBP account by removing it from the database.
 * Does NOT revoke Google OAuth - just removes our record of the connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, pipedreamAccountId } = body;

    // Accept either account ID format
    const idToDelete = pipedreamAccountId || accountId;

    if (!idToDelete) {
      return NextResponse.json(
        { error: 'accountId or pipedreamAccountId is required' },
        { status: 400 }
      );
    }

    console.log('[API /gbp/disconnect] Disconnecting account:', idToDelete);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the account first
    const { data: existingAccount, error: findError } = await supabase
      .from('pipedream_connected_accounts')
      .select('id, pipedream_account_id, account_name, client_id')
      .or(`id.eq.${idToDelete},pipedream_account_id.eq.${idToDelete}`)
      .single();

    if (findError || !existingAccount) {
      console.error('[API] Account not found:', findError);
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    console.log('[API] Found account to disconnect:', {
      id: existingAccount.id,
      pipedreamAccountId: existingAccount.pipedream_account_id,
      accountName: existingAccount.account_name,
    });

    // Delete the account
    const { error: deleteError } = await supabase
      .from('pipedream_connected_accounts')
      .delete()
      .eq('id', existingAccount.id);

    if (deleteError) {
      console.error('[API] Error deleting account:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect account', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Successfully disconnected account:', existingAccount.account_name);

    return NextResponse.json({
      success: true,
      message: `Disconnected ${existingAccount.account_name}`,
      disconnectedAccount: {
        id: existingAccount.id,
        pipedreamAccountId: existingAccount.pipedream_account_id,
        accountName: existingAccount.account_name,
      },
    });

  } catch (error: any) {
    console.error('[API] Error disconnecting GBP account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account', details: error.message },
      { status: 500 }
    );
  }
}
