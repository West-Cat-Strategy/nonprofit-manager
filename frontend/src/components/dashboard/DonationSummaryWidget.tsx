/**
 * Donation Summary Widget
 * Overview of donation metrics
 */

import { useEffect, useState } from 'react';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import api from '../../services/api';
import { useDashboardData } from '../../features/dashboard/context/DashboardDataContext';
import type { AnalyticsSummary } from '../../types/analytics';

interface DonationSummaryWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

interface DonationSummaryData {
  total_donations: number;
  total_amount: number;
  average_donation: number;
  engaged_supporters: number;
}

const toNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const normalizeDonationSummary = (payload: unknown): DonationSummaryData => {
  const summary = (payload ?? {}) as Partial<AnalyticsSummary> & Record<string, unknown>;
  const engagementDistribution =
    summary.engagement_distribution && typeof summary.engagement_distribution === 'object'
      ? summary.engagement_distribution
      : null;

  return {
    total_donations: toNumber(summary.donation_count_ytd ?? summary.total_donations),
    total_amount: toNumber(summary.total_donations_ytd ?? summary.total_donation_amount),
    average_donation: toNumber(summary.average_donation_ytd ?? summary.average_donation),
    engaged_supporters: engagementDistribution
      ? toNumber(engagementDistribution.high) + toNumber(engagementDistribution.medium)
      : toNumber(summary.engaged_supporters ?? summary.engaged_count),
  };
};

const DonationSummaryWidget = ({ widget, editMode, onRemove }: DonationSummaryWidgetProps) => {
  const dashboardData = useDashboardData();
  const analyticsSummary = dashboardData?.analyticsSummary ?? null;
  const [data, setData] = useState<DonationSummaryData | null>(null);
  const [loading, setLoading] = useState(!dashboardData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardData) {
      return undefined;
    }

    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/v2/analytics/summary');
        if (!isMounted) return;
        setData(normalizeDonationSummary(response.data));
      } catch {
        if (!isMounted) return;
        setError('Failed to load donation data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [dashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const resolvedData = analyticsSummary
    ? normalizeDonationSummary(analyticsSummary)
    : data;

  const isLoading = dashboardData ? dashboardData.loading.analytics : loading;
  const resolvedError = dashboardData ? dashboardData.errors.analytics ?? null : error;

  return (
    <WidgetContainer
      widget={widget}
      editMode={editMode}
      onRemove={onRemove}
      loading={isLoading}
      error={resolvedError}
    >
      {resolvedData && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-app-text-muted">Total Donations</p>
            <p className="text-2xl font-bold text-app-text">{resolvedData.total_donations}</p>
          </div>
          <div>
            <p className="text-sm text-app-text-muted">Total Amount</p>
            <p className="text-2xl font-bold text-app-text">{formatCurrency(resolvedData.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-app-text-muted">Avg. Donation</p>
            <p className="text-2xl font-bold text-app-text">{formatCurrency(resolvedData.average_donation)}</p>
          </div>
          <div>
            <p className="text-sm text-app-text-muted">Engaged</p>
            <p className="text-2xl font-bold text-app-accent">
              {new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(
                resolvedData.engaged_supporters
              )}
            </p>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

export default DonationSummaryWidget;
