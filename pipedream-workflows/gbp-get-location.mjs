/**
 * GBP Get Location Workflow
 *
 * This workflow fetches Google Business Profile location data for a connected account.
 *
 * Deploy with: pd deploy gbp-get-location.mjs
 *
 * Trigger: HTTP POST to workflow endpoint
 * Body: { "account_id": "apn_xxx", "external_user_id": "client-uuid" }
 */

import { axios } from "@pipedream/platform";

export default {
  name: "GBP Get Location",
  version: "0.1.0",

  props: {
    // HTTP trigger for API requests
    http: {
      type: "$.interface.http",
      customResponse: true,
    },

    // Google My Business app integration
    google_my_business: {
      type: "app",
      app: "google_my_business",
    },
  },

  async run({ steps, $ }) {
    // Step 1: Parse request body
    const { account_id, external_user_id } = steps.trigger.event.body;

    if (!account_id) {
      return await $.respond({
        status: 400,
        body: { error: "account_id is required" },
      });
    }

    console.log(`[Workflow] Fetching location for account: ${account_id}`);

    try {
      // Step 2: Get connected account with OAuth token
      // This retrieves the account's OAuth credentials from Pipedream Connect
      const account = await $.accounts.get({
        id: account_id,
        externalUserId: external_user_id,
      });

      if (!account || !account.oauth_access_token) {
        return await $.respond({
          status: 404,
          body: { error: "Connected account not found or not authorized" },
        });
      }

      console.log(`[Workflow] Found account: ${account.name || account_id}`);

      // Step 3: Fetch GBP account ID from Google Business Account Management API
      const accountsResponse = await axios($, {
        method: "GET",
        url: "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        headers: {
          Authorization: `Bearer ${account.oauth_access_token}`,
        },
      });

      const accounts = accountsResponse.accounts || [];

      if (accounts.length === 0) {
        return await $.respond({
          status: 404,
          body: { error: "No Google Business Profile accounts found" },
        });
      }

      // Use first account (format: "accounts/103378246033774877708")
      const gbpAccountId = accounts[0].name;
      console.log(`[Workflow] GBP Account: ${gbpAccountId}`);

      // Step 4: Fetch locations from Google Business Information API
      const locationsResponse = await axios($, {
        method: "GET",
        url: `https://mybusinessbusinessinformation.googleapis.com/v1/${gbpAccountId}/locations`,
        headers: {
          Authorization: `Bearer ${account.oauth_access_token}`,
        },
        params: {
          readMask: "name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,metadata",
        },
      });

      const locations = locationsResponse.locations || [];

      console.log(`[Workflow] ✅ Found ${locations.length} location(s)`);

      // Step 5: Return successful response
      return await $.respond({
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          success: true,
          account_id,
          gbp_account_id: gbpAccountId,
          locations,
          count: locations.length,
        },
      });

    } catch (error) {
      console.error("[Workflow] Error:", error);

      // Handle specific error cases
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data || error.message;

      return await $.respond({
        status: statusCode,
        body: {
          success: false,
          error: "Failed to fetch GBP locations",
          details: errorMessage,
        },
      });
    }
  },
};
