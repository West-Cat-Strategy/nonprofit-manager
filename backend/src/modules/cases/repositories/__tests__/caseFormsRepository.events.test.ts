import pool from '@config/database';
import {
  createAssignmentEvent,
  listAssignmentEvents,
} from '../caseFormsRepository.events';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const queryMock = pool.query as jest.Mock;

const eventRow = {
  id: 'event-1',
  assignment_id: 'assignment-1',
  case_id: 'case-1',
  contact_id: 'contact-1',
  event_type: 'submission_recorded',
  actor_type: 'portal',
  actor_user_id: null,
  actor_portal_user_id: 'portal-user-1',
  submission_id: 'submission-1',
  metadata: {
    submission_id: 'submission-1',
    submission_number: 1,
    mapped_field_count: 2,
    selected_asset_count: 0,
  },
  created_at: new Date('2026-04-16T12:30:00.000Z'),
};

describe('caseFormsRepository.events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends assignment evidence events with sanitized metadata', async () => {
    queryMock.mockResolvedValueOnce({ rows: [eventRow] });

    await expect(
      createAssignmentEvent(pool, {
      assignmentId: 'assignment-1',
      caseId: 'case-1',
      contactId: 'contact-1',
      accountId: 'account-1',
      eventType: 'submission_recorded',
      actorType: 'portal',
      actorPortalUserId: 'portal-user-1',
      submissionId: 'submission-1',
      accessTokenId: 'token-1',
      metadata: {
          submission_id: 'submission-1',
          submission_number: 1,
          mapped_field_count: 2,
          selected_asset_count: 0,
        },
      })
    ).resolves.toMatchObject({
      id: 'event-1',
      event_type: 'submission_recorded',
      metadata: {
        submission_id: 'submission-1',
        submission_number: 1,
        mapped_field_count: 2,
        selected_asset_count: 0,
      },
    });

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('INSERT INTO case_form_assignment_events');
    expect(params).toEqual([
      'assignment-1',
      'case-1',
      'contact-1',
      'account-1',
      'submission_recorded',
      'portal',
      null,
      'portal-user-1',
      'submission-1',
      'token-1',
      JSON.stringify({
        submission_id: 'submission-1',
        submission_number: 1,
        mapped_field_count: 2,
        selected_asset_count: 0,
      }),
    ]);
  });

  it('lists assignment evidence events newest first', async () => {
    queryMock.mockResolvedValueOnce({ rows: [eventRow] });

    await expect(listAssignmentEvents(pool, 'assignment-1')).resolves.toHaveLength(1);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('WHERE assignment_id = $1');
    expect(sql).toContain('ORDER BY created_at DESC, id DESC');
    expect(params).toEqual(['assignment-1']);
  });
});
