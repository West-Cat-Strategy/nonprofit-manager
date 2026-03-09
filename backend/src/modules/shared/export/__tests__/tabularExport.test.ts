import ExcelJS from 'exceljs';
import {
  buildTabularExport,
  normalizeTabularExportFormat,
  sanitizeExportFilename,
} from '../tabularExport';

describe('tabularExport', () => {
  it('sanitizes filenames and strips path traversal content', () => {
    expect(sanitizeExportFilename('../../evil/report.xlsx', 'fallback')).toBe('report');
  });

  it('normalizes excel aliases to xlsx', () => {
    expect(normalizeTabularExportFormat('excel')).toBe('xlsx');
    expect(normalizeTabularExportFormat('xslx')).toBe('xlsx');
  });

  it('escapes csv values and blocks spreadsheet formulas', async () => {
    const file = await buildTabularExport({
      format: 'csv',
      fallbackBaseName: 'contacts-export',
      sheets: [
        {
          name: 'Contacts',
          columns: [
            { key: 'name', header: 'name' },
            { key: 'notes', header: 'notes' },
          ],
          rows: [
            {
              name: '=cmd',
              notes: 'He said "hello",\nteam',
            },
          ],
        },
      ],
    });

    const csv = file.buffer.toString('utf8');
    expect(file.filename).toBe('contacts-export.csv');
    expect(csv).toContain("'=cmd");
    expect(csv).toContain('"He said ""hello"",\nteam"');
  });

  it('generates xlsx workbooks with the expected headers and values', async () => {
    const file = await buildTabularExport({
      format: 'xlsx',
      fallbackBaseName: 'volunteers-export',
      sheets: [
        {
          name: 'Volunteers',
          columns: [
            { key: 'email', header: 'email' },
            { key: 'skills', header: 'skills' },
          ],
          rows: [
            {
              email: 'volunteer@example.com',
              skills: ['First Aid', 'Driving'],
            },
          ],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.getWorksheet('Volunteers');

    expect(file.filename).toBe('volunteers-export.xlsx');
    expect(worksheet?.getCell('A1').value).toBe('email');
    expect(worksheet?.getCell('B1').value).toBe('skills');
    expect(worksheet?.getCell('A2').value).toBe('volunteer@example.com');
    expect(worksheet?.getCell('B2').value).toBe('First Aid; Driving');
  });
});
