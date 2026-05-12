import { buildPortalDashboardActionItems } from '../portalRepository';

describe('buildPortalDashboardActionItems', () => {
  const nowSpy = jest.spyOn(Date, 'now');

  beforeEach(() => {
    nowSpy.mockReturnValue(new Date('2026-05-11T12:00:00.000Z').getTime());
  });

  afterAll(() => {
    nowSpy.mockRestore();
  });

  it('prioritizes revision-requested and overdue forms ahead of other portal updates', () => {
    const result = buildPortalDashboardActionItems({
      activeForms: [
        {
          id: 'form-overdue',
          case_id: 'case-1',
          title: 'Housing update',
          status: 'sent',
          due_at: '2026-05-10T12:00:00.000Z',
          updated_at: '2026-05-09T12:00:00.000Z',
          case_number: 'CASE-001',
          case_title: 'Housing support',
        },
        {
          id: 'form-revision',
          case_id: 'case-2',
          title: 'Consent form',
          status: 'revision_requested',
          due_at: '2026-05-15T12:00:00.000Z',
          updated_at: '2026-05-11T11:00:00.000Z',
          revision_notes: 'Please add your signature.',
        },
      ],
      unreadThreadsCount: 2,
      recentThreads: [
        {
          id: 'thread-1',
          case_id: 'case-1',
          status: 'open',
          unread_count: 2,
          last_message_preview: 'Please check the latest note.',
          last_message_at: '2026-05-11T10:00:00.000Z',
        },
      ],
      nextAppointment: {
        id: 'appointment-1',
        case_id: 'case-1',
        status: 'confirmed',
        title: 'Case check-in',
        start_time: '2026-05-14T18:00:00.000Z',
      },
    });

    expect(result.map((item) => item.id)).toEqual([
      'form:form-overdue',
      'form:form-revision',
      'message:unread',
      'appointment:appointment-1',
    ]);
    expect(result[0]).toMatchObject({
      kind: 'form',
      priority: 'urgent',
      href: '/portal/forms?assignment=form-overdue',
    });
    expect(result[1]).toMatchObject({
      title: 'Update Consent form',
      description: 'Please add your signature.',
      priority: 'urgent',
    });
    expect(result[2]).toMatchObject({
      href: '/portal/messages?thread=thread-1&case=case-1',
    });
    expect(result[3]).toMatchObject({
      href: '/portal/appointments?appointment=appointment-1&case=case-1',
    });
  });

  it('returns an empty action list when no client-visible portal work needs attention', () => {
    expect(buildPortalDashboardActionItems({})).toEqual([]);
  });

  it('keeps submitted forms active while staff review is still pending', () => {
    const result = buildPortalDashboardActionItems({
      activeForms: [
        {
          id: 'submitted-form',
          title: 'Income worksheet',
          status: 'submitted',
          updated_at: '2026-05-11T10:00:00.000Z',
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'form:submitted-form',
      kind: 'form',
      priority: 'high',
      title: 'Review submitted Income worksheet',
      description: 'Staff are reviewing this form. You can still make changes until review is complete.',
    });
  });
});
