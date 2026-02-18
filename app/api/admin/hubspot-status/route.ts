/**
 * HubSpot API Status Check Route
 *
 * Tests HubSpot connection using the access token
 * Fetches account information to verify authentication
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API /api/admin/hubspot-status] Checking HubSpot connection');

  try {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        service: 'HubSpot',
        status: 'error',
        message: 'Missing HUBSPOT_ACCESS_TOKEN environment variable',
        timestamp: new Date().toISOString(),
      });
    }

    // Test connection by fetching account info
    const response = await fetch('https://api.hubapi.com/account-info/v3/details', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const accountInfo = await response.json();

    return NextResponse.json({
      success: true,
      service: 'HubSpot',
      status: 'connected',
      message: 'Successfully connected to HubSpot API',
      timestamp: new Date().toISOString(),
      data: {
        portalId: accountInfo.portalId,
        accountType: accountInfo.accountType,
        timeZone: accountInfo.timeZone,
        currency: accountInfo.currency,
        uiDomain: accountInfo.uiDomain,
      },
    });

  } catch (error: any) {
    console.error('[API] HubSpot connection error:', error);

    return NextResponse.json({
      success: false,
      service: 'HubSpot',
      status: 'error',
      message: error.message || 'Failed to connect to HubSpot API',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
