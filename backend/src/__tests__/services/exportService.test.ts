import fs from 'fs';
import path from 'path';
import { ExportService } from '../../services/exportService';

describe('ExportService', () => {
  const exportService = new ExportService();

  const cleanupFile = (filepath: string) => {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  };

  it('sanitizes filenames to prevent path traversal', async () => {
    const filepath = await exportService.exportDonationAnalytics(
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

    try {
      expect(path.basename(filepath)).toBe('passwd.csv');
      expect(filepath.includes('..')).toBe(false);
    } finally {
      cleanupFile(filepath);
    }
  });

  it('prefixes dangerous spreadsheet values to prevent formula injection', async () => {
    const filepath = await exportService.exportDonationAnalytics(
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

    try {
      const contents = fs.readFileSync(filepath, 'utf8');
      expect(contents).toContain("'=2+2");
      expect(contents).toContain("'+SUM(A1:A2)");
      expect(contents).toContain("'@cmd");
    } finally {
      cleanupFile(filepath);
    }
  });
});
