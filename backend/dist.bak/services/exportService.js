"use strict";
/**
 * Export Service
 * Handles exporting analytics data to CSV and Excel formats
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const csv_writer_1 = require("csv-writer");
const XLSX = __importStar(require("xlsx"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ExportService {
    constructor() {
        this.maxFilenameLength = 80;
        // Create exports directory if it doesn't exist
        this.exportDir = path.join(__dirname, '../../exports');
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }
    /**
     * Export analytics summary to file
     */
    async exportAnalyticsSummary(data, options) {
        const filename = this.sanitizeFilename(options.filename, `analytics-summary-${Date.now()}`);
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
        }
        else {
            return this.exportToExcel([{ name: options.sheetName || 'Summary', data: rows }], filename);
        }
    }
    /**
     * Export donation analytics
     */
    async exportDonationAnalytics(donations, options) {
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
        }
        else {
            return this.exportToExcel([{ name: options.sheetName || 'Donations', data: rows }], filename);
        }
    }
    /**
     * Export volunteer hours
     */
    async exportVolunteerHours(hours, options) {
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
        }
        else {
            return this.exportToExcel([{ name: options.sheetName || 'Volunteer Hours', data: rows }], filename);
        }
    }
    /**
     * Export event attendance
     */
    async exportEventAttendance(events, options) {
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
        }
        else {
            return this.exportToExcel([{ name: options.sheetName || 'Events', data: rows }], filename);
        }
    }
    /**
     * Export trend data
     */
    async exportTrendData(trends, options) {
        const filename = this.sanitizeFilename(options.filename, `trends-${Date.now()}`);
        const rows = trends.data_points.map((point) => ({
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
        }
        else {
            return this.exportToExcel([{ name: options.sheetName || 'Trends', data: rows }], filename);
        }
    }
    /**
     * Export multiple sheets to Excel
     */
    async exportMultiSheet(sheets, options) {
        const filename = this.sanitizeFilename(options.filename, `export-${Date.now()}`);
        if (options.format === 'csv') {
            // For CSV, export first sheet only (CSV doesn't support multiple sheets)
            const firstSheet = sheets[0];
            const headers = Object.keys(firstSheet.data[0] || {}).map((key) => ({
                id: key,
                title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            }));
            return this.exportToCSV(firstSheet.data, filename, headers);
        }
        else {
            return this.exportToExcel(sheets, filename);
        }
    }
    /**
     * Export data to CSV format
     */
    async exportToCSV(data, filename, headers) {
        const filepath = path.join(this.exportDir, `${filename}.csv`);
        const sanitizedData = data.map((row) => this.sanitizeRow(row));
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: filepath,
            header: headers,
        });
        await csvWriter.writeRecords(sanitizedData);
        return filepath;
    }
    /**
     * Export data to Excel format
     */
    exportToExcel(sheets, filename) {
        const filepath = path.join(this.exportDir, `${filename}.xlsx`);
        // Create workbook
        const workbook = XLSX.utils.book_new();
        // Add each sheet
        for (const sheet of sheets) {
            const sanitizedSheetData = sheet.data.map((row) => this.sanitizeRow(row));
            const worksheet = XLSX.utils.json_to_sheet(sanitizedSheetData);
            // Auto-size columns
            const maxWidth = 50;
            const colWidths = Object.keys(sheet.data[0] || {}).map((key) => {
                const maxLength = Math.max(key.length, ...sanitizedSheetData.map((row) => String(row[key] || '').length));
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
    deleteExport(filepath) {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
    /**
     * Clean up old export files (older than 1 hour)
     */
    cleanupOldExports() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        fs.readdir(this.exportDir, (err, files) => {
            if (err)
                return;
            files.forEach((file) => {
                const filepath = path.join(this.exportDir, file);
                fs.stat(filepath, (err, stats) => {
                    if (err)
                        return;
                    if (stats.mtimeMs < oneHourAgo) {
                        fs.unlink(filepath, () => { });
                    }
                });
            });
        });
    }
    sanitizeFilename(input, fallback) {
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
    sanitizeRow(row) {
        const sanitized = {};
        for (const [key, value] of Object.entries(row)) {
            sanitized[key] = this.sanitizeSpreadsheetValue(value);
        }
        return sanitized;
    }
    sanitizeSpreadsheetValue(value) {
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
exports.ExportService = ExportService;
exports.default = ExportService;
//# sourceMappingURL=exportService.js.map