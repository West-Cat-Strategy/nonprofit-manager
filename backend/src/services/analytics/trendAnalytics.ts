/**
 * Trend Analytics Service
 * Handles trend analysis, anomaly detection, and comparative analytics
 */

import { Pool } from 'pg';
import { logger } from '../../config/logger';
import { getCached, setCached } from '../../config/redis';
import type {
  ComparativeAnalytics,
  PeriodComparison,
  TrendAnalysis,
  TrendDataPoint,
  AnomalyDetectionResult,
  Anomaly,
} from '../../types/analytics';
import { DonationAnalyticsService } from './donationAnalytics';
import { VolunteerAnalyticsService } from './volunteerAnalytics';
import { EventAnalyticsService } from './eventAnalytics';

export class TrendAnalyticsService {
  private donationAnalytics: DonationAnalyticsService;
  private volunteerAnalytics: VolunteerAnalyticsService;
  private eventAnalytics: EventAnalyticsService;

  constructor(private pool: Pool) {
    this.donationAnalytics = new DonationAnalyticsService(pool);
    this.volunteerAnalytics = new VolunteerAnalyticsService(pool);
    this.eventAnalytics = new EventAnalyticsService(pool);
  }

  /**
   * Calculate simple moving average
   */
  private calculateMovingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        result.push(data[i]); // Not enough data points yet
      } else {
        const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / window);
      }
    }
    return result;
  }

  /**
   * Calculate statistical summary for anomaly detection
   */
  private calculateStatistics(data: number[]): {
    mean: number;
    median: number;
    std_deviation: number;
    min: number;
    max: number;
  } {
    if (data.length === 0) {
      return { mean: 0, median: 0, std_deviation: 0, min: 0, max: 0 };
    }

    // Mean
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;

    // Median
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    // Standard deviation
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std_deviation = Math.sqrt(variance);

    // Min and max
    const min = Math.min(...data);
    const max = Math.max(...data);

    return { mean, median, std_deviation, min, max };
  }

  /**
   * Detect trend direction and strength using linear regression
   */
  private detectTrend(data: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    velocity: number;
  } {
    if (data.length < 2) {
      return { direction: 'stable', strength: 0, velocity: 0 };
    }

    // Simple linear regression
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    // Slope (velocity)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // R-squared (strength)
    const yMean = sumY / n;
    const ssTotal = data.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const yPredicted = x.map(xi => (sumY - slope * sumX) / n + slope * xi);
    const ssResidual = data.reduce((sum, yi, i) => sum + Math.pow(yi - yPredicted[i], 2), 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    // Determine direction
    const direction = Math.abs(slope) < 0.01 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing';

    // Strength as percentage (0-100)
    const strength = Math.min(100, Math.abs(rSquared) * 100);

    return { direction, strength, velocity: slope };
  }

  /**
   * Analyze trends with moving averages
   */
  async getTrendAnalysis(
    metricType: 'donations' | 'volunteer_hours' | 'event_attendance',
    months: number = 12
  ): Promise<TrendAnalysis> {
    try {
      const cacheKey = `trend_analysis:${metricType}:${months}`;
      const cached = await getCached<TrendAnalysis>(cacheKey);
      if (cached) return cached;

      let data: Array<{ month: string; value: number }> = [];
      let metricName = '';

      // Get raw data based on metric type
      switch (metricType) {
        case 'donations': {
          metricName = 'Total Donations';
          const trends = await this.donationAnalytics.getDonationTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.amount }));
          break;
        }
        case 'volunteer_hours': {
          metricName = 'Volunteer Hours';
          const trends = await this.volunteerAnalytics.getVolunteerHoursTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.hours }));
          break;
        }
        case 'event_attendance': {
          metricName = 'Event Attendance';
          const trends = await this.eventAnalytics.getEventAttendanceTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.total_attendance }));
          break;
        }
      }

      if (data.length === 0) {
        throw new Error('No data available for trend analysis');
      }

      // Extract values for calculations
      const values = data.map(d => d.value);

      // Calculate moving averages
      const ma7 = this.calculateMovingAverage(values, Math.min(7, values.length));
      const ma30 = this.calculateMovingAverage(values, Math.min(30, values.length));

      // Build data points with moving averages
      const dataPoints: TrendDataPoint[] = data.map((d, i) => ({
        period: d.month,
        value: d.value,
        movingAverage: values[i],
        movingAverage7: ma7[i],
        movingAverage30: ma30[i],
      }));

      // Detect trend
      const trendInfo = this.detectTrend(values);

      // Predict next period using linear extrapolation
      const predictionNextPeriod = values[values.length - 1] + trendInfo.velocity;

      const result: TrendAnalysis = {
        metric_name: metricName,
        data_points: dataPoints,
        trend_direction: trendInfo.direction,
        trend_strength: Math.round(trendInfo.strength),
        velocity: Math.round(trendInfo.velocity * 100) / 100,
        prediction_next_period: Math.max(0, Math.round(predictionNextPeriod)),
        analysis_period: {
          start_date: data[0].month,
          end_date: data[data.length - 1].month,
          period_count: data.length,
        },
      };

      // Cache for 1 hour
      await setCached(cacheKey, result, 3600);

      return result;
    } catch (error) {
      logger.error('Error analyzing trends', { error, metricType });
      throw new Error('Failed to analyze trends');
    }
  }

  /**
   * Detect anomalies in metric data using statistical methods
   */
  async detectAnomalies(
    metricType: 'donations' | 'volunteer_hours' | 'event_attendance',
    months: number = 12,
    sensitivityStdDev: number = 2.0
  ): Promise<AnomalyDetectionResult> {
    try {
      const cacheKey = `anomaly_detection:${metricType}:${months}:${sensitivityStdDev}`;
      const cached = await getCached<AnomalyDetectionResult>(cacheKey);
      if (cached) return cached;

      let data: Array<{ month: string; value: number }> = [];
      let metricName = '';

      // Get raw data based on metric type
      switch (metricType) {
        case 'donations': {
          metricName = 'Total Donations';
          const trends = await this.donationAnalytics.getDonationTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.amount }));
          break;
        }
        case 'volunteer_hours': {
          metricName = 'Volunteer Hours';
          const trends = await this.volunteerAnalytics.getVolunteerHoursTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.hours }));
          break;
        }
        case 'event_attendance': {
          metricName = 'Event Attendance';
          const trends = await this.eventAnalytics.getEventAttendanceTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.total_attendance }));
          break;
        }
      }

      if (data.length === 0) {
        throw new Error('No data available for anomaly detection');
      }

      // Calculate statistics
      const values = data.map(d => d.value);
      const stats = this.calculateStatistics(values);

      // Define thresholds
      const thresholdUpper = stats.mean + sensitivityStdDev * stats.std_deviation;
      const thresholdLower = Math.max(0, stats.mean - sensitivityStdDev * stats.std_deviation);

      // Detect anomalies
      const anomalies: Anomaly[] = [];

      data.forEach((point) => {
        const value = point.value;
        const expectedValue = stats.mean;
        const deviation = value - expectedValue;
        const deviationPercent = expectedValue === 0 ? 0 : (deviation / expectedValue) * 100;

        // Check if value is outside thresholds
        if (value > thresholdUpper || value < thresholdLower) {
          // Determine severity based on how many standard deviations away
          const stdDevsAway = Math.abs(deviation) / stats.std_deviation;
          let severity: 'low' | 'medium' | 'high';
          if (stdDevsAway > 3) severity = 'high';
          else if (stdDevsAway > 2.5) severity = 'medium';
          else severity = 'low';

          // Determine type
          let type: 'spike' | 'drop' | 'unusual_pattern';
          if (value > thresholdUpper) {
            type = 'spike';
          } else if (value < thresholdLower) {
            type = 'drop';
          } else {
            type = 'unusual_pattern';
          }

          anomalies.push({
            period: point.month,
            value,
            expected_value: Math.round(expectedValue),
            deviation: Math.round(deviation),
            deviation_percent: Math.round(deviationPercent * 10) / 10,
            severity,
            type,
          });
        }
      });

      const result: AnomalyDetectionResult = {
        metric_name: metricName,
        total_periods: data.length,
        anomalies_detected: anomalies.length,
        anomalies,
        statistical_summary: {
          mean: Math.round(stats.mean),
          median: Math.round(stats.median),
          std_deviation: Math.round(stats.std_deviation * 10) / 10,
          min: Math.round(stats.min),
          max: Math.round(stats.max),
          threshold_upper: Math.round(thresholdUpper),
          threshold_lower: Math.round(thresholdLower),
        },
        analysis_period: {
          start_date: data[0].month,
          end_date: data[data.length - 1].month,
        },
      };

      // Cache for 1 hour
      await setCached(cacheKey, result, 3600);

      return result;
    } catch (error) {
      logger.error('Error detecting anomalies', { error, metricType });
      throw new Error('Failed to detect anomalies');
    }
  }

  /**
   * Get comparative analytics (YoY, MoM, QoQ)
   */
  async getComparativeAnalytics(
    periodType: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ComparativeAnalytics> {
    try {
      // Try to get from cache
      const cacheKey = `analytics:comparative:${periodType}`;
      const cached = await getCached<ComparativeAnalytics>(cacheKey);
      if (cached) {
        logger.debug('Comparative analytics cache hit', { cacheKey });
        return cached;
      }

      const now = new Date();
      let currentStart: Date;
      let currentEnd: Date;
      let previousStart: Date;
      let previousEnd: Date;
      let currentPeriodLabel: string;
      let previousPeriodLabel: string;

      // Calculate period boundaries
      if (periodType === 'month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        currentPeriodLabel = currentStart.toISOString().substring(0, 7);
        previousPeriodLabel = previousStart.toISOString().substring(0, 7);
      } else if (periodType === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
        currentPeriodLabel = `${now.getFullYear()}-Q${currentQuarter + 1}`;
        previousPeriodLabel = `${now.getFullYear()}-Q${currentQuarter}`;
      } else {
        // year
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31);
        currentPeriodLabel = now.getFullYear().toString();
        previousPeriodLabel = (now.getFullYear() - 1).toString();
      }

      // Helper function to calculate comparison
      const calculateComparison = (current: number, previous: number): PeriodComparison => {
        const change = current - previous;
        const changePercent = previous === 0 ? 0 : (change / previous) * 100;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (Math.abs(changePercent) > 5) {
          trend = changePercent > 0 ? 'up' : 'down';
        }
        return {
          current,
          previous,
          change,
          change_percent: parseFloat(changePercent.toFixed(2)),
          trend,
        };
      };

      // Get donation metrics for both periods
      const donationQuery = `
        SELECT
          CASE
            WHEN donation_date >= $1 AND donation_date <= $2 THEN 'current'
            WHEN donation_date >= $3 AND donation_date <= $4 THEN 'previous'
          END as period,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) as count,
          COALESCE(AVG(amount), 0) as average_amount
        FROM donations
        WHERE payment_status = 'completed'
          AND ((donation_date >= $1 AND donation_date <= $2)
            OR (donation_date >= $3 AND donation_date <= $4))
        GROUP BY period
      `;

      // Get contact metrics for both periods
      const contactQuery = `
        SELECT
          CASE
            WHEN created_at >= $1 AND created_at <= $2 THEN 'current'
            WHEN created_at >= $3 AND created_at <= $4 THEN 'previous'
          END as period,
          COUNT(*) as count
        FROM contacts
        WHERE (created_at >= $1 AND created_at <= $2)
          OR (created_at >= $3 AND created_at <= $4)
        GROUP BY period
      `;

      // Get event metrics for both periods
      const eventQuery = `
        SELECT
          CASE
            WHEN start_date >= $1 AND start_date <= $2 THEN 'current'
            WHEN start_date >= $3 AND start_date <= $4 THEN 'previous'
          END as period,
          COUNT(*) as count
        FROM events
        WHERE (start_date >= $1 AND start_date <= $2)
          OR (start_date >= $3 AND start_date <= $4)
        GROUP BY period
      `;

      // Get volunteer metrics for both periods
      const volunteerQuery = `
        SELECT
          CASE
            WHEN activity_date >= $1 AND activity_date <= $2 THEN 'current'
            WHEN activity_date >= $3 AND activity_date <= $4 THEN 'previous'
          END as period,
          COALESCE(SUM(hours_logged), 0) as hours
        FROM volunteer_hours
        WHERE (activity_date >= $1 AND activity_date <= $2)
            OR (activity_date >= $3 AND activity_date <= $4)
        GROUP BY period
      `;

      const params = [
        currentStart.toISOString(),
        currentEnd.toISOString(),
        previousStart.toISOString(),
        previousEnd.toISOString(),
      ];

      const [donationResult, contactResult, eventResult, volunteerResult] = await Promise.all([
        this.pool.query(donationQuery, params),
        this.pool.query(contactQuery, params),
        this.pool.query(eventQuery, params),
        this.pool.query(volunteerQuery, params),
      ]);

      // Extract metrics
      const currentDonations = donationResult.rows.find((r) => r.period === 'current');
      const previousDonations = donationResult.rows.find((r) => r.period === 'previous');

      const currentContacts = contactResult.rows.find((r) => r.period === 'current');
      const previousContacts = contactResult.rows.find((r) => r.period === 'previous');

      const currentEvents = eventResult.rows.find((r) => r.period === 'current');
      const previousEvents = eventResult.rows.find((r) => r.period === 'previous');

      const currentVolunteer = volunteerResult.rows.find((r) => r.period === 'current');
      const previousVolunteer = volunteerResult.rows.find((r) => r.period === 'previous');

      // Build comparative analytics
      const result: ComparativeAnalytics = {
        period_type: periodType,
        current_period: currentPeriodLabel,
        previous_period: previousPeriodLabel,
        metrics: {
          total_donations: calculateComparison(
            currentDonations ? parseFloat(currentDonations.total_amount) : 0,
            previousDonations ? parseFloat(previousDonations.total_amount) : 0
          ),
          donation_count: calculateComparison(
            currentDonations ? parseInt(currentDonations.count) : 0,
            previousDonations ? parseInt(previousDonations.count) : 0
          ),
          average_donation: calculateComparison(
            currentDonations ? parseFloat(currentDonations.average_amount) : 0,
            previousDonations ? parseFloat(previousDonations.average_amount) : 0
          ),
          new_contacts: calculateComparison(
            currentContacts ? parseInt(currentContacts.count) : 0,
            previousContacts ? parseInt(previousContacts.count) : 0
          ),
          total_events: calculateComparison(
            currentEvents ? parseInt(currentEvents.count) : 0,
            previousEvents ? parseInt(previousEvents.count) : 0
          ),
          volunteer_hours: calculateComparison(
            currentVolunteer ? parseFloat(currentVolunteer.hours) : 0,
            previousVolunteer ? parseFloat(previousVolunteer.hours) : 0
          ),
          engagement_score: calculateComparison(0, 0), // Placeholder for now
        },
      };

      // Cache for 10 minutes (600 seconds)
      await setCached(cacheKey, result, 600);

      return result;
    } catch (error) {
      logger.error('Error getting comparative analytics', { error });
      throw new Error('Failed to retrieve comparative analytics');
    }
  }
}
