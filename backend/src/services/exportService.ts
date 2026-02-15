/**
 * Export Service
 * Handles exporting analytics data to CSV and Excel formats
 */

import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import type {
  AnalyticsSummary,
  TrendAnalysis,
} from '@app-types/analytics';

export type ExportFormat = 'csv' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  sheetName?: string;
}

export class ExportService {
  private exportDir: string;
  private readonly maxFilenameLength = 80;
  private dirInitialized = false;

  constructor() {
    this.exportDir = path.join(__dirname, '../../exports');
    // Initialize directory asynchronously on construction (non-blocking)
    // Don't await - let it complete in the background
    this.initializeExportDir().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Warning: Failed to initialize export directory:', err);
    });
  }

  /**
   * Initialize export directory if it doesn't exist
   * Uses async file operations to avoid blocking the event loop
   */
  private async initializeExportDir(): Promise<void> {
    if (this.dirInitialized) return;
    try {
      await fsPromises.mkdir(this.exportDir, { recursive: true });
      this.dirInitialized = true;
    } catch (error) {
      // If directory exists, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      this.dirInitialized = true;
    }
  }

  /**
   * Export analytics summary to file
   */
  async exportAnalyticsSummary(
    data: AnalyticsSummary,
    options: ExportOptions
  ): Promise<string> {
    const filename = this.sanitizeFilename(
      options.filename,
      `analytics-summary-${Date.now()}`
    );

    const rows = [
      {
        metric: 'Total Donations YTD',
        value: data.donation_count_ytd,
        amount: data.total_donations_ytd,
      },
      {
        metric: 'Average Donation YTD',
        value: '-',
        amount: data.average_donation_ytd,
      },
      {
        metric: 'Total Accounts',
        value: data.total_accounts,
        amount: '-',
      },
      {
        metric: 'Active Accounts',
        value: data.active_accounts,
        amount: '-',
      },
      {
        metric: 'Total Contacts',
        value: data.total_contacts,
        amount: '-',
      },
      {
        metric: 'Active Contacts',
        value: data.active_contacts,
        amount: '-',
      },
      {
        metric: 'Total Volunteers',
        value: data.total_volunteers,
        amount: '-',
      },
      {
        metric: 'Volunteer Hours YTD',
        value: data.total_volunteer_hours_ytd,
        amount: '-',
      },
      {
        metric: 'Total Events YTD',
        value: data.total_events_ytd,
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
    const filename = this.sanitizeFilename(options.filename, `donations-${Date.now()}`);

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
    const filename = this.sanitizeFilename(options.filename, `volunteer-hours-${Date.now()}`);

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
    const filename = this.sanitizeFilename(options.filename, `event-attendance-${Date.now()}`);

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
    trends: TrendAnalysis,
    options: ExportOptions
  ): Promise<string> {
    const filename = this.sanitizeFilename(options.filename, `trends-${Date.now()}`);

    const rows = trends.data_points.map((point: any) => ({
      period: point.period,
      value: point.value,
      movingAverage: point.movingAverage || '-',
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
    const filename = this.sanitizeFilename(options.filename, `export-${Date.now()}`);

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
    const sanitizedData = data.map((row) => this.sanitizeRow(row));

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: headers,
    });

    await csvWriter.writeRecords(sanitizedData);

    return filepath;
  }

  /**
   * Export data to Excel format using ExcelJS
   */
  private async exportToExcel(
    sheets: Array<{ name: string; data: any[] }>,
    filename: string
  ): Promise<string> {
    const filepath = path.join(this.exportDir, `${filename}.xlsx`);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();

    // Add each sheet
    for (const sheet of sheets) {
      const sanitizedSheetData = sheet.data.map((row) => this.sanitizeRow(row));
      const worksheet = workbook.addWorksheet(sheet.name);

      if (sanitizedSheetData.length > 0) {
        // Get headers from first row
        const headers = Object.keys(sanitizedSheetData[0]);

        // Add header row
        worksheet.columns = headers.map((header) => ({
          header: header.charAt(0).toUpperCase() + header.slice(1).replace(/_/g, ' '),
          key: header,
          width: Math.min(50, Math.max(10, header.length + 5)),
        }));

        // Add data rows
        for (const row of sanitizedSheetData) {
          worksheet.addRow(row);
        }

        // Auto-fit column widths based on content
        worksheet.columns.forEach((column) => {
          let maxLength = column.header ? String(column.header).length : 10;
          column.eachCell?.({ includeEmpty: false }, (cell) => {
            const cellLength = cell.value ? String(cell.value).length : 0;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          });
          column.width = Math.min(50, maxLength + 2);
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      }
    }

    // Write file
    await workbook.xlsx.writeFile(filepath);

    return filepath;
  }

  /**
   * Delete an export file asynchronously
   */
  async deleteExport(filepath: string): Promise<void> {
    try {
      await fsPromises.unlink(filepath);
    } catch (error) {
      // File doesn't exist or already deleted - that's fine
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Clean up old export files (older than 1 hour)
   * Uses async/await instead of callbacks to avoid event loop blocking
   */
  async cleanupOldExports(): Promise<void> {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    try {
      const files = await fsPromises.readdir(this.exportDir);

      for (const file of files) {
        const filepath = path.join(this.exportDir, file);
        try {
          const stats = await fsPromises.stat(filepath);

          if (stats.mtimeMs < oneHourAgo) {
            await fsPromises.unlink(filepath);
          }
        } catch (error) {
          // Skip individual file errors (file may have been deleted, etc.)
          const errno = (error as NodeJS.ErrnoException).code;
          if (errno !== 'ENOENT' && errno !== 'EACCES') {
            // eslint-disable-next-line no-console
            console.warn(`Failed to clean up export file ${filepath}:`, error);
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet or other errors - non-critical
      // eslint-disable-next-line no-console
      console.warn('Failed to cleanup old exports:', error);
    }
  }

  private sanitizeFilename(input: string | undefined, fallback: string): string {
    if (!input) {
      return fallback;
    }

    const baseName = path.basename(input);
    const withoutExt = baseName.replace(/\.[^/.]+$/, '');
    const sanitized = withoutExt
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, this.maxFilenameLength);

    return sanitized.length > 0 ? sanitized : fallback;
  }

  private sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      sanitized[key] = this.sanitizeSpreadsheetValue(value);
    }
    return sanitized;
  }

  private sanitizeSpreadsheetValue(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trimStart();
    if (/^[=+\-@]/.test(trimmed)) {
      return `'${value}`;
    }

    return value;
  }
}

export default ExportService;
