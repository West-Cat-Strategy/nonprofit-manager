import type { Response } from 'express';
import { createContactNotesController } from '../notes.controller';
import { requirePermissionSafe, sendForbidden, sendUnauthorized } from '@services/authGuardService';
import { sendData, sendFailure } from '../../mappers/responseMode';

jest.mock('@services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

jest.mock('../../mappers/responseMode', () => ({
  sendData: jest.fn(),
  sendFailure: jest.fn(),
}));

const mockRequirePermissionSafe = requirePermissionSafe as jest.MockedFunction<
  typeof requirePermissionSafe
>;
const mockSendForbidden = sendForbidden as jest.MockedFunction<typeof sendForbidden>;
const mockSendUnauthorized = sendUnauthorized as jest.MockedFunction<typeof sendUnauthorized>;
const mockSendData = sendData as jest.MockedFunction<typeof sendData>;
const mockSendFailure = sendFailure as jest.MockedFunction<typeof sendFailure>;

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('contact notes controller', () => {
  const useCase = {
    list: jest.fn(),
    listTimeline: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const controller = createContactNotesController(useCase as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequirePermissionSafe.mockReturnValue({ ok: true, data: { user: { id: 'user-1' } } } as never);
  });

  it('blocks create when outcome tagging permission is missing', async () => {
    mockRequirePermissionSafe.mockReturnValue({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Denied',
        statusCode: 403,
      },
    } as never);

    const req = {
      user: { id: 'user-1' },
      params: { contactId: 'contact-1' },
      body: {
        content: 'Documented interaction',
        case_id: 'case-1',
        outcome_impacts: [{ outcomeDefinitionId: 'outcome-1' }],
      },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.createContactNote(req, res, next);

    expect(mockRequirePermissionSafe).toHaveBeenCalled();
    expect(mockSendForbidden).toHaveBeenCalledWith(res, 'Denied');
    expect(useCase.create).not.toHaveBeenCalled();
    expect(mockSendData).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks update when outcome tagging permission guard returns unauthorized', async () => {
    mockRequirePermissionSafe.mockReturnValue({
      ok: false,
      error: {
        code: 'unauthorized',
        message: 'No session',
        statusCode: 401,
      },
    } as never);

    const req = {
      params: { noteId: 'note-1' },
      body: {
        outcomes_mode: 'replace',
      },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.updateContactNote(req, res, next);

    expect(mockSendUnauthorized).toHaveBeenCalledWith(res, 'No session');
    expect(useCase.update).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('creates notes without outcome payload when the user is authenticated', async () => {
    useCase.create.mockResolvedValueOnce({ id: 'note-1', content: 'Saved note' });

    const req = {
      user: { id: 'user-1' },
      params: { contactId: 'contact-1' },
      body: {
        content: 'Saved note',
      },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.createContactNote(req, res, next);

    expect(useCase.create).toHaveBeenCalledWith('contact-1', { content: 'Saved note' }, 'user-1');
    expect(mockSendData).toHaveBeenCalledWith(res, { id: 'note-1', content: 'Saved note' }, 201);
    expect(mockSendFailure).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns the mixed notes timeline response', async () => {
    useCase.listTimeline.mockResolvedValueOnce({
      items: [],
      counts: {
        all: 0,
        contact_notes: 0,
        case_notes: 0,
        event_activity: 0,
      },
    });

    const req = {
      params: { contactId: 'contact-1' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.getContactNotesTimeline(req, res, next);

    expect(useCase.listTimeline).toHaveBeenCalledWith('contact-1');
    expect(mockSendData).toHaveBeenCalledWith(res, {
      items: [],
      counts: {
        all: 0,
        contact_notes: 0,
        case_notes: 0,
        event_activity: 0,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
