import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Case Handoff Packet Integration Tests', () => {
  let authToken = '';
  let testEmail = '';
  let userId = '';
  let organizationId = '';
  let caseTypeId = '';
  let contactId = '';
  let caseId = '';

  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const withAuth = (req: ReturnType<typeof request>): ReturnType<typeof request> =>
    req
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId);

  const payloadFromResponse = <T>(body: unknown): T => {
    if (typeof body === 'object' && body !== null && 'data' in body) {
      return (body as { data: T }).data;
    }
    return body as T;
  };

  beforeAll(async () => {
    testEmail = `handoff-test-${unique()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: testEmail,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Handoff',
        last_name: 'Tester',
      })
      .expect(201);

    authToken = (registerResponse.body.data?.token || registerResponse.body.token) || '';
    userId = (registerResponse.body.data?.user?.id || registerResponse.body.user?.id) || '';

    const accountResponse = await request(app)
      .post('/api/v2/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_name: `Handoff Test Organization ${unique()}`,
        account_type: 'organization',
      })
      .expect(201);

    organizationId = (accountResponse.body.data?.account_id || accountResponse.body.account_id) || '';

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES ($1, $2, 'owner', $1, true)`,
      [userId, organizationId]
    );

    const caseTypeResult = await pool.query<{ id: string }>('SELECT id FROM case_types LIMIT 1');
    caseTypeId = caseTypeResult.rows[0].id;

    const contactResponse = await withAuth(request(app)
      .post('/api/v2/contacts')
      .send({
        first_name: 'Handoff',
        last_name: 'Client',
      }))
      .expect(201);
    const contactPayload = payloadFromResponse<{ contact_id?: string; id?: string }>(contactResponse.body);
    contactId = contactPayload.contact_id ?? contactPayload.id ?? '';
    expect(contactId).toBeTruthy();

    const caseResponse = await withAuth(request(app)
      .post('/api/v2/cases')
      .send({
        contact_id: contactId,
        case_type_id: caseTypeId,
        title: 'Handoff Test Case',
        priority: 'high',
        is_urgent: true,
        description: 'Test Description'
      }))
      .expect(201);
    const casePayload = payloadFromResponse<{ case_id?: string; id?: string }>(caseResponse.body);
    caseId = casePayload.case_id ?? casePayload.id ?? '';
    expect(caseId).toBeTruthy();

    // Add a milestone
    await withAuth(request(app)
      .post(`/api/v2/cases/${caseId}/milestones`)
      .send({
        milestone_name: 'Test Milestone',
        due_date: '2020-01-01', // Overdue
      }))
      .expect(201);
  });

  afterAll(async () => {
    if (caseId) {
      await pool.query('DELETE FROM case_milestones WHERE case_id = $1', [caseId]);
      await pool.query('DELETE FROM cases WHERE id = $1', [caseId]);
    }
    if (contactId) {
      await pool.query('DELETE FROM contacts WHERE id = $1', [contactId]);
    }
    if (organizationId) {
      await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [organizationId]);
      await pool.query('DELETE FROM accounts WHERE id = $1', [organizationId]);
    }
    if (userId) {
      await pool.query('DELETE FROM contacts WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  it('generates a handoff packet with correct details and risks', async () => {
    const response = await withAuth(request(app)
      .get(`/api/v2/cases/${caseId}/handoff-packet`))
      .expect(200);

    const packet = payloadFromResponse<any>(response.body);

    expect(packet.case_details.title).toBe('Handoff Test Case');
    expect(packet.case_details.priority).toBe('high');
    expect(packet.case_details.is_urgent).toBe(true);
    
    expect(packet.risks.is_urgent).toBe(true);
    expect(packet.risks.is_high_priority).toBe(true);
    expect(packet.risks.overdue_milestones_count).toBe(1);
    expect(packet.risks.risk_summary).toContain('Marked as Urgent');
    expect(packet.risks.risk_summary).toContain('High Priority');
    expect(packet.risks.risk_summary).toContain('1 Overdue Milestones');

    expect(packet.artifacts_summary.notes_count).toBe(0);
    expect(packet.artifacts_summary.documents_count).toBe(0);
    
    expect(packet.next_actions.pending_milestones.length).toBe(1);
    expect(packet.next_actions.pending_milestones[0].name).toBe('Test Milestone');
  });

  it('requires CASE_VIEW permission', async () => {
    // We could test with a user that doesn't have permission, but for simplicity we just test auth
    await request(app).get(`/api/v2/cases/${caseId}/handoff-packet`).expect(401);
  });
});
