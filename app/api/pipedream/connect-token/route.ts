// @ts-nocheck - Pipedream SDK types don't match runtime environment configuration
/**
 * Pipedream Connect Token API Route
 *
 * Generates short-lived Pipedream Connect tokens for frontend OAuth flows.
 * Each token is tied to a specific user (external_user_id) and expires after 30 minutes.
 *
 * Security: This route should verify the user's session before generating a token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  console.log('[API /api/pipedream/connect-token] Generating Pipedream Connect token');

  try {
    // Verify user is authenticated via Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Get user ID from request body (should match authenticated user)
    const { external_user_id } = await req.json();

    if (!external_user_id) {
      return NextResponse.json(
        { error: 'Missing external_user_id' },
        { status: 400 }
      );
    }

    // Verify the requested external_user_id matches the authenticated user
    if (external_user_id !== user.id) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // Import Pipedream SDK (works on both client and server)
    const { PipedreamClient } = await import('@pipedream/sdk');

    const pdClient = new PipedreamClient({
      projectEnvironment: process.env.PIPEDREAM_ENVIRONMENT || 'production',
      clientId: process.env.PIPEDREAM_CLIENT_ID!,
      clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
      projectId: process.env.PIPEDREAM_PROJECT_ID!,
    });

    console.log(`[API] Creating Pipedream token for user: ${external_user_id}`);

    // Generate token for this user (uses camelCase: externalUserId)
    const tokenResponse = await pdClient.tokens.create({
      externalUserId: external_user_id,
    });

    // Security: Don't log token values
    console.log(`[API] Pipedream token generated, expires:`, tokenResponse.expiresAt);

    return NextResponse.json({
      token: tokenResponse.token,
      expiresAt: tokenResponse.expiresAt,
      connectLinkUrl: tokenResponse.connectLinkUrl,
      userId: external_user_id
    });

  } catch (error: any) {
    console.error('[API] Pipedream token generation error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to generate Pipedream token',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
