import { ContactSuppressionService } from '../services/contactSuppressionService';

const buildDb = () => ({
  query: jest.fn(),
});

describe('ContactSuppressionService', () => {
  it('records staff suppression evidence and syncs do_not_email', async () => {
    const db = buildDb();
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'contact-1', account_id: 'account-1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'suppression-1',
            contact_id: 'contact-1',
            account_id: 'account-1',
            channel: 'email',
            reason: 'staff_dnc',
            source: 'staff',
            source_label: 'Staff do-not-contact',
            provider: null,
            provider_list_id: null,
            provider_event_id: null,
            provider_event_type: null,
            provider_reason: null,
            evidence: { note: 'Client asked to stop fundraising emails' },
            notes: null,
            is_active: true,
            starts_at: null,
            expires_at: null,
            created_at: new Date('2026-05-01T12:00:00Z'),
            updated_at: new Date('2026-05-01T12:00:00Z'),
            created_by: 'user-1',
            resolved_at: null,
            resolved_by: null,
            resolved_note: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    const service = new ContactSuppressionService(db as never);
    const result = await service.upsertStaffSuppression(
      'contact-1',
      {
        channel: 'email',
        reason: 'staff_dnc',
        evidence_summary: 'Client asked to stop fundraising emails',
      },
      'user-1'
    );

    expect(result?.reason).toBe('staff_dnc');
    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO contact_suppression_evidence');
    expect(db.query.mock.calls[2][0]).toContain('SET do_not_email = true');
  });

  it('records Mailchimp webhook suppression evidence with provider metadata', async () => {
    const db = buildDb();
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'contact-1', account_id: 'account-1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'suppression-1',
            contact_id: 'contact-1',
            account_id: 'account-1',
            channel: 'email',
            reason: 'mailchimp_unsubscribe',
            source: 'mailchimp_webhook',
            source_label: 'Mailchimp webhook',
            provider: 'mailchimp',
            provider_list_id: 'list-1',
            provider_event_id: 'event-1',
            provider_event_type: 'unsubscribe',
            provider_reason: null,
            evidence: { type: 'unsubscribe' },
            notes: null,
            is_active: true,
            starts_at: null,
            expires_at: null,
            created_at: new Date('2026-05-01T12:00:00Z'),
            updated_at: new Date('2026-05-01T12:00:00Z'),
            created_by: null,
            resolved_at: null,
            resolved_by: null,
            resolved_note: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    const service = new ContactSuppressionService(db as never);
    const result = await service.recordSuppressionEvidence({
      contactId: 'contact-1',
      channel: 'email',
      reason: 'mailchimp_unsubscribe',
      source: 'mailchimp_webhook',
      provider: 'mailchimp',
      providerListId: 'list-1',
      providerEventId: 'event-1',
      providerEventType: 'unsubscribe',
      preserveDoNotEmail: true,
      evidence: { type: 'unsubscribe' },
    });

    expect(result?.source).toBe('mailchimp_webhook');
    expect(db.query.mock.calls[1][0]).toContain('provider_event_id');
    expect(db.query.mock.calls[2][0]).toContain('SET do_not_email = true');
  });
});
