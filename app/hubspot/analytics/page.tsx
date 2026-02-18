// @ts-nocheck
/**
 * Customer Analytics Dashboard (v6 - Enhanced)
 *
 * Focused on 3 high-value charts:
 * 1. Customer Growth - Cumulative total (area) + New per month (bars)
 * 2. Customer Locations - Geographic distribution by state (horizontal bar)
 * 3. Data Quality Distribution - Completeness score buckets
 *
 * Plus 3 KPI cards: Total Customers, Data Quality %, With Location Data
 *
 * Built with Recharts + Tamagui. Shows only customer analytics.
 */

'use client';

import { YStack, XStack, Text, Card, Spinner, Button } from 'tamagui';
import {
  TrendingUp,
  MapPin,
  RefreshCw,
  AlertCircle,
  BarChart3,  // Used in header icon
  Users,
  Target,
  CheckCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  TooltipProps,
  Cell,
} from 'recharts';
import {
  useHubSpotAnalytics,
  formatNumber,
} from '@/app/hooks/useHubSpotAnalytics';
import { NoDataYet } from '@/app/components/tamagui';

// ============ COLORS ============
const COLORS = {
  green: '#10b981',  // Primary color for customers
  cyan: '#06b6d4',   // Used for geographic chart
  amber: '#f59e0b',  // Used for warnings
};

// ============ COMPONENTS ============

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  icon?: React.ReactNode;
}

function ChartCard({ title, subtitle, children, height = 320, icon }: ChartCardProps) {
  return (
    <Card
      backgroundColor="$background"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      padding="$5"
      elevation={1}
    >
      <YStack space="$4">
        <XStack alignItems="flex-start" justifyContent="space-between">
          <YStack flex={1}>
            <XStack alignItems="center" gap="$2">
              {icon}
              <Text fontSize="$6" fontWeight="700" color="$color">
                {title}
              </Text>
            </XStack>
            {subtitle && (
              <Text fontSize="$3" color="$color" opacity={0.6} marginTop="$1">
                {subtitle}
              </Text>
            )}
          </YStack>
        </XStack>
        {/* Fixed height container ensures ResponsiveContainer has dimensions */}
        <YStack height={height} minHeight={200} minWidth={200}>{children}</YStack>
      </YStack>
    </Card>
  );
}

