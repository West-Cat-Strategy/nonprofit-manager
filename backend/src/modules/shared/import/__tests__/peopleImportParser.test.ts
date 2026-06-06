import ExcelJS from 'exceljs';
import {
  parsePeopleImportFile,
  PEOPLE_IMPORT_LIMITS,
} from '../peopleImportParser';

const makeFile = (
  originalname: string,
  mimetype: string,
  buffer: Buffer
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer,
    size: buffer.length,
  }) as Express.Multer.File;

const makeCsvFile = (csv: string): Express.Multer.File =>
  makeFile('contacts.csv', 'text/csv', Buffer.from(csv, 'utf8'));

const expectValidationError = async (
  promise: Promise<unknown>,
  message: RegExp
): Promise<void> => {
  await expect(promise).rejects.toMatchObject({
    code: 'validation_error',
    statusCode: 400,
    message: expect.stringMatching(message),
  });
};

const makeFakeZipWithExpandedSize = (expandedSize: number): Buffer => {
  const fileName = Buffer.from('xl/worksheets/sheet1.xml', 'utf8');
  const centralDirectory = Buffer.alloc(46 + fileName.length);
  centralDirectory.writeUInt32LE(0x02014b50, 0);
  centralDirectory.writeUInt32LE(expandedSize, 24);
  centralDirectory.writeUInt16LE(fileName.length, 28);
  fileName.copy(centralDirectory, 46);

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(1, 8);
  endOfCentralDirectory.writeUInt16LE(1, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(0, 16);

  return Buffer.concat([centralDirectory, endOfCentralDirectory]);
};

describe('parsePeopleImportFile import safety budgets', () => {
  it('accepts a small contacts CSV', async () => {
    const parsed = await parsePeopleImportFile(
      makeCsvFile('First Name,Last Name,Email\nJane,Doe,jane@example.org\n'),
      'contacts'
    );

    expect(parsed.format).toBe('csv');
    expect(parsed.rows).toEqual([
      expect.objectContaining({
        'First Name': 'Jane',
        'Last Name': 'Doe',
        Email: 'jane@example.org',
      }),
    ]);
  });

  it('rejects CSV imports over the row budget before preview parsing', async () => {
    const rows = Array.from(
      { length: PEOPLE_IMPORT_LIMITS.maxRows + 1 },
      (_, index) => `Jane${index},Doe,jane${index}@example.org`
    );

    await expectValidationError(
      parsePeopleImportFile(makeCsvFile(`First Name,Last Name,Email\n${rows.join('\n')}`), 'contacts'),
      /data rows/
    );
  });

  it('rejects CSV imports over the column budget', async () => {
    const headers = Array.from({ length: PEOPLE_IMPORT_LIMITS.maxColumns + 1 }, (_, index) => `Column ${index}`);
    const values = headers.map((_, index) => `value-${index}`);

    await expectValidationError(
      parsePeopleImportFile(makeCsvFile(`${headers.join(',')}\n${values.join(',')}`), 'contacts'),
      /columns/
    );
  });

  it('rejects CSV imports over the total cell budget', async () => {
    const headers = Array.from({ length: PEOPLE_IMPORT_LIMITS.maxColumns }, (_, index) => `Column ${index}`);
    const dataRows = Array.from(
      { length: Math.floor(PEOPLE_IMPORT_LIMITS.maxCells / PEOPLE_IMPORT_LIMITS.maxColumns) + 1 },
      () => headers.map((_, index) => `value-${index}`).join(',')
    );

    await expectValidationError(
      parsePeopleImportFile(makeCsvFile(`${headers.join(',')}\n${dataRows.join('\n')}`), 'contacts'),
      /cells/
    );
  });

  it('rejects CSV imports with oversized cell values', async () => {
    await expectValidationError(
      parsePeopleImportFile(
        makeCsvFile(`First Name,Last Name,Notes\nJane,Doe,${'x'.repeat(PEOPLE_IMPORT_LIMITS.maxCellLength + 1)}`),
        'contacts'
      ),
      /cell values/
    );
  });

  it('rejects XLSX imports with too many worksheets', async () => {
    const workbook = new ExcelJS.Workbook();
    Array.from({ length: PEOPLE_IMPORT_LIMITS.maxXlsxWorksheets + 1 }, (_, index) => {
      const sheet = workbook.addWorksheet(`Sheet ${index}`);
      sheet.addRow(['First Name', 'Last Name', 'Email']);
      sheet.addRow(['Jane', 'Doe', 'jane@example.org']);
      return sheet;
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await expectValidationError(
      parsePeopleImportFile(
        makeFile(
          'contacts.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer
        ),
        'contacts'
      ),
      /worksheets/
    );
  });

  it('rejects XLSX archives whose central directory advertises an oversized expansion', async () => {
    await expectValidationError(
      parsePeopleImportFile(
        makeFile(
          'contacts.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          makeFakeZipWithExpandedSize(PEOPLE_IMPORT_LIMITS.maxXlsxExpandedBytes + 1)
        ),
        'contacts'
      ),
      /Expanded XLSX/
    );
  });

  it('rejects XLSX imports over worksheet column bounds before row conversion', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('People');
    sheet.addRow(
      Array.from({ length: PEOPLE_IMPORT_LIMITS.maxColumns + 1 }, (_, index) => `Column ${index}`)
    );
    sheet.addRow(
      Array.from({ length: PEOPLE_IMPORT_LIMITS.maxColumns + 1 }, (_, index) => `value-${index}`)
    );

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await expectValidationError(
      parsePeopleImportFile(
        makeFile(
          'contacts.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer
        ),
        'contacts'
      ),
      /columns/
    );
  });
});
