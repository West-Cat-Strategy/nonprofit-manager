/**
 * useImportExport Hook
 * Handles CSV import/export functionality
 */

import { useState, useCallback } from 'react';

interface ImportExportOptions {
  filename?: string;
  includeHeaders?: boolean;
}

interface UseImportExportReturn {
  exportToCSV: <T extends object>(
    data: T[],
    columns: readonly (keyof T)[],
    options?: ImportExportOptions
  ) => void;
  importFromCSV: (file: File) => Promise<Record<string, string>[]>;
  parseCSVContent: (content: string) => Record<string, string>[];
  isLoading: boolean;
  error: string | null;
}

export const useImportExport = (): UseImportExportReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToCSV = useCallback(
    <T extends object>(
      data: T[],
      columns: readonly (keyof T)[],
      options: ImportExportOptions = {}
    ) => {
      try {
        const { filename = 'export', includeHeaders = true } = options;

        // Build CSV content
        const csvContent: string[] = [];

        // Add headers if requested
        if (includeHeaders) {
          csvContent.push(columns.map((col) => String(col)).join(','));
        }

        // Add data rows
        data.forEach((row) => {
          const values = columns.map((col) => {
            const value = row[col];
            // Escape quotes and wrap in quotes if contains comma or quote
            if (
              value === null ||
              value === undefined
            ) {
              return '';
            }
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          csvContent.push(values.join(','));
        });

        // Create blob and download
        const csv = csvContent.join('\n');
        const blob = new Blob([csv], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `${filename}-${new Date().toISOString().split('T')[0]}.csv`
        );
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Export failed');
      }
    },
    []
  );

  const parseCSVContent = useCallback((content: string): Record<string, string>[] => {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return [];

    // Parse headers from first line
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }

    return rows;
  }, []);

  const importFromCSV = useCallback(
    async (file: File): Promise<Record<string, string>[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const text = await file.text();
        const data = parseCSVContent(text);
        return data;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to parse CSV';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [parseCSVContent]
  );

  return {
    exportToCSV,
    importFromCSV,
    parseCSVContent,
    isLoading,
    error,
  };
};

/**
 * Helper function to parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let isQuoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        isQuoted = !isQuoted;
      }
    } else if (char === ',' && !isQuoted) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
