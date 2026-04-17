import type { Response } from 'express';
import { createContactDocumentsController } from '../documents.controller';
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
    setHeader: jest.fn(),
    sendFile: jest.fn(),
  }) as unknown as Response;

describe('contact documents controller', () => {
  const useCase = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    resolveFilePath: jest.fn(),
  };

  const directoryUseCase = {
    getById: jest.fn(),
  };

  const controller = createContactDocumentsController(
    useCase as any,
    directoryUseCase as any
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when a scoped contact is missing', async () => {
    directoryUseCase.getById.mockResolvedValueOnce(null);

    const req = {
      params: { contactId: 'contact-1' },
      dataScope: { filter: { accountIds: ['account-1'] } },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.getContactDocuments(req, res, next);

    expect(directoryUseCase.getById).toHaveBeenCalledWith('contact-1', {
      accountIds: ['account-1'],
    });
    expect(mockSendFailure).toHaveBeenCalledWith(res, 'NOT_FOUND', 'Contact not found', 404);
    expect(useCase.list).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('parses boolean upload fields before calling the use case', async () => {
    const file = {
      originalname: 'support-letter.pdf',
      mimetype: 'application/pdf',
      size: 1234,
    } as Express.Multer.File;

    useCase.create.mockResolvedValueOnce({ id: 'doc-1' });

    const req = {
      params: { contactId: 'contact-1' },
      user: { id: 'user-1' },
      file,
      body: {
        case_id: 'case-1',
        document_type: 'other',
        title: 'Support letter',
        description: 'Intake proof',
        is_portal_visible: 'yes',
      },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.uploadDocument(req, res, next);

    expect(useCase.create).toHaveBeenCalledWith(
      'contact-1',
      file,
      {
        case_id: 'case-1',
        document_type: 'other',
        title: 'Support letter',
        description: 'Intake proof',
        is_portal_visible: true,
      },
      'user-1'
    );
    expect(mockSendData).toHaveBeenCalledWith(res, { id: 'doc-1' }, 201);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when a download target is missing on disk', async () => {
    useCase.getById.mockResolvedValueOnce({
      id: 'doc-1',
      is_active: true,
      mime_type: 'application/pdf',
      original_name: 'visible.pdf',
      file_size: 18,
    });
    useCase.resolveFilePath.mockResolvedValueOnce(null);

    const req = {
      params: { documentId: 'doc-1' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    await controller.downloadDocument(req, res, next);

    expect(useCase.getById).toHaveBeenCalledWith('doc-1', undefined);
    expect(mockSendFailure).toHaveBeenCalledWith(
      res,
      'NOT_FOUND',
      'Document file not found',
      404
    );
    expect(next).not.toHaveBeenCalled();
  });
});
