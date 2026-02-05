import ExcelJS from 'exceljs';
import { parseCsvToDataset } from '../parsers/csv';
import { parseExcelToDatasets } from '../parsers/excel';
import { parseSqlToDatasets } from '../parsers/sql';
import { suggestSchemaMatches } from '../matcher';
import { schemaRegistry } from '../schemaRegistry';

describe('ingest robustness', () => {
  test('CSV parser handles quoted newlines and escaped quotes', () => {
    const csv = `Name,Notes\n"Jane Doe","Line 1\nLine 2 with ""quotes"""`;
    const ds = parseCsvToDataset(csv, { name: 'multiline.csv' });

    expect(ds.rowCount).toBe(1);
    expect(ds.sampleRows[0].Notes).toContain('Line 2 with "quotes"');
  });

  test('CSV parser auto-detects tab delimiter', () => {
    const tsv = `First\tLast\tEmail\nJane\tDoe\tjane@example.org\n`;
    const ds = parseCsvToDataset(tsv, { name: 'people.tsv', delimiter: 'auto' });
    expect(ds.columnNames).toEqual(['First', 'Last', 'Email']);
    expect(ds.meta?.delimiter).toBe('\\t');
  });

  test('SQL parser maps INSERT without column list using CREATE TABLE', () => {
    const sql = `
      CREATE TABLE donors (id uuid, email text, amount numeric);
      INSERT INTO donors VALUES ('11111111-1111-4111-8111-111111111111','jane@example.org','25.00');
    `;
    const datasets = parseSqlToDatasets(sql, { name: 'no-cols.sql' });
    const insert = datasets.find((d) => d.name.includes(':INSERT:donors'));
    expect(insert?.columnNames).toEqual(['id', 'email', 'amount']);
    expect(insert?.sampleRows[0].email).toBe('jane@example.org');
  });

  test('Excel parser still profiles columns', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('People');

    // Add header row
    sheet.addRow(['First Name', 'Last Name', 'Email']);
    // Add data row
    sheet.addRow(['Jane', 'Doe', 'jane@example.org']);

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;

    const datasets = await parseExcelToDatasets(buffer, { name: 'people.xlsx' });
    expect(datasets[0].columns.find((c) => c.name === 'Email')?.inferredType).toBe('email');
  });
});

describe('matcher intelligence', () => {
  test('prefers donations when amount + donation_date are present', () => {
    const csv = `Donor Email,Amount,Donation Date\njane@example.org,$25.00,2026-01-01\n`;
    const ds = parseCsvToDataset(csv, { name: 'donations.csv' });
    const suggestion = suggestSchemaMatches(ds, schemaRegistry);

    expect(suggestion.bestTable?.table).toBe('donations');
    expect(Object.values(suggestion.bestTable?.suggestedMapping ?? {})).toContain('donations.amount');
  });

  test('identifier uniqueness helps match *_id fields', () => {
    const csv = `Contact ID,First Name,Last Name\n11111111-1111-4111-8111-111111111111,Jane,Doe\n22222222-2222-4222-8222-222222222222,John,Smith\n`;
    const ds = parseCsvToDataset(csv, { name: 'contacts.csv' });
    const suggestion = suggestSchemaMatches(ds, schemaRegistry);

    expect(suggestion.bestTable?.table).toBe('contacts');
    expect(Object.values(suggestion.bestTable?.suggestedMapping ?? {})).toContain('contacts.contact_id');
  });
});
