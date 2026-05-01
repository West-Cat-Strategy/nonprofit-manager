import type { Response } from 'express';
import { createContactSuppressionsController } from '../suppressions.controller';
import { sendData, sendFailure } from '../../mappers/responseMode';

jest.mock('../../mappers/responseMode', () => ({
  sendData: jest.fn(),
  sendFailure: jest.fn(),
}));

const mockSendData = sendData as jest.MockedFunction<typeof sendData>;
const mockSendFailure = sendFailure as jest.MockedFunction<typeof sendFailure>;

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('contact suppressions controller', () => {
  const directoryUseCase = {
    getById: jest.fn(),
  };
  const suppressionService = {
    list: jest.fn(),
    upsertStaffSuppression: jest.fn(),
  };

  const controller = createContactSuppressionsController(
    directoryUseCase as any,
    suppressionService as any
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when listing suppressions for an inaccessible contact', async () => {
    directoryUseCase.getById.mockResolvedValueOnce(null);

    const req = {
      params: { id: 'contact-1' },
      dataScope: { filter: { accountIds: ['account-1'] } },
      user: { role: 'staff' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.listActiveSuppressions(req, res, next);

    expect(directoryUseCase.getById).toHaveBeenCalledWith(
      'contact-1',
      { accountIds: ['account-1'] },
      'staff'
    );
    expect(mockSendFailure).toHaveBeenCalledWith(res, 'NOT_FOUND', 'Contact not found', 404);
    expect(suppressionService.list).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('lists active suppressions for an accessible contact', async () => {
    directoryUseCase.getById.mockResolvedValueOnce({
      contact_id: 'contact-1',
      account_id: 'account-1',
    });
    suppressionService.list.mockResolvedValueOnce({
      items: [{ id: 'suppression-1' }],
      total: 1,
      fatiguePolicy: null,
    });

    const req = {
      params: { id: 'contact-1' },
      user: { role: 'staff' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.listActiveSuppressions(req, res, next);

    expect(suppressionService.list).toHaveBeenCalledWith('contact-1');
    expect(mockSendData).toHaveBeenCalledWith(res, {
      items: [{ id: 'suppression-1' }],
      total: 1,
      fatiguePolicy: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('creates or updates staff DNC evidence for an accessible contact', async () => {
    directoryUseCase.getById.mockResolvedValueOnce({
      contact_id: 'contact-1',
      account_id: 'account-1',
    });
    suppressionService.upsertStaffSuppression.mockResolvedValueOnce({ id: 'suppression-1' });

    const req = {
      params: { id: 'contact-1' },
      validatedBody: {
        channel: 'email',
        evidence_summary: 'Asked staff to stop email.',
      },
      user: { id: 'user-1', role: 'staff' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.upsertStaffSuppression(req, res, next);

    expect(suppressionService.upsertStaffSuppression).toHaveBeenCalledWith(
      'contact-1',
      {
        channel: 'email',
        evidence_summary: 'Asked staff to stop email.',
      },
      'user-1'
    );
    expect(mockSendData).toHaveBeenCalledWith(res, { id: 'suppression-1' }, 201);
    expect(next).not.toHaveBeenCalled();
  });
});
