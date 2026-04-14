import { ExportService } from '@services/exportService';

describe('ExportService', () => {
  const exportService = new ExportService();

  it('sanitizes filenames to prevent path traversal', async () => {
    const file = await exportService.exportDonationAnalytics(
      [
        {
          donation_date: '2024-01-01',
          donor_name: 'Safe Donor',
          amount: 10,
          payment_method: 'card',
          campaign: 'Campaign',
          notes: 'Notes',
        },
      ],
      {
        format: 'csv',
        filename: '../../../../../etc/passwd',
      }
    );

    expect(file.filename).toBe('passwd.csv');
    expect(file.filename.includes('..')).toBe(false);
  });

  it('prefixes dangerous spreadsheet values to prevent formula injection', async () => {
    const file = await exportService.exportDonationAnalytics(
      [
        {
          donation_date: '2024-01-01',
          donor_name: '=2+2',
          amount: 10,
          payment_method: 'card',
          campaign: '+SUM(A1:A2)',
          notes: '@cmd',
        },
      ],
      {
        format: 'csv',
        filename: 'csv-injection-test',
      }
    );

    const contents = file.buffer.toString('utf8');
    expect(contents).toContain("'=2+2");
    expect(contents).toContain("'+SUM(A1:A2)");
    expect(contents).toContain("'@cmd");
  });
});
