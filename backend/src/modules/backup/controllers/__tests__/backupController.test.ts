import { Response } from 'express';
import { services } from '@container/services';
import { exportBackup } from '../backupController';

jest.mock('@container/services', () => ({
  services: {
    backup: {
      createBackupFile: jest.fn(),
      deleteExport: jest.fn(),
    },
  },
}));

describe('exportBackup secret export gate', () => {
  const originalSecretExportEnabled = process.env.BACKUP_INCLUDE_SECRETS_ENABLED;
  const backupService = services.backup as unknown as {
    createBackupFile: jest.Mock;
    deleteExport: jest.Mock;
  };

  const buildResponse = (): Response =>
    ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      setHeader: jest.fn().mockReturnThis(),
      download: jest.fn(),
    }) as unknown as Response;

  beforeEach(() => {
    backupService.createBackupFile.mockReset();
    backupService.deleteExport.mockReset();
    delete process.env.BACKUP_INCLUDE_SECRETS_ENABLED;
  });

  afterAll(() => {
    if (originalSecretExportEnabled === undefined) {
      delete process.env.BACKUP_INCLUDE_SECRETS_ENABLED;
    } else {
      process.env.BACKUP_INCLUDE_SECRETS_ENABLED = originalSecretExportEnabled;
    }
  });

  it('rejects include_secrets when the environment gate is disabled', async () => {
    const res = buildResponse();
    const next = jest.fn();

    await exportBackup({ body: { include_secrets: true } } as never, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(backupService.createBackupFile).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects include_secrets when the exact confirmation phrase is missing', async () => {
    process.env.BACKUP_INCLUDE_SECRETS_ENABLED = 'true';
    const res = buildResponse();
    const next = jest.fn();

    await exportBackup(
      { body: { include_secrets: true, confirm_secrets_export: 'export_unredacted_backup' } } as never,
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(backupService.createBackupFile).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
