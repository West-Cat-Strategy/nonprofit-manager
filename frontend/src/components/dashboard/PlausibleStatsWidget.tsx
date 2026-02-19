/**
 * Plausible Stats Widget
 * Displays key metrics from Plausible Analytics via backend proxy
 */

import { useEffect, useState } from 'react';
import type { DashboardWidget } from '../../types/dashboard';
import WidgetContainer from './WidgetContainer';
import api from '../../services/api';

interface PlausibleStatsWidgetProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
}

interface PlausibleStats {
  visitors: {
    value: number;
    change: number;
  };
  pageviews: {
    value: number;
    change: number;
  };
  bounce_rate: {
    value: number;
    change: number;
  };
  visit_duration: {
    value: number;
    change: number;
  };
}

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: string;
}

const StatCard = ({ title, value, change, icon }: StatCardProps) => {
  const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-app-text-muted';
  const changePrefix = change > 0 ? '+' : '';

  return (
    <div className="p-4 bg-app-surface rounded-lg border border-app-border">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm text-app-text-muted mb-1">{title}</p>
          <p className="text-2xl font-bold text-app-text mb-1">{value}</p>
          <p className={`text-sm ${changeColor}`}>
            {changePrefix}{change.toFixed(1)}%
          </p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

const PlausibleStatsWidget = ({ widget, editMode, onRemove }: PlausibleStatsWidgetProps) => {
  const [stats, setStats] = useState<PlausibleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlausibleStats();
  }, []);

  const fetchPlausibleStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch aggregate stats via backend proxy (API key is server-side)
      const response = await api.get('/plausible/stats/aggregate', {
        params: {
          period: '30d',
          metrics: 'visitors,pageviews,bounce_rate,visit_duration',
          compare: 'previous_period',
        },
      });

      const data = response.data;

      // Transform API response to our format
      setStats({
        visitors: {
          value: data.results.visitors.value || 0,
          change: data.results.visitors.change || 0,
        },
        pageviews: {
          value: data.results.pageviews.value || 0,
          change: data.results.pageviews.change || 0,
        },
        bounce_rate: {
          value: data.results.bounce_rate.value || 0,
          change: data.results.bounce_rate.change || 0,
        },
        visit_duration: {
          value: data.results.visit_duration.value || 0,
          change: data.results.visit_duration.change || 0,
        },
      });
    } catch (err) {
      console.error('Error fetching Plausible stats:', err);
      setError('Unable to load analytics data');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <WidgetContainer
      widget={widget}
      editMode={editMode}
      onRemove={onRemove}
      loading={loading}
      error={error && !stats ? error : null}
    >
      {stats ? (
        <div className="p-4 space-y-4 overflow-auto">
          <p className="text-sm text-app-text-muted mb-4">Last 30 Days</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Unique Visitors"
              value={stats.visitors.value.toLocaleString()}
              change={stats.visitors.change}
              icon="👥"
            />

            <StatCard
              title="Total Pageviews"
              value={stats.pageviews.value.toLocaleString()}
              change={stats.pageviews.change}
              icon="🌐"
            />

            <StatCard
              title="Bounce Rate"
              value={`${stats.bounce_rate.value}%`}
              change={stats.bounce_rate.change}
              icon="📈"
            />

            <StatCard
              title="Avg. Visit Duration"
              value={formatDuration(stats.visit_duration.value)}
              change={stats.visit_duration.change}
              icon="⏱️"
            />
          </div>
        </div>
      ) : (
        <div className="p-4">
          <p className="text-app-text-muted">No analytics data available</p>
        </div>
      )}
    </WidgetContainer>
  );
};

export default PlausibleStatsWidget;