// Custom tooltip with Tamagui styling
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <YStack
      backgroundColor="$background"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderColor"
      padding="$3"
      space="$2"
      elevation={3}
    >
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$color">
          {label}
        </Text>
      )}
      {payload.map((entry, index) => (
        <XStack key={index} alignItems="center" space="$2">
          <YStack
            width={10}
            height={10}
            borderRadius="$1"
            backgroundColor={entry.color}
          />
          <Text fontSize="$2" color="$color">
            {entry.name}: {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

// ============ MAIN COMPONENT ============

export default function CustomerAnalyticsPage() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useHubSpotAnalytics('customer'); // Always fetch customer data

  // Loading state
  if (loading) {
    return (
      <YStack flex={1} padding="$6" alignItems="center" justifyContent="center" minHeight="60vh">
        <YStack space="$4" alignItems="center">
          <Spinner size="large" color={COLORS.green} />
          <Text fontSize="$5" fontWeight="600" color="$color">
            Loading customer analytics...
          </Text>
          <Text fontSize="$3" color="$color" opacity={0.5}>
            Analyzing your customer data
          </Text>
        </YStack>
      </YStack>
    );
  }

  // Error state
  if (error) {
    return (
      <YStack flex={1} padding="$6" alignItems="center" justifyContent="center">
        <Card
          backgroundColor="$background"
          borderRadius="$5"
          borderWidth={2}
          borderColor={`${COLORS.amber}30`}
          padding="$8"
          maxWidth={500}
        >
          <YStack space="$4" alignItems="center">
            <AlertCircle size={48} color={COLORS.amber} strokeWidth={1.5} />
            <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
              Failed to Load Analytics
            </Text>
            <Text fontSize="$4" color="$color" opacity={0.7} textAlign="center">
              {error}
            </Text>
            <Button
              backgroundColor={COLORS.green}
              borderRadius="$3"
              onPress={() => refetch()}
              icon={<RefreshCw size={16} color="white" />}
            >
              <Text color="white" fontWeight="600">
                Try Again
              </Text>
            </Button>
          </YStack>
        </Card>
      </YStack>
    );
  }

  // No data state
  if (!data) {
    return (
      <YStack flex={1} padding="$6" alignItems="center" justifyContent="center">
        <NoDataYet
          icon={<BarChart3 size={36} color={COLORS.green} strokeWidth={1.5} />}
          title="No Analytics Data Yet"
          description="Analytics data will appear here once contacts are synced from HubSpot."
          action={{
            label: 'Refresh Data',
            onClick: () => refetch(),
          }}
          variant="info"
        />
      </YStack>
    );
  }

  const { kpis, charts } = data;

  // Get customer growth data for the combined chart (cumulative + new per month)
  const customerGrowthData = charts.acquisitionTimeline.map(item => ({
    month: item.month,
    total: item.cumulativeCustomers,
    new: item.newCustomers,
  }));

  // Get field coverage data for the completeness chart
  const fieldCoverageData = (charts.fieldCoverage || []).map(item => ({
    ...item,
    // Color based on coverage percentage
    color: item.percent >= 80 ? '#10b981' : item.percent >= 50 ? '#22c55e' : item.percent >= 25 ? '#f59e0b' : '#ef4444',
  }));

  return (
    <YStack
      flex={1}
      padding="$6"
      gap="$6"
      maxWidth={1400}
      marginHorizontal="auto"
      width="100%"
      $sm={{ padding: '$4', gap: '$4' }}
    >
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$3">
        <XStack alignItems="center" gap="$3">
          <YStack
            width={48}
            height={48}
            borderRadius="$4"
            backgroundColor={`${COLORS.green}15`}
            justifyContent="center"
            alignItems="center"
          >
            <BarChart3 size={24} color={COLORS.green} strokeWidth={2} />
          </YStack>
          <YStack>
            <Text fontSize="$7" fontWeight="700" color="$color">
              Customer Analytics
            </Text>
            <Text fontSize="$3" color="$color" opacity={0.6}>
              {formatNumber(kpis.totalContacts)} total customers
            </Text>
          </YStack>
        </XStack>

        <Button
          size="$3"
          backgroundColor="$backgroundHover"
          borderRadius="$3"
          onPress={() => refetch()}
          icon={<RefreshCw size={16} color={COLORS.green} />}
        >
          <Text color={COLORS.green} fontWeight="600">
            Refresh
          </Text>
        </Button>
      </XStack>

      {/* Key Metrics Row */}
      <XStack gap="$4" flexWrap="wrap">
        <Card
          flex={1}
          minWidth={200}
          backgroundColor="$background"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$borderColor"
          padding="$4"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize="$3" color="$color" opacity={0.6}>Total Customers</Text>
              <Text fontSize="$8" fontWeight="700" color={COLORS.green}>
                {formatNumber(kpis.totalContacts)}
              </Text>
            </YStack>
            <Users size={32} color={COLORS.green} opacity={0.3} />
          </XStack>
        </Card>

        <Card
          flex={1}
          minWidth={200}
          backgroundColor="$background"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$borderColor"
          padding="$4"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize="$3" color="$color" opacity={0.6}>Profile Completeness</Text>
              <Text fontSize="$8" fontWeight="700" color={kpis.avgCompleteness >= 50 ? COLORS.green : COLORS.amber}>
                {Math.round(kpis.avgCompleteness / 10)}/10
              </Text>
              <Text fontSize="$2" color="$color" opacity={0.5}>fields filled avg</Text>
            </YStack>
            <Target size={32} color={kpis.avgCompleteness >= 50 ? COLORS.green : COLORS.amber} opacity={0.3} />
          </XStack>
        </Card>

        <Card
          flex={1}
          minWidth={200}
          backgroundColor="$background"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$borderColor"
          padding="$4"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize="$3" color="$color" opacity={0.6}>With Location Data</Text>
              <Text fontSize="$8" fontWeight="700" color={COLORS.cyan}>
                {formatNumber(kpis.totalContacts - kpis.unknownStateCount)}
              </Text>
            </YStack>
            <MapPin size={32} color={COLORS.cyan} opacity={0.3} />
          </XStack>
        </Card>
      </XStack>

      {/* Chart 1: Customer Growth Over Time (Cumulative + New per Month) */}
      <ChartCard
        title="Customer Growth"
        subtitle="Cumulative total (area) and new customers per month (bars)"
        icon={<TrendingUp size={20} color={COLORS.green} />}
        height={300}
      >
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <ComposedChart
            data={customerGrowthData}
            margin={{ top: 10, right: 60, left: 0, bottom: 10 }}
          >
            <defs>
              <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#33333320" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#888', fontSize: 11 }}
              tickLine={false}
              interval={1}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#888', fontSize: 12 }}
              tickLine={false}
              label={{ value: 'Total', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#888', fontSize: 12 }}
              tickLine={false}
              label={{ value: 'New/Month', angle: 90, position: 'insideRight', fill: '#888', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="total"
              stroke={COLORS.green}
              strokeWidth={2}
              fill="url(#colorGrowth)"
              name="Total Customers"
            />
            <Bar
              yAxisId="right"
              dataKey="new"
              fill="#059669"
              name="New This Month"
              radius={[2, 2, 0, 0]}
              opacity={0.8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 2: Geographic Distribution (Full Width) */}
      <ChartCard
        title="Customer Locations"
        subtitle={`Top 10 states${kpis.unknownStateCount > 0 ? ` (${formatNumber(kpis.unknownStateCount)} with unknown location excluded)` : ''}`}
        icon={<MapPin size={20} color={COLORS.cyan} />}
        height={350}
      >
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart
            data={charts.geographicDistribution}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#33333320" />
            <XAxis type="number" tick={{ fill: '#888', fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#888', fontSize: 11 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              name="Customers"
              fill={COLORS.cyan}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 3: Field Coverage - Shows which fields are filled */}
      <ChartCard
        title="Field Coverage"
        subtitle="Percentage of customers with each field filled (10 fields measured)"
        icon={<CheckCircle size={20} color={COLORS.green} />}
        height={320}
      >
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart
            data={fieldCoverageData}
            layout="vertical"
            margin={{ top: 10, right: 50, left: 90, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#33333320" />
            <XAxis
              type="number"
              tick={{ fill: '#888', fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#888', fontSize: 11 }}
              width={80}
            />
            <Tooltip
              formatter={(value: number, name: string, props: { payload: { filled: number; missing: number } }) => [
                `${value}% (${formatNumber(props.payload.filled)} filled, ${formatNumber(props.payload.missing)} missing)`,
                'Coverage'
              ]}
            />
            <Bar
              dataKey="percent"
              name="Coverage"
              radius={[0, 4, 4, 0]}
            >
              {fieldCoverageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </YStack>
  );
}
