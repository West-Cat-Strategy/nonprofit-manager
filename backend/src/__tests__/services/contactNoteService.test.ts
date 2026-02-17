// Mock database pool and logger before imports
const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  getContactNotes,
  getContactNoteById,
  createContactNote,
  updateContactNote,
  deleteContactNote,
  getNotesByCaseId,
} from '../../services/contactNoteService';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeNoteRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'note-uuid',
  contact_id: 'contact-1',
  case_id: null,
  note_type: 'note',
  subject: null,
  content: 'Follow up needed',
  is_internal: false,
  is_important: false,
  is_pinned: false,
  is_alert: false,
  attachments: null,
  created_by: 'user-1',
  created_by_first_name: 'Admin',
  created_by_last_name: 'User',
  case_number: null,
  case_title: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

// ─── getContactNotes ──────────────────────────────────────────────────────────

describe('getContactNotes', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns all notes for a contact', async () => {
    const rows = [makeNoteRow(), makeNoteRow({ id: 'note-2', is_pinned: true })];
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })  // count query
      .mockResolvedValueOnce({ rows });                     // data query

    const result = await getContactNotes('contact-1');
    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].id).toBe('note-uuid');
    expect(result.total).toBe(2);
  });

  it('passes the contactId as the query parameter', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await getContactNotes('contact-abc');

    const params = mockQuery.mock.calls[0][1];
    expect(params).toEqual(['contact-abc']);
  });

  it('returns an empty array when there are no notes', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getContactNotes('contact-no-notes');
    expect(result.notes).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('throws a user-friendly error on query failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(getContactNotes('contact-1')).rejects.toThrow('Failed to retrieve contact notes');
  });
});

// ─── getContactNoteById ───────────────────────────────────────────────────────

describe('getContactNoteById', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the note when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeNoteRow()] });

    const result = await getContactNoteById('note-uuid');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('note-uuid');
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getContactNoteById('nonexistent');
    expect(result).toBeNull();
  });

  it('scopes the query to the note ID', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getContactNoteById('note-xyz');
    expect(mockQuery.mock.calls[0][1]).toEqual(['note-xyz']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Timeout'));

    await expect(getContactNoteById('note-1')).rejects.toThrow('Failed to retrieve contact note');
  });
});

// ─── createContactNote ────────────────────────────────────────────────────────

describe('createContactNote', () => {
  beforeEach(() => mockQuery.mockReset());

  it('inserts a note and returns the created row', async () => {
    const row = makeNoteRow({ content: 'Needs follow up' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await createContactNote(
      'contact-1',
      { content: 'Needs follow up' },
      'user-1'
    );

    expect(result.content).toBe('Needs follow up');
  });

  it('includes contactId, userId in the INSERT params', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeNoteRow()] });

    await createContactNote('contact-abc', { content: 'Test' }, 'user-xyz');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe('contact-abc');  // contactId (first param)
    expect(params[10]).toBe('user-xyz');     // userId (11th param)
  });

  it('defaults note_type to "note" when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeNoteRow()] });

    await createContactNote('contact-1', { content: 'Default type' }, 'user-1');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe('note');  // note_type
  });

  it('defaults boolean flags to false when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeNoteRow()] });

    await createContactNote('contact-1', { content: 'No flags' }, 'user-1');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[5]).toBe(false);  // is_internal
    expect(params[6]).toBe(false);  // is_important
    expect(params[7]).toBe(false);  // is_pinned
    expect(params[8]).toBe(false);  // is_alert
  });

  it('serialises attachments to JSON when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeNoteRow()] });

    const attachments = [{ name: 'doc.pdf', url: 'https://example.com/doc.pdf' }];
    await createContactNote('contact-1', { content: 'With attachment', attachments }, 'user-1');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[9]).toBe(JSON.stringify(attachments));  // attachments
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Constraint violation'));

    await expect(
      createContactNote('contact-1', { content: 'Test' }, 'user-1')
    ).rejects.toThrow('Failed to create contact note');
  });
});

// ─── updateContactNote ────────────────────────────────────────────────────────

describe('updateContactNote', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the updated note on success', async () => {
    const row = makeNoteRow({ content: 'Updated content' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await updateContactNote('note-uuid', { content: 'Updated content' });
    expect(result).not.toBeNull();
    expect(result!.content).toBe('Updated content');
  });

  it('returns null when no row matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await updateContactNote('nonexistent', { content: 'New' });
    expect(result).toBeNull();
  });

  it('builds SET clause only for provided fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeNoteRow()] });

    await updateContactNote('note-1', { content: 'New content', is_pinned: true });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toMatch(/content/);
    expect(sql).toMatch(/is_pinned/);
    expect(sql).not.toMatch(/note_type/);
    expect(sql).not.toMatch(/subject/);
  });

  it('always appends updated_at = NOW() to SET clause', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeNoteRow()] });

    await updateContactNote('note-1', { content: 'Test' });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toMatch(/updated_at = NOW\(\)/);
  });

  it('throws when no fields are provided to update', async () => {
    await expect(updateContactNote('note-1', {})).rejects.toThrow('Failed to update contact note');
  });

  it('throws a user-friendly error on query failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Lock timeout'));

    await expect(updateContactNote('note-1', { content: 'New' })).rejects.toThrow(
      'Failed to update contact note'
    );
  });
});

// ─── deleteContactNote ────────────────────────────────────────────────────────

describe('deleteContactNote', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns true when the note was deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'note-uuid' }] });

    const result = await deleteContactNote('note-uuid');
    expect(result).toBe(true);
  });

  it('returns false when no note matched', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await deleteContactNote('nonexistent');
    expect(result).toBe(false);
  });

  it('passes the noteId as the query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'note-123' }] });

    await deleteContactNote('note-123');
    expect(mockQuery.mock.calls[0][1]).toEqual(['note-123']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('FK constraint'));

    await expect(deleteContactNote('note-1')).rejects.toThrow('Failed to delete contact note');
  });
});

// ─── getNotesByCaseId ─────────────────────────────────────────────────────────

describe('getNotesByCaseId', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns notes for a case', async () => {
    const rows = [
      makeNoteRow({ case_id: 'case-1' }),
      makeNoteRow({ id: 'note-2', case_id: 'case-1' }),
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getNotesByCaseId('case-1');
    expect(result).toHaveLength(2);
  });

  it('passes the caseId as the query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getNotesByCaseId('case-abc');
    expect(mockQuery.mock.calls[0][1]).toEqual(['case-abc']);
  });

  it('returns an empty array when no notes are linked to the case', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getNotesByCaseId('case-empty');
    expect(result).toHaveLength(0);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Timeout'));

    await expect(getNotesByCaseId('case-1')).rejects.toThrow('Failed to retrieve notes');
  });
});
