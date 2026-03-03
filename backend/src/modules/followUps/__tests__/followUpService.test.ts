import { FollowUpService } from '@services/followUpService';

type MockDb = {
  query: jest.Mock;
  connect: jest.Mock;
};

const baseDate = new Date('2026-03-02T10:00:00.000Z');

const buildFollowUpRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'fu-1',
  organization_id: 'org-1',
  entity_type: 'task',
  entity_id: 'task-1',
  title: 'Follow up title',
  description: null,
  scheduled_date: '2026-03-10',
  scheduled_time: '09:30:00',
  frequency: 'weekly',
  frequency_end_date: null,
  method: 'email',
  status: 'scheduled',
  completed_date: null,
  completed_notes: null,
  assigned_to: null,
  reminder_minutes_before: null,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: baseDate,
  updated_at: baseDate,
  ...overrides,
});

describe('FollowUpService', () => {
  let db: MockDb;
  let service: FollowUpService;

  beforeEach(() => {
    db = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    service = new FollowUpService(db as any);
  });

  it('applies filters, overdue condition, and pagination for getFollowUps', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })
      .mockResolvedValueOnce({ rows: [buildFollowUpRow()] });

    const result = await service.getFollowUps('org-1', {
      entity_type: 'task',
      entity_id: 'task-1',
      status: 'overdue',
      assigned_to: 'user-7',
      date_from: '2026-03-01',
      date_to: '2026-03-31',
      overdue_only: true,
      page: 2,
      limit: 5,
    });

    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 3,
      pages: 1,
    });
    expect(result.data[0]).toMatchObject({
      id: 'fu-1',
      scheduled_date: '2026-03-10',
      scheduled_time: '09:30',
      frequency_end_date: null,
    });

    const [countSql, countValues] = db.query.mock.calls[0];
    expect(countSql).toContain('FROM follow_ups fu');
    expect(countSql).toContain("fu.status = 'scheduled'");
    expect(countValues).toEqual([
      'org-1',
      'task',
      'task-1',
      'user-7',
      '2026-03-01',
      '2026-03-31',
    ]);
  });

  it('returns null when getFollowUpById does not find a row', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const result = await service.getFollowUpById('org-1', 'missing');

    expect(result).toBeNull();
  });

  it('returns current follow-up when updateFollowUp has no update fields', async () => {
    db.query.mockResolvedValueOnce({ rows: [buildFollowUpRow()] });

    const result = await service.updateFollowUp('org-1', 'fu-1', 'user-1', {});

    expect(result?.id).toBe('fu-1');
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('SELECT fu.*');
  });

  it('updates fields, ignores overdue status updates, and clears pending notifications when reminder is null', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [buildFollowUpRow({ id: 'fu-2', title: 'Updated title', reminder_minutes_before: null })],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'fu-2',
            organization_id: 'org-1',
            scheduled_date: '2026-03-10',
            scheduled_time: '09:30:00',
            reminder_minutes_before: null,
            status: 'scheduled',
            assigned_to: null,
            assigned_email: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.updateFollowUp('org-1', 'fu-2', 'user-9', {
      title: 'Updated title',
      description: null,
      status: 'overdue',
      reminder_minutes_before: null,
    });

    expect(result?.title).toBe('Updated title');

    const [updateSql] = db.query.mock.calls[0];
    expect(updateSql).toContain('title =');
    expect(updateSql).toContain('description =');
    expect(updateSql).toContain('reminder_minutes_before =');
    expect(updateSql).not.toContain('status =');

    const [cleanupSql] = db.query.mock.calls[2];
    expect(cleanupSql).toContain('DELETE FROM follow_up_notifications');
  });

  it('creates follow-up and upserts scheduled notification when reminder is configured', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          buildFollowUpRow({
            id: 'fu-create-1',
            reminder_minutes_before: 30,
            assigned_to: 'user-2',
          }),
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'fu-create-1',
            organization_id: 'org-1',
            scheduled_date: '2026-03-10',
            scheduled_time: '09:30',
            reminder_minutes_before: 30,
            status: 'scheduled',
            assigned_to: 'user-2',
            assigned_email: 'owner@example.com',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const created = await service.createFollowUp('org-1', 'user-1', {
      entity_type: 'task',
      entity_id: 'task-1',
      title: 'Call volunteer',
      scheduled_date: '2026-03-10',
      scheduled_time: '09:30',
      frequency: 'weekly',
      method: 'email',
      reminder_minutes_before: 30,
    });

    expect(created).toMatchObject({
      id: 'fu-create-1',
      scheduled_time: '09:30',
      reminder_minutes_before: 30,
    });

    const [upsertSql, upsertValues] = db.query.mock.calls[2];
    expect(upsertSql).toContain('INSERT INTO follow_up_notifications');
    expect(upsertValues[1]).toBe('fu-create-1');
    expect(upsertValues[3]).toBe('owner@example.com');
  });

  it('returns null and rolls back when completeFollowUp cannot find the target row', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    db.connect.mockResolvedValueOnce(client);

    const result = await service.completeFollowUp('org-1', 'missing', 'user-1', {});

    expect(result).toBeNull();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('completes follow-up and schedules next occurrence for recurring cadence', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            buildFollowUpRow({
              id: 'fu-complete-1',
              frequency: 'weekly',
              frequency_end_date: '2026-12-31',
            }),
          ],
        })
        .mockResolvedValueOnce({
          rows: [buildFollowUpRow({ id: 'fu-complete-1', status: 'completed' })],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'fu-next-1' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    db.connect.mockResolvedValueOnce(client);

    const upsertSpy = jest
      .spyOn(service as any, 'upsertNotificationForFollowUp')
      .mockResolvedValue(undefined);

    const result = await service.completeFollowUp('org-1', 'fu-complete-1', 'user-1', {
      completed_notes: 'Done',
    });

    expect(result?.status).toBe('completed');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO follow_ups'),
      expect.any(Array)
    );
    expect(upsertSpy).toHaveBeenCalledWith('fu-next-1');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('completes follow-up without scheduling when schedule_next is explicitly false', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [buildFollowUpRow({ id: 'fu-complete-2', frequency: 'monthly' })] })
        .mockResolvedValueOnce({ rows: [buildFollowUpRow({ id: 'fu-complete-2', status: 'completed' })] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    db.connect.mockResolvedValueOnce(client);

    const upsertSpy = jest
      .spyOn(service as any, 'upsertNotificationForFollowUp')
      .mockResolvedValue(undefined);

    await service.completeFollowUp('org-1', 'fu-complete-2', 'user-1', {
      schedule_next: false,
    });

    const sqlStatements = client.query.mock.calls.map((call) => call[0]);
    expect(sqlStatements.some((sql) => String(sql).includes('INSERT INTO follow_ups'))).toBe(false);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('skips next occurrence when explicit next date exceeds frequency end date', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            buildFollowUpRow({
              id: 'fu-complete-3',
              frequency: 'once',
              frequency_end_date: '2026-03-05',
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [buildFollowUpRow({ id: 'fu-complete-3', status: 'completed' })] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    db.connect.mockResolvedValueOnce(client);

    const upsertSpy = jest
      .spyOn(service as any, 'upsertNotificationForFollowUp')
      .mockResolvedValue(undefined);

    await service.completeFollowUp('org-1', 'fu-complete-3', 'user-1', {
      next_scheduled_date: '2026-03-10',
    });

    const sqlStatements = client.query.mock.calls.map((call) => String(call[0]));
    expect(sqlStatements.some((sql) => sql.includes('INSERT INTO follow_ups'))).toBe(false);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('rolls back and throws when completeFollowUp fails mid-transaction', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [buildFollowUpRow({ id: 'fu-complete-4' })] })
        .mockRejectedValueOnce(new Error('update failed'))
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    db.connect.mockResolvedValueOnce(client);

    await expect(
      service.completeFollowUp('org-1', 'fu-complete-4', 'user-1', {})
    ).rejects.toThrow('Failed to complete follow-up');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('claims due notifications and marks delivery results', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            follow_up_id: 'fu-1',
            organization_id: 'org-1',
            recipient_email: 'owner@example.com',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const claimed = await service.claimDueNotifications(25);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].id).toBe('notif-1');

    await service.markNotificationResult('notif-1', {
      status: 'failed',
    });

    expect(db.query.mock.calls[1][1]).toEqual(['notif-1', 'failed', null]);
  });
});
