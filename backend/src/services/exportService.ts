import type { AnalyticsSummary, TrendAnalysis, TrendDataPoint } from '@app-types/analytics';
import {
  buildTabularExport,
  type GeneratedTabularFile,
  type LegacyTabularExportFormat,
  type TabularExportColumn,
} from '@modules/shared/export/tabularExport';

export type ExportFormat = LegacyTabularExportFormat;

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  sheetName?: string;
}

type ExportRow = Record<string, unknown>;

const inferColumns = (rows: readonly ExportRow[]): TabularExportColumn<ExportRow>[] => {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });

  return Array.from(keys).map((key) => ({
    key,
    header: key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase()),
  }));
};

export class ExportService {
  async exportAnalyticsSummary(
    data: AnalyticsSummary,
    options: ExportOptions
  ): Promise<GeneratedTabularFile> {
    const rows: ExportRow[] = [
      {
        metric: 'Total Donations YTD',
        value: data.donation_count_ytd,
        amount: data.total_donations_ytd,
      },
      {
        metric: 'Average Donation YTD',
        value: null,
        amount: data.average_donation_ytd,
      },
      {
        metric: 'Total Accounts',
        value: data.total_accounts,
        amount: null,
      },
      {
        metric: 'Active Accounts',
        value: data.active_accounts,
        amount: null,
      },
      {
        metric: 'Total Contacts',
        value: data.total_contacts,
        amount: null,
      },
      {
        metric: 'Active Contacts',
        value: data.active_contacts,
        amount: null,
      },
      {
        metric: 'Total Volunteers',
        value: data.total_volunteers,
        amount: null,
      },
      {
        metric: 'Volunteer Hours YTD',
        value: data.total_volunteer_hours_ytd,
        amount: null,
      },
      {
        metric: 'Total Events YTD',
        value: data.total_events_ytd,
        amount: null,
      },
    ];

    return buildTabularExport({
      format: options.format,
      filename: options.filename,
      fallbackBaseName: `analytics-summary-${Date.now()}`,
      sheets: [
        {
          name: options.sheetName || 'Analytics Summary',
          columns: [
            { key: 'metric', header: 'Metric', width: 28 },
            { key: 'value', header: 'Value', width: 18 },
            { key: 'amount', header: 'Amount', width: 18 },
          ],
          rows,
        },
      ],
    });
  }

  async exportDonationAnalytics(
    donations: Array<Record<string, unknown>>,
    options: ExportOptions
  ): Promise<GeneratedTabularFile> {
    const rows: ExportRow[] = donations.map((donation) => ({
      date: donation.donation_date,
      donor: donation.donor_name || 'Anonymous',
      amount: donation.amount,
      method: donation.payment_method,
      campaign: donation.campaign || donation.campaign_name || null,
      notes: donation.notes || null,
    }));

    return buildTabularExport({
      format: options.format,
      filename: options.filename,
      fallbackBaseName: `donations-${Date.now()}`,
      sheets: [
        {
          name: options.sheetName || 'Donations',
          columns: [
            { key: 'date', header: 'Date', width: 16 },
            { key: 'donor', header: 'Donor', width: 28 },
            { key: 'amount', header: 'Amount', width: 16 },
            { key: 'method', header: 'Payment Method', width: 18 },
            { key: 'campaign', header: 'Campaign', width: 24 },
            { key: 'notes', header: 'Notes', width: 40 },
          ],
          rows,
        },
      ],
    });
  }

  async exportVolunteerHours(
    hours: Array<Record<string, unknown>>,
    options: ExportOptions
  ): Promise<GeneratedTabularFile> {
    const rows: ExportRow[] = hours.map((entry) => ({
      date: entry.log_date,
      volunteer: entry.volunteer_name,
      hours: entry.hours,
      activity: entry.activity_type || null,
      description: entry.description || null,
    }));

    return buildTabularExport({
      format: options.format,
      filename: options.filename,
      fallbackBaseName: `volunteer-hours-${Date.now()}`,
      sheets: [
        {
          name: options.sheetName || 'Volunteer Hours',
          columns: [
            { key: 'date', header: 'Date', width: 16 },
            { key: 'volunteer', header: 'Volunteer', width: 28 },
            { key: 'hours', header: 'Hours', width: 12 },
            { key: 'activity', header: 'Activity Type', width: 20 },
            { key: 'description', header: 'Description', width: 40 },
          ],
          rows,
        },
      ],
    });
  }

  async exportEventAttendance(
    events: Array<Record<string, unknown>>,
    options: ExportOptions
  ): Promise<GeneratedTabularFile> {
    const rows: ExportRow[] = events.map((event) => {
      const registered = Number(event.registered_count ?? 0);
      const attended = Number(event.attended_count ?? 0);
      const attendanceRate =
        registered > 0 ? `${((attended / registered) * 100).toFixed(1)}%` : '0%';

      return {
        event: event.event_name || event.name,
        date: event.start_date,
        type: event.event_type,
        registered,
        attended,
        attendance_rate: attendanceRate,
      };
    });

    return buildTabularExport({
      format: options.format,
      filename: options.filename,
      fallbackBaseName: `event-attendance-${Date.now()}`,
      sheets: [
        {
          name: options.sheetName || 'Events',
          columns: [
            { key: 'event', header: 'Event Name', width: 30 },
            { key: 'date', header: 'Date', width: 16 },
            { key: 'type', header: 'Event Type', width: 18 },
            { key: 'registered', header: 'Registered', width: 12 },
            { key: 'attended', header: 'Attended', width: 12 },
            { key: 'attendance_rate', header: 'Attendance Rate', width: 16 },
          ],
          rows,
        },
      ],
    });
  }

  async exportTrendData(
    trends: TrendAnalysis,
    options: ExportOptions
  ): Promise<GeneratedTabularFile> {
    const rows: ExportRow[] = trends.data_points.map((point: TrendDataPoint) => ({
      period: point.period,
      value: point.value,
      moving_average: point.movingAverage ?? null,
    }));

    return buildTabularExport({
      format: options.format,
      filename: options.filename,
      fallbackBaseName: `trends-${Date.now()}`,
      sheets: [
        {
          name: options.sheetName || 'Trends',
          columns: [
            { key: 'period', header: 'Period', width: 18 },
            { key: 'value', header: 'Value', width: 14 },
            { key: 'moving_average', header: 'Moving Average', width: 18 },
          ],
          rows,
        },
      ],
    });
  }

  async exportMultiSheet(
    sheets: Array<{ name: string; data: ExportRow[] }>,
    options: ExportOptions
  ): Promise<GeneratedTabularFile> {
    return buildTabularExport({
      format: options.format,
      filename: options.filename,
      fallbackBaseName: `export-${Date.now()}`,
      sheets: sheets.map((sheet) => ({
        name: sheet.name,
        columns: inferColumns(sheet.data),
        rows: sheet.data,
      })),
    });
  }

  async deleteExport(_filepath: string): Promise<void> {
    return Promise.resolve();
  }

  async cleanupOldExports(): Promise<void> {
    return Promise.resolve();
  }
}

export default ExportService;
