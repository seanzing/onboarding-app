// @ts-nocheck
'use client';

/**
 * Company Property Edit Page
 *
 * Dedicated page for editing GBP/directory custom properties
 */

import { use, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanies } from '../../../hooks/useCompanies';
import { PropertyEditor, EditableCompanyProperties, BackButton } from '../../../components/tamagui';
import { YStack, Text } from 'tamagui';
import { Loader2 } from 'lucide-react';
import { Alert } from '../../../components/tamagui/Alert';
import { getCompanyDisplayName } from '../../../utils/companyNameHelper';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface CompanyEditPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Company Edit Page
 *
 * Protected by middleware (no client-side check needed)
 */
export default function CompanyEditPage({ params }: CompanyEditPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { companies, loading, error, refetch } = useCompanies();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);

  // Sync data from HubSpot when page loads (BEFORE displaying form)
  useEffect(() => {
    const syncFromHubSpot = async () => {
      // Prevent multiple syncs for the same contact
      if (hasSynced || isSyncing) {
        return;
      }

      try {
        setIsSyncing(true);
        setSyncError(null);

        console.log(`[CompanyEdit] Syncing contact ${resolvedParams.id} from HubSpot...`);

        const response = await fetch(`/api/hubspot/contacts/${resolvedParams.id}/sync`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to sync from HubSpot');
        }

        console.log('[CompanyEdit] Successfully synced from HubSpot');

        // Refetch companies to get updated data
        if (refetch) {
          await refetch();
        }

        setHasSynced(true);
      } catch (err: any) {
        console.error('[CompanyEdit] Sync error:', err);
        setSyncError(err.message);
        setHasSynced(true); // Allow display even on error
      } finally {
        setIsSyncing(false);
      }
    };

    // Only sync if we're not already loading companies
    if (!loading && !hasSynced) {
      syncFromHubSpot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id, loading]);

  // Find the company by ID
  const company = useMemo(() => {
    return companies.find((c) => c.id === resolvedParams.id);
  }, [companies, resolvedParams.id]);

  // Compute display name
  const displayName = useMemo(() => {
    if (!company) return '';
    return getCompanyDisplayName(
      company.properties.company,
      company.properties.website,
      company.id,
      company.properties.firstname,
      company.properties.lastname,
      company.properties.email
    );
  }, [company]);

  // Extract editable properties
  const initialProperties: EditableCompanyProperties = useMemo(() => {
    if (!company) return {};

    return {
      // Business Information
      business_category_type: company.properties.business_category_type || '',
      business_email_address: company.properties.business_email_address || '',
      phone: company.properties.phone || '',
      website: company.properties.website || '',
      current_website: company.properties.current_website || '',

      // Location
      address: company.properties.address || '',
      city: company.properties.city || '',
      state: company.properties.state || '',
      zip: company.properties.zip || '',
      country: company.properties.country || '',

      // Social Media
      twitterhandle: company.properties.twitterhandle || '',
      facebook_company_page: company.properties.facebook_company_page || '',
      linkedin_company_page: company.properties.linkedin_company_page || '',

      // Directory Settings
      active_customer: company.properties.active_customer || '',
      business_hours: company.properties.business_hours || '',
      payment_methods_accepted: company.properties.payment_methods_accepted || '',
    };
  }, [company]);

  const handleSave = (properties: EditableCompanyProperties) => {
    // Navigate back to detail page after successful save
    setTimeout(() => {
      router.push(`/companies/${resolvedParams.id}`);
    }, 1500);
  };

  const handleCancel = () => {
    router.push(`/companies/${resolvedParams.id}`);
  };

  // Loading state - wait for BOTH initial load AND sync to complete
  if (loading || isSyncing || !hasSynced) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" minHeight="100vh">
        <YStack space="$4" alignItems="center">
          <Loader2 size={32} color="$zingBlue" style={{ animation: 'spin 1s linear infinite' }} />
          <Text fontSize={14} $sm={{ fontSize: 15 }} color="$color" opacity={0.7}>
            {isSyncing ? 'Syncing from HubSpot...' : 'Loading company details...'}
          </Text>
        </YStack>
      </YStack>
    );
  }

  // Error state
  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" minHeight="100vh" padding="$6">
        <YStack maxWidth={480} width="100%" space="$4">
          <Alert variant="error">
            {error.message || 'Failed to load company details'}
          </Alert>
          <BackButton href="/companies" />
        </YStack>
      </YStack>
    );
  }

  // Company not found
  if (!company) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" minHeight="100vh" padding="$6">
        <YStack maxWidth={480} width="100%" space="$4" alignItems="center">
          <Text fontSize={24} $sm={{ fontSize: 26 }} fontWeight="700" color="$color" textAlign="center">
            Company Not Found
          </Text>
          <Text fontSize={14} $sm={{ fontSize: 15 }} color="$color" opacity={0.7} textAlign="center">
            The company you're trying to edit doesn't exist or has been removed.
          </Text>
          <BackButton href="/companies" />
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack minHeight="100vh" backgroundColor="$background">
      <YStack
        maxWidth={1280}
        width="100%"
        marginHorizontal="auto"
        padding="$4"
        $sm={{ padding: "$5" }}
        $lg={{ padding: "$6" }}
      >
        {/* Back button */}
        <YStack marginBottom="$5" $sm={{ marginBottom: "$6" }}>
          <BackButton
            href={`/companies/${resolvedParams.id}`}
            onClick={() => router.push(`/companies/${resolvedParams.id}`)}
          />
        </YStack>

        {/* Property Editor */}
        <PropertyEditor
          companyId={resolvedParams.id}
          companyName={displayName}
          initialProperties={initialProperties}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </YStack>
    </YStack>
  );
}
