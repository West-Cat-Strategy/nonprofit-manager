/**
 * Export Service
 * Handles exporting analytics data to CSV and Excel formats
 */

import { createObjectCsvWriter } from 'csv-writer';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import type {
  AnalyticsSummary,
  DonationAnalytics,
  TrendAnalytics,
} from '../types/analytics';

export type ExportFormat = 'csv' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  sheetName?: string;
}

export class ExportService {
  private exportDir: string;

  constructor() {
    // Create exports directory if it doesn't exist
    this.exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export analytics summary to file
   */
  async exportAnalyticsSummary(
    data: AnalyticsSummary,
    options: ExportOptions
  ): Promise<string> {
    const filename = options.filename || `analytics-summary-${Date.now()}`;

    const rows = [
      {
        metric: 'Total Donations',
        value: data.donations.total_count,
        amount: data.donations.total_amount,
      },
      {
        metric: 'Average Donation',
        value: '-',
        amount: data.donations.average_donation,
      },
      {
        metric: 'Total Donors',
        value: data.donors.total_count,
        amount: '-',
      },
      {
        metric: 'Active Donors',
        value: data.donors.active_count,
        amount: '-',
      },
      {
        metric: 'Total Volunteers',
        value: data.volunteers.total_count,
        amount: '-',
      },
      {
        metric: 'Volunteer Hours',
        value: data.volunteers.total_hours,
        amount: '-',
      },
      {
        metric: 'Total Events',
        value: data.events.total_count,
        amount: '-',
      },
      {
        metric: 'Event Attendees',
        value: data.events.total_attendees,
        amount: '-',
      },
    ];

    if (options.format === 'csv') {
      return this.exportToCSV(rows, filename, [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' },
        { id: 'amount', title: 'Amount (USD)' },
      ]);
    } else {
      return this.exportToExcel([{ name: options.sheetName || 'Summary', data: rows }], filename);
    }
  }

  /**
   * Export donation analytics
   */
  async exportDonationAnalytics(
    donations: any[],
    options: ExportOptions
  ): Promise<string> {
    const filename = options.filename || `donations-${Date.now()}`;

    const rows = donations.map((d) => ({
      date: new Date(d.donation_date).toLocaleDateString(),
      donor: d.donor_name || 'Anonymous',
      amount: d.amount,
      method: d.payment_method,
      campaign: d.campaign || '-',
      notes: d.notes || '-',
    }));

    if (options.format === 'csv') {
      return this.exportToCSV(rows, filename, [
        { id: 'date', title: 'Date' },
        { id: 'donor', title: 'Donor' },
        { id: 'amount', title: 'Amount (USD)' },
        { id: 'method', title: 'Payment Method' },
        { id: 'campaign', title: 'Campaign' },
        { id: 'notes', title: 'Notes' },
      ]);
    } else {
      return this.exportToExcel([{ name: options.sheetName || 'Donations', data: rows }], filename);
    }
  }

  /**
   * Export volunteer hours
   */
  async exportVolunteerHours(
    hours: any[],
    options: ExportOptions
  ): Promise<string> {
    const filename = options.filename || `volunteer-hours-${Date.now()}`;

    const rows = hours.map((h) => ({
      date: new Date(h.log_date).toLocaleDateString(),
      volunteer: h.volunteer_name,
      hours: h.hours,
      activity: h.activity_type || '-',
      description: h.description || '-',
    }));

    if (options.format === 'csv') {
      return this.exportToCSV(rows, filename, [
        { id: 'date', title: 'Date' },
        { id: 'volunteer', title: 'Volunteer' },
        { id: 'hours', title: 'Hours' },
        { id: 'activity', title: 'Activity Type' },
        { id: 'description', title: 'Description' },
      ]);
    } else {
      return this.exportToExcel([{ name: options.sheetName || 'Volunteer Hours', data: rows }], filename);
    }
  }

  /**
   * Export event attendance
   */
  async exportEventAttendance(
    events: any[],
    options: ExportOptions
  ): Promise<string> {
    const filename = options.filename || `event-attendance-${Date.now()}`;

    const rows = events.map((e) => ({
      event: e.event_name,
      date: new Date(e.start_date).toLocaleDateString(),
      type: e.event_type,
      registered: e.registered_count,
      attended: e.attended_count,
      attendance_rate: e.attended_count > 0
        ? `${((e.attended_count / e.registered_count) * 100).toFixed(1)}%`
        : '0%',
    }));

    if (options.format === 'csv') {
      return this.exportToCSV(rows, filename, [
        { id: 'event', title: 'Event Name' },
        { id: 'date', title: 'Date' },
        { id: 'type', title: 'Event Type' },
        { id: 'registered', title: 'Registered' },
        { id: 'attended', title: 'Attended' },
        { id: 'attendance_rate', title: 'Attendance Rate' },
      ]);
    } else {
      return this.exportToExcel([{ name: options.sheetName || 'Events', data: rows }], filename);
    }
  }

  /**
   * Export trend data
   */
  async exportTrendData(
    trends: TrendAnalytics,
    options: ExportOptions
  ): Promise<string> {
    const filename = options.filename || `trends-${Date.now()}`;

    const rows = trends.data_points.map((point) => ({
      period: point.period,
      value: point.value,
      change: point.change ? `${point.change > 0 ? '+' : ''}${point.change.toFixed(2)}%` : '-',
    }));

    if (options.format === 'csv') {
      return this.exportToCSV(rows, filename, [
        { id: 'period', title: 'Period' },
        { id: 'value', title: 'Value' },
        { id: 'change', title: 'Change (%)' },
      ]);
    } else {
      return this.exportToExcel([{ name: options.sheetName || 'Trends', data: rows }], filename);
    }
  }

  /**
   * Export multiple sheets to Excel
   */
  async exportMultiSheet(
    sheets: Array<{ name: string; data: any[] }>,
    options: ExportOptions
  ): Promise<string> {
    const filename = options.filename || `export-${Date.now()}`;

    if (options.format === 'csv') {
      // For CSV, export first sheet only (CSV doesn't support multiple sheets)
      const firstSheet = sheets[0];
      const headers = Object.keys(firstSheet.data[0] || {}).map((key) => ({
        id: key,
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      }));
      return this.exportToCSV(firstSheet.data, filename, headers);
    } else {
      return this.exportToExcel(sheets, filename);
    }
  }

  /**
   * Export data to CSV format
   */
  private async exportToCSV(
    data: any[],
    filename: string,
    headers: Array<{ id: string; title: string }>
  ): Promise<string> {
    const filepath = path.join(this.exportDir, `${filename}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: headers,
    });

    await csvWriter.writeRecords(data);

    return filepath;
  }

  /**
   * Export data to Excel format
   */
  private exportToExcel(
    sheets: Array<{ name: string; data: any[] }>,
    filename: string
  ): string {
    const filepath = path.join(this.exportDir, `${filename}.xlsx`);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add each sheet
    for (const sheet of sheets) {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(sheet.data[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...sheet.data.map((row) => String(row[key] || '').length)
        );
        return { wch: Math.min(maxLength + 2, maxWidth) };
      });
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    }

    // Write file
    XLSX.writeFile(workbook, filepath);

    return filepath;
  }

  /**
   * Delete an export file
   */
  deleteExport(filepath: string): void {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  /**
   * Clean up old export files (older than 1 hour)
   */
  cleanupOldExports(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    fs.readdir(this.exportDir, (err, files) => {
      if (err) return;

      files.forEach((file) => {
        const filepath = path.join(this.exportDir, file);
        fs.stat(filepath, (err, stats) => {
          if (err) return;

          if (stats.mtimeMs < oneHourAgo) {
            fs.unlink(filepath, () => {});
          }
        });
      });
    });
  }
}

export default ExportService;
