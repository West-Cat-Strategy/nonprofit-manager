import type { Response } from 'express';
import { createContactCommunicationsController } from '../communications.controller';
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

describe('contact communications controller', () => {
  const useCase = {
    list: jest.fn(),
  };
  const directoryUseCase = {
    getById: jest.fn(),
  };

  const controller = createContactCommunicationsController(
    useCase as any,
    directoryUseCase as any
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when the contact is out of scope or missing', async () => {
    directoryUseCase.getById.mockResolvedValueOnce(null);

    const req = {
      params: { id: 'contact-1' },
      dataScope: { filter: { accountIds: ['account-1'] } },
      user: { role: 'staff' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.getContactCommunications(req, res, next);

    expect(directoryUseCase.getById).toHaveBeenCalledWith(
      'contact-1',
      { accountIds: ['account-1'] },
      'staff'
    );
    expect(mockSendFailure).toHaveBeenCalledWith(res, 'NOT_FOUND', 'Contact not found', 404);
    expect(useCase.list).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns communications for an accessible contact', async () => {
    directoryUseCase.getById.mockResolvedValueOnce({ contact_id: 'contact-1' });
    useCase.list.mockResolvedValueOnce({
      items: [{ id: 'delivery-1', channel: 'email' }],
      total: 1,
      filters: { channel: 'email', limit: 25 },
    });

    const req = {
      params: { id: 'contact-1' },
      validatedQuery: {
        channel: 'email',
        limit: 25,
      },
      user: { role: 'staff' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.getContactCommunications(req, res, next);

    expect(useCase.list).toHaveBeenCalledWith('contact-1', {
      channel: 'email',
      source_type: undefined,
      delivery_status: undefined,
      limit: 25,
    });
    expect(mockSendData).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        total: 1,
        filters: { channel: 'email', limit: 25 },
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
