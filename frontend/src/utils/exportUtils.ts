/**
 * Export Utilities
 * Functions for exporting data to various formats (CSV, PDF)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Convert an array of objects to CSV format
 */
export function convertToCSV<T>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return '';

  // Create header row
  const headers = columns.map((col) => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key] as unknown;
        if (value === null || value === undefined) return '""';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (value instanceof Date) return `"${value.toISOString()}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [headers, ...rows].join('\n');
}

/**
 * Download data as a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export analytics summary to CSV
 */
export interface AnalyticsSummaryExport {
  metric: string;
  value: string | number;
  category: string;
}

export function exportAnalyticsSummaryToCSV(summary: {
  total_accounts: number;
  active_accounts: number;
  total_contacts: number;
  active_contacts: number;
  total_donations_ytd: number;
  donation_count_ytd: number;
  average_donation_ytd: number;
  total_events_ytd: number;
  total_volunteers: number;
  total_volunteer_hours_ytd: number;
  engagement_distribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
}): void {
  const data: AnalyticsSummaryExport[] = [
    { metric: 'Total Accounts', value: summary.total_accounts, category: 'Constituents' },
    { metric: 'Active Accounts', value: summary.active_accounts, category: 'Constituents' },
    { metric: 'Total Contacts', value: summary.total_contacts, category: 'Constituents' },
    { metric: 'Active Contacts', value: summary.active_contacts, category: 'Constituents' },
    { metric: 'Total Volunteers', value: summary.total_volunteers, category: 'Constituents' },
    { metric: 'Total Donations (YTD)', value: `$${summary.total_donations_ytd.toFixed(2)}`, category: 'Donations' },
    { metric: 'Donation Count (YTD)', value: summary.donation_count_ytd, category: 'Donations' },
    { metric: 'Average Donation (YTD)', value: `$${summary.average_donation_ytd.toFixed(2)}`, category: 'Donations' },
    { metric: 'Total Events (YTD)', value: summary.total_events_ytd, category: 'Events' },
    { metric: 'Volunteer Hours (YTD)', value: summary.total_volunteer_hours_ytd, category: 'Volunteers' },
    { metric: 'High Engagement', value: summary.engagement_distribution.high, category: 'Engagement' },
    { metric: 'Medium Engagement', value: summary.engagement_distribution.medium, category: 'Engagement' },
    { metric: 'Low Engagement', value: summary.engagement_distribution.low, category: 'Engagement' },
    { metric: 'Inactive', value: summary.engagement_distribution.inactive, category: 'Engagement' },
  ];

  const columns: { key: keyof AnalyticsSummaryExport; header: string }[] = [
    { key: 'category', header: 'Category' },
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
  ];

  const csv = convertToCSV(data, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `analytics-summary-${date}`);
}

/**
 * Export engagement distribution to CSV
 */
export function exportEngagementToCSV(distribution: {
  high: number;
  medium: number;
  low: number;
  inactive: number;
}): void {
  const total = distribution.high + distribution.medium + distribution.low + distribution.inactive;

  const data = [
    {
      level: 'High',
      count: distribution.high,
      percentage: total > 0 ? ((distribution.high / total) * 100).toFixed(1) : '0',
    },
    {
      level: 'Medium',
      count: distribution.medium,
      percentage: total > 0 ? ((distribution.medium / total) * 100).toFixed(1) : '0',
    },
    {
      level: 'Low',
      count: distribution.low,
      percentage: total > 0 ? ((distribution.low / total) * 100).toFixed(1) : '0',
    },
    {
      level: 'Inactive',
      count: distribution.inactive,
      percentage: total > 0 ? ((distribution.inactive / total) * 100).toFixed(1) : '0',
    },
  ];

  const columns: { key: keyof (typeof data)[0]; header: string }[] = [
    { key: 'level', header: 'Engagement Level' },
    { key: 'count', header: 'Count' },
    { key: 'percentage', header: 'Percentage (%)' },
  ];

  const csv = convertToCSV(data, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `engagement-distribution-${date}`);
}

/**
 * Export constituent overview to CSV
 */
export function exportConstituentOverviewToCSV(data: {
  accounts: { total: number; active: number };
  contacts: { total: number; active: number };
  volunteers: number;
  volunteerHours: number;
}): void {
  const exportData = [
    {
      type: 'Accounts',
      total: data.accounts.total,
      active: data.accounts.active,
      activePercentage:
        data.accounts.total > 0 ? ((data.accounts.active / data.accounts.total) * 100).toFixed(1) : '0',
    },
    {
      type: 'Contacts',
      total: data.contacts.total,
      active: data.contacts.active,
      activePercentage:
        data.contacts.total > 0 ? ((data.contacts.active / data.contacts.total) * 100).toFixed(1) : '0',
    },
    {
      type: 'Volunteers',
      total: data.volunteers,
      active: data.volunteers,
      activePercentage: '100',
    },
  ];

  const columns: { key: keyof (typeof exportData)[0]; header: string }[] = [
    { key: 'type', header: 'Constituent Type' },
    { key: 'total', header: 'Total' },
    { key: 'active', header: 'Active' },
    { key: 'activePercentage', header: 'Active (%)' },
  ];

  const csv = convertToCSV(exportData, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `constituent-overview-${date}`);
}

/**
 * Format currency for PDF display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Export analytics summary to PDF
 */
export function exportAnalyticsSummaryToPDF(summary: {
  total_accounts: number;
  active_accounts: number;
  total_contacts: number;
  active_contacts: number;
  total_donations_ytd: number;
  donation_count_ytd: number;
  average_donation_ytd: number;
  total_events_ytd: number;
  total_volunteers: number;
  total_volunteer_hours_ytd: number;
  engagement_distribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
}): void {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Title
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55); // gray-800
  doc.text('Analytics Report', 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(`Generated: ${date}`, 14, 28);

  // Key Performance Indicators Section
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text('Key Performance Indicators', 14, 42);

  const kpiData = [
    ['Total Donations (YTD)', formatCurrency(summary.total_donations_ytd)],
    ['Number of Donations', String(summary.donation_count_ytd)],
    ['Average Donation', formatCurrency(summary.average_donation_ytd)],
    ['Total Events (YTD)', String(summary.total_events_ytd)],
    ['Volunteer Hours (YTD)', String(summary.total_volunteer_hours_ytd)],
  ];

  autoTable(doc, {
    startY: 46,
    head: [['Metric', 'Value']],
    body: kpiData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: 'right' },
    },
  });

  // Constituent Overview Section
  const constituentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Constituent Overview', 14, constituentY);

  const constituentData = [
    [
      'Accounts',
      String(summary.total_accounts),
      String(summary.active_accounts),
      `${summary.total_accounts > 0 ? ((summary.active_accounts / summary.total_accounts) * 100).toFixed(1) : 0}%`,
    ],
    [
      'Contacts',
      String(summary.total_contacts),
      String(summary.active_contacts),
      `${summary.total_contacts > 0 ? ((summary.active_contacts / summary.total_contacts) * 100).toFixed(1) : 0}%`,
    ],
    ['Volunteers', String(summary.total_volunteers), String(summary.total_volunteers), '100%'],
  ];

  autoTable(doc, {
    startY: constituentY + 4,
    head: [['Type', 'Total', 'Active', 'Active %']],
    body: constituentData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Engagement Distribution Section
  const engagementY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Engagement Distribution', 14, engagementY);

  const totalEngagement =
    summary.engagement_distribution.high +
    summary.engagement_distribution.medium +
    summary.engagement_distribution.low +
    summary.engagement_distribution.inactive;

  const engagementData = [
    [
      'High',
      String(summary.engagement_distribution.high),
      `${totalEngagement > 0 ? ((summary.engagement_distribution.high / totalEngagement) * 100).toFixed(1) : 0}%`,
    ],
    [
      'Medium',
      String(summary.engagement_distribution.medium),
      `${totalEngagement > 0 ? ((summary.engagement_distribution.medium / totalEngagement) * 100).toFixed(1) : 0}%`,
    ],
    [
      'Low',
      String(summary.engagement_distribution.low),
      `${totalEngagement > 0 ? ((summary.engagement_distribution.low / totalEngagement) * 100).toFixed(1) : 0}%`,
    ],
    [
      'Inactive',
      String(summary.engagement_distribution.inactive),
      `${totalEngagement > 0 ? ((summary.engagement_distribution.inactive / totalEngagement) * 100).toFixed(1) : 0}%`,
    ],
  ];

  autoTable(doc, {
    startY: engagementY + 4,
    head: [['Engagement Level', 'Count', 'Percentage']],
    body: engagementData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text('Nonprofit Manager - Analytics Report', 14, pageHeight - 10);
  doc.text(`Page 1 of 1`, doc.internal.pageSize.width - 30, pageHeight - 10);

  // Save the PDF
  const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Export donation trends to PDF
 */
export function exportDonationTrendsToPDF(
  trends: Array<{ month: string; amount: number; count: number }>
): void {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Title
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55);
  doc.text('Donation Trends Report', 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${date}`, 14, 28);

  // Summary stats
  const totalAmount = trends.reduce((sum, t) => sum + t.amount, 0);
  const totalCount = trends.reduce((sum, t) => sum + t.count, 0);
  const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(`Period: ${trends.length} months`, 14, 40);
  doc.text(`Total Donations: ${formatCurrency(totalAmount)}`, 14, 48);
  doc.text(`Total Count: ${totalCount}`, 14, 56);
  doc.text(`Average per Donation: ${formatCurrency(avgAmount)}`, 14, 64);

  // Monthly data table
  doc.setFontSize(14);
  doc.text('Monthly Breakdown', 14, 78);

  const tableData = trends.map((t) => [t.month, formatCurrency(t.amount), String(t.count)]);

  autoTable(doc, {
    startY: 82,
    head: [['Month', 'Amount', 'Count']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] }, // green-500
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Nonprofit Manager - Donation Trends Report', 14, pageHeight - 10);

  const filename = `donation-trends-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Export volunteer hours trends to PDF
 */
export function exportVolunteerTrendsToPDF(
  trends: Array<{ month: string; hours: number; assignments: number }>
): void {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Title
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55);
  doc.text('Volunteer Hours Report', 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${date}`, 14, 28);

  // Summary stats
  const totalHours = trends.reduce((sum, t) => sum + t.hours, 0);
  const totalAssignments = trends.reduce((sum, t) => sum + t.assignments, 0);
  const avgHoursPerAssignment = totalAssignments > 0 ? totalHours / totalAssignments : 0;

  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(`Period: ${trends.length} months`, 14, 40);
  doc.text(`Total Hours: ${totalHours.toFixed(1)}`, 14, 48);
  doc.text(`Total Assignments: ${totalAssignments}`, 14, 56);
  doc.text(`Average Hours per Assignment: ${avgHoursPerAssignment.toFixed(1)}`, 14, 64);

  // Monthly data table
  doc.setFontSize(14);
  doc.text('Monthly Breakdown', 14, 78);

  const tableData = trends.map((t) => [t.month, String(t.hours), String(t.assignments)]);

  autoTable(doc, {
    startY: 82,
    head: [['Month', 'Hours', 'Assignments']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }, // blue-500
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Nonprofit Manager - Volunteer Hours Report', 14, pageHeight - 10);

  const filename = `volunteer-hours-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
