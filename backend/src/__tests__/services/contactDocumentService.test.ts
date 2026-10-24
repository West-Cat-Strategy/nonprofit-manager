const mockQuery = jest.fn();
const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/fileStorageService', () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
  getFullPath: jest.fn((p) => `/mock/path/${p}`),
  fileExists: jest.fn().mockResolvedValue(true),
}));

import { createDocument } from '../../services/contactDocumentService';

describe('contactDocumentService - createDocument', () => {
  const contactId = 'contact-123';
  const userId = 'user-456';
  const dummyFile = {
    buffer: Buffer.from('test file content'),
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 17,
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when file object is missing or invalid', async () => {
    await expect(
      createDocument(contactId, null as any, {}, userId)
    ).rejects.toThrow('Valid file payload is required');
  });

  it('rejects when contact does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // contactCheck returns 0 rows

    await expect(
      createDocument(contactId, dummyFile, {}, userId)
    ).rejects.toThrow('Contact not found');

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('rejects when case does not belong to contact', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: contactId }] }) // contact found
      .mockResolvedValueOnce({ rows: [] }); // caseCheck returns 0 rows

    await expect(
      createDocument(contactId, dummyFile, { case_id: 'case-999' }, userId)
    ).rejects.toThrow('Case not found or does not belong to this contact');

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('rolls back uploaded file when database INSERT fails', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: contactId }] }) // contact found
      .mockRejectedValueOnce(new Error('DB connection lost')); // INSERT fails

    mockUploadFile.mockResolvedValueOnce({
      fileName: 'unique-test.pdf',
      filePath: 'documents/contact-123/unique-test.pdf',
      fileSize: 17,
    });
    mockDeleteFile.mockResolvedValueOnce(undefined);

    await expect(
      createDocument(contactId, dummyFile, {}, userId)
    ).rejects.toThrow('Failed to upload document');

    expect(mockUploadFile).toHaveBeenCalledWith(dummyFile, 'documents/contact-123');
    expect(mockDeleteFile).toHaveBeenCalledWith('documents/contact-123/unique-test.pdf');
  });

  it('creates document and returns record on success', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: contactId }] }) // contact found
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'doc-1',
            contact_id: contactId,
            file_name: 'unique-test.pdf',
            original_name: 'test.pdf',
            file_path: 'documents/contact-123/unique-test.pdf',
          },
        ],
      });

    mockUploadFile.mockResolvedValueOnce({
      fileName: 'unique-test.pdf',
      filePath: 'documents/contact-123/unique-test.pdf',
      fileSize: 17,
    });

    const result = await createDocument(
      contactId,
      dummyFile,
      { title: 'My Doc', document_type: 'id_proof' },
      userId
    );

    expect(result.id).toBe('doc-1');
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });
});
