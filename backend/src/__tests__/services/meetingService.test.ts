import pool from '@config/database';
import { logger } from '@config/logger';
import {
  addAgendaItem,
  addMotion,
  createActionItem,
  createMeeting,
  generateMinutesDraft,
  getMeetingDetail,
  listMeetings,
  reorderAgendaItems,
  updateMeeting,
  updateMotion,
} from '@services/meetingService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('meetingService.reorderAgendaItems', () => {
  const queryMock = pool.query as jest.MockedFunction<typeof pool.query>;
  const connectMock = pool.connect as jest.MockedFunction<typeof pool.connect>;
  const nowIso = '2026-03-03T00:00:00.000Z';

  const buildMeetingRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'meeting-1',
    committee_id: null,
    meeting_type: 'regular',
    title: 'Committee Meeting',
    starts_at: '2026-04-01T17:00:00.000Z',
    ends_at: '2026-04-01T18:00:00.000Z',
    location: 'Board Room',
    status: 'scheduled',
    presiding_contact_id: null,
    secretary_contact_id: null,
    minutes_notes: null,
    created_at: nowIso,
    updated_at: nowIso,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listMeetings builds full WHERE filters and caps limit at 200', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildMeetingRow()] } as never);

    await listMeetings({
      committee_id: 'committee-1',
      status: 'scheduled',
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-30T23:59:59.000Z',
      limit: 999,
    });

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WHERE committee_id = $1 AND status = $2 AND starts_at >= $3 AND starts_at <= $4');
    expect(params).toEqual([
      'committee-1',
      'scheduled',
      '2026-04-01T00:00:00.000Z',
      '2026-04-30T23:59:59.000Z',
      200,
    ]);
  });

  it('listMeetings omits WHERE when no filters are provided and floors negative limit to 1', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await listMeetings({ limit: -1 });

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain('WHERE');
    expect(params).toEqual([1]);
  });

  it('getMeetingDetail returns null when meeting does not exist', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(getMeetingDetail('missing-meeting')).resolves.toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('getMeetingDetail skips committee lookup when committee_id is null', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [buildMeetingRow({ committee_id: null })] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'agenda-1',
            meeting_id: 'meeting-1',
            position: 1,
            title: 'Agenda Item',
            description: null,
            item_type: 'discussion',
            duration_minutes: null,
            presenter_contact_id: null,
            status: 'pending',
            created_at: nowIso,
            updated_at: nowIso,
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const detail = await getMeetingDetail('meeting-1');

    expect(detail?.meeting.id).toBe('meeting-1');
    expect(detail?.committee).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(4);
  });

  it('getMeetingDetail includes committee details when committee_id is present', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [buildMeetingRow({ committee_id: 'committee-1' })] } as never)
      .mockResolvedValueOnce({
        rows: [{ id: 'committee-1', name: 'Governance', description: null, is_system: false }],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const detail = await getMeetingDetail('meeting-1');

    expect(detail?.committee).toMatchObject({ id: 'committee-1', name: 'Governance' });
    expect(queryMock).toHaveBeenCalledTimes(5);
  });

  it('createMeeting normalizes optional fields to null when omitted', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildMeetingRow()] } as never);

    const created = await createMeeting(
      {
        meeting_type: 'regular',
        title: 'Budget Committee',
        starts_at: '2026-04-01T17:00:00.000Z',
      },
      'user-1'
    );

    expect(created.id).toBe('meeting-1');
    expect(queryMock.mock.calls[0][1]).toEqual([
      null,
      'regular',
      'Budget Committee',
      '2026-04-01T17:00:00.000Z',
      null,
      null,
      null,
      null,
      'user-1',
    ]);
  });

  it('createMeeting preserves optional values when provided', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [buildMeetingRow({ committee_id: 'committee-2', location: 'Hall A' })],
    } as never);

    await createMeeting(
      {
        committee_id: 'committee-2',
        meeting_type: 'special',
        title: 'Planning Session',
        starts_at: '2026-05-01T10:00:00.000Z',
        ends_at: '2026-05-01T11:00:00.000Z',
        location: 'Hall A',
        presiding_contact_id: 'contact-1',
        secretary_contact_id: 'contact-2',
      },
      'user-2'
    );

    expect(queryMock.mock.calls[0][1]).toEqual([
      'committee-2',
      'special',
      'Planning Session',
      '2026-05-01T10:00:00.000Z',
      '2026-05-01T11:00:00.000Z',
      'Hall A',
      'contact-1',
      'contact-2',
      'user-2',
    ]);
  });

  it('updateMeeting returns existing meeting when no fields are provided', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [buildMeetingRow()] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const result = await updateMeeting('meeting-1', {}, 'user-1');

    expect(result?.id).toBe('meeting-1');
    expect(queryMock).toHaveBeenCalledTimes(4);
  });

  it('updateMeeting returns null when no fields are provided and meeting is missing', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    const result = await updateMeeting('missing-meeting', {}, 'user-1');

    expect(result).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('updateMeeting updates all provided fields in a single UPDATE statement', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildMeetingRow({ title: 'Updated Meeting' })] } as never);

    const result = await updateMeeting(
      'meeting-1',
      {
        committee_id: 'committee-3',
        meeting_type: 'special',
        title: 'Updated Meeting',
        starts_at: '2026-04-01T19:00:00.000Z',
        ends_at: null,
        location: 'Room B',
        status: 'in_progress',
        presiding_contact_id: 'contact-10',
        secretary_contact_id: 'contact-11',
        minutes_notes: 'Working notes',
      },
      'user-9'
    );

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('SET committee_id = $1');
    expect(sql).toContain('minutes_notes = $10');
    expect(params).toEqual([
      'committee-3',
      'special',
      'Updated Meeting',
      '2026-04-01T19:00:00.000Z',
      null,
      'Room B',
      'in_progress',
      'contact-10',
      'contact-11',
      'Working notes',
      'user-9',
      'meeting-1',
    ]);
    expect(result?.title).toBe('Updated Meeting');
  });

  it('addAgendaItem applies default values when optional fields are missing', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ max_pos: '3' }] } as never)
      .mockResolvedValueOnce({
        rows: [{ id: 'agenda-2', meeting_id: 'meeting-1', position: 4, title: 'Budget Review' }],
      } as never);

    await addAgendaItem(
      'meeting-1',
      {
        title: 'Budget Review',
      },
      'user-1'
    );

    expect(queryMock.mock.calls[1][1]).toEqual([
      'meeting-1',
      4,
      'Budget Review',
      null,
      'discussion',
      null,
      null,
      'user-1',
    ]);
  });

  it('addAgendaItem preserves optional values when provided', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ max_pos: 1 }] } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'agenda-3' }] } as never);

    await addAgendaItem(
      'meeting-1',
      {
        title: 'Operations Update',
        description: 'Review KPIs',
        item_type: 'presentation',
        duration_minutes: 15,
        presenter_contact_id: 'contact-4',
      },
      'user-2'
    );

    expect(queryMock.mock.calls[1][1]).toEqual([
      'meeting-1',
      2,
      'Operations Update',
      'Review KPIs',
      'presentation',
      15,
      'contact-4',
      'user-2',
    ]);
  });

  it('addMotion applies null fallbacks for optional fields', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'motion-1' }] } as never);

    await addMotion(
      'meeting-1',
      {
        text: 'Approve annual budget',
      },
      'user-1'
    );

    expect(queryMock.mock.calls[0][1]).toEqual([
      'meeting-1',
      null,
      null,
      'Approve annual budget',
      null,
      null,
      'user-1',
    ]);
  });

  it('addMotion keeps optional identifiers when provided', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'motion-2' }] } as never);

    await addMotion(
      'meeting-1',
      {
        agenda_item_id: 'agenda-4',
        parent_motion_id: 'motion-parent',
        text: 'Amend schedule',
        moved_by_contact_id: 'contact-5',
        seconded_by_contact_id: 'contact-6',
      },
      'user-2'
    );

    expect(queryMock.mock.calls[0][1]).toEqual([
      'meeting-1',
      'agenda-4',
      'motion-parent',
      'Amend schedule',
      'contact-5',
      'contact-6',
      'user-2',
    ]);
  });

  it('updateMotion returns null when no patch fields are provided', async () => {
    const result = await updateMotion('motion-1', {}, 'user-1');

    expect(result).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('updateMotion updates provided values and returns updated motion', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'motion-1', status: 'carried' }] } as never);

    const result = await updateMotion(
      'motion-1',
      {
        status: 'carried',
        votes_for: 7,
        votes_against: 2,
        votes_abstain: 1,
        result_notes: 'Passed after discussion',
      },
      'user-3'
    );

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('status = $1');
    expect(sql).toContain('result_notes = $5');
    expect(params).toEqual(['carried', 7, 2, 1, 'Passed after discussion', 'user-3', 'motion-1']);
    expect(result).toEqual({ id: 'motion-1', status: 'carried' });
  });

  it('updateMotion returns null when UPDATE matches no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    const result = await updateMotion('missing-motion', { status: 'failed' }, 'user-4');

    expect(result).toBeNull();
  });

  it('createActionItem applies null defaults when optional fields are omitted', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'action-1' }] } as never);

    await createActionItem(
      'meeting-1',
      {
        subject: 'Follow up with finance team',
      },
      'user-1'
    );

    expect(queryMock.mock.calls[0][1]).toEqual([
      'meeting-1',
      null,
      'Follow up with finance team',
      null,
      null,
      null,
      'user-1',
    ]);
  });

  it('createActionItem preserves optional values when supplied', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 'action-2' }] } as never);

    await createActionItem(
      'meeting-1',
      {
        motion_id: 'motion-10',
        subject: 'Prepare board packet',
        description: 'Compile final attachments',
        assigned_contact_id: 'contact-8',
        due_date: '2026-05-10',
      },
      'user-2'
    );

    expect(queryMock.mock.calls[0][1]).toEqual([
      'meeting-1',
      'motion-10',
      'Prepare board packet',
      'Compile final attachments',
      'contact-8',
      '2026-05-10',
      'user-2',
    ]);
  });

  it('generateMinutesDraft returns null when meeting detail is unavailable', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(generateMinutesDraft('missing-meeting')).resolves.toBeNull();
  });

  it('generateMinutesDraft includes optional notes, votes, and action details when present', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          buildMeetingRow({
            committee_id: 'committee-1',
            title: 'April Governance',
            meeting_type: 'special',
            location: 'Main Hall',
            minutes_notes: 'Adjourned at 6:15 PM',
          }),
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ id: 'committee-1', name: 'Governance', description: null, is_system: false }],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'agenda-1',
            meeting_id: 'meeting-1',
            position: 1,
            title: 'Treasurer Report',
            description: 'Quarterly financial summary',
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'motion-1',
            meeting_id: 'meeting-1',
            agenda_item_id: 'agenda-1',
            text: 'Approve Q2 budget',
            status: 'carried',
            votes_for: 6,
            votes_against: 1,
            votes_abstain: 0,
            result_notes: 'Motion carried',
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-1',
            meeting_id: 'meeting-1',
            subject: 'Draft donor outreach plan',
            description: 'Send by next week',
            due_date: '2026-04-10',
            status: 'open',
          },
        ],
      } as never);

    const result = await generateMinutesDraft('meeting-1');

    expect(result?.markdown).toContain('# Minutes Draft: April Governance');
    expect(result?.markdown).toContain('- Committee: Governance');
    expect(result?.markdown).toContain('- Location: Main Hall');
    expect(result?.markdown).toContain('- Motions:');
    expect(result?.markdown).toContain('Votes: For 6, Against 1, Abstain 0');
    expect(result?.markdown).toContain('## Additional Notes');
    expect(result?.markdown).toContain('Adjourned at 6:15 PM');
  });

  it('generateMinutesDraft emits empty summaries when motions and action items are absent', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          buildMeetingRow({
            committee_id: null,
            title: 'Status Check',
            ends_at: null,
            location: null,
            minutes_notes: null,
          }),
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'agenda-2',
            meeting_id: 'meeting-1',
            position: 1,
            title: 'Roundtable',
            description: null,
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const result = await generateMinutesDraft('meeting-1');

    expect(result?.markdown).toContain('- Committee: —');
    expect(result?.markdown).toContain('No motions recorded.');
    expect(result?.markdown).toContain('No action items recorded.');
    expect(result?.markdown).not.toContain('## Additional Notes');
    expect(result?.markdown).not.toContain('- End:');
    expect(result?.markdown).not.toContain('- Location:');
  });

  it('updates agenda ordering with a single UNNEST query and commits transaction', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 3 }) // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT
    const release = jest.fn();

    connectMock.mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    await reorderAgendaItems(
      'meeting-1',
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
      'user-1'
    );

    expect(clientQuery).toHaveBeenCalledTimes(3);
    expect(clientQuery.mock.calls[1][0]).toContain('FROM UNNEST');
    expect(clientQuery.mock.calls[1][1]).toEqual([
      'meeting-1',
      'user-1',
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
    ]);
    expect(release).toHaveBeenCalled();
  });

  it('rolls back and logs when reorder query fails', async () => {
    const failure = new Error('update failed');
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockRejectedValueOnce(failure) // UPDATE fails
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK
    const release = jest.fn();

    connectMock.mockResolvedValueOnce({
      query: clientQuery,
      release,
    } as never);

    await expect(
      reorderAgendaItems(
        'meeting-1',
        ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
        'user-1'
      )
    ).rejects.toThrow('update failed');

    expect(clientQuery.mock.calls[2][0]).toBe('ROLLBACK');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to reorder agenda items',
      expect.objectContaining({ error: failure, meetingId: 'meeting-1' })
    );
    expect(release).toHaveBeenCalled();
  });
});
