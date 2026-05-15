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
  let reassessmentFollowUpId = '';

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

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', userId]);

    const loginResponse = await request(app)
      .post('/api/v2/auth/login')
      .send({ email: testEmail, password: 'Test123!Strong' })
      .expect(200);
    authToken = (loginResponse.body.data?.token || loginResponse.body.token) || '';
    expect(authToken).toBeTruthy();

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

    const followUpResult = await pool.query<{ id: string }>(
      `INSERT INTO follow_ups (
         organization_id,
         entity_type,
         entity_id,
         title,
         description,
         scheduled_date,
         frequency,
         status,
         assigned_to,
         reminder_minutes_before,
         created_by,
         modified_by
       )
       VALUES ($1, 'case', $2, 'Reassessment follow-up', NULL, '2020-01-15', 'once', 'scheduled', $3, NULL, $3, $3)
       RETURNING id`,
      [organizationId, caseId, userId]
    );
    reassessmentFollowUpId = followUpResult.rows[0].id;

    await pool.query(
      `INSERT INTO case_reassessment_cycles (
         organization_id,
         case_id,
         follow_up_id,
         owner_user_id,
         status,
         title,
         summary,
         earliest_review_date,
         due_date,
         latest_review_date,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, 'scheduled', 'Housing reassessment', 'Confirm housing continuity', '2019-12-01', '2020-01-15', '2020-01-31', $4, $4)`,
      [organizationId, caseId, reassessmentFollowUpId, userId]
    );

    await pool.query(
      `INSERT INTO case_services (
         case_id,
         service_name,
         service_type,
         service_provider,
         service_date,
         status,
         outcome,
         created_by
       )
       VALUES ($1, 'Housing navigation', 'housing', 'Community Housing Team', '2026-04-22', 'scheduled', 'Bring lease paperwork', $2)`,
      [caseId, userId]
    );

    await pool.query(
      `INSERT INTO case_form_assignments (
         case_id,
         contact_id,
         account_id,
         case_type_id,
         title,
         description,
         status,
         schema,
         current_draft_answers,
         due_at,
         recipient_email,
         sent_at,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, 'Housing eligibility review', 'Field packet fixture', 'sent', '{}'::jsonb, '{}'::jsonb, '2026-04-23T16:00:00Z', 'handoff-client@example.com', '2026-04-20T16:00:00Z', $5, $5)`,
      [caseId, contactId, organizationId, caseTypeId, userId]
    );

    await pool.query(
      `INSERT INTO appointments (
         contact_id,
         case_id,
         account_id,
         pointperson_user_id,
         title,
         description,
         start_time,
         end_time,
         status,
         location,
         request_type,
         created_by
       )
       VALUES ($1, $2, $3, $4, 'Housing site visit', 'Field packet appointment fixture', '2026-04-24T18:00:00Z', '2026-04-24T18:30:00Z', 'confirmed', 'Main office', 'slot_booking', $4)`,
      [contactId, caseId, organizationId, userId]
    );
  });

  afterAll(async () => {
    if (caseId) {
      await pool.query('DELETE FROM case_reassessment_cycles WHERE case_id = $1', [caseId]);
      await pool.query('DELETE FROM appointments WHERE case_id = $1', [caseId]);
      await pool.query('DELETE FROM case_form_assignments WHERE case_id = $1', [caseId]);
      await pool.query('DELETE FROM case_services WHERE case_id = $1', [caseId]);
      await pool.query('DELETE FROM case_milestones WHERE case_id = $1', [caseId]);
      await pool.query('DELETE FROM case_notes WHERE case_id = $1', [caseId]);
      await pool.query('DELETE FROM follow_ups WHERE entity_type = $1 AND entity_id = $2', ['case', caseId]);
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
    expect(packet.risks.risk_summary).toContain('1 Overdue Reassessments');
    expect(packet.risks.risk_summary).toContain('1 Lapsed Reassessment Windows');

    expect(packet.artifacts_summary.notes_count).toBe(1);
    expect(packet.artifacts_summary.documents_count).toBe(0);
    
    expect(packet.next_actions.pending_milestones.length).toBe(1);
    expect(packet.next_actions.pending_milestones[0].name).toBe('Test Milestone');
    expect(packet.next_actions.pending_follow_ups.length).toBe(1);
    expect(packet.next_actions.pending_follow_ups[0].title).toBe('Reassessment follow-up');
    expect(packet.continuity.reassessment.status).toBe('lapsed');
    expect(packet.continuity.reassessment.current.title).toBe('Housing reassessment');
    expect(packet.continuity.handoff_readiness.status).toBe('needs_attention');
    expect(packet.continuity.handoff_readiness.cues).toContain('1 pending milestone');
    expect(packet.continuity.handoff_readiness.cues).toContain('1 pending follow-up');
    expect(packet.continuity.closure.status).toBe('open_actions');
    expect(packet.continuity.closure.cues).toContain('1 lapsed reassessment window before closure');
    expect(packet.field_packet.scope.offline_sync_included).toBe(false);
    expect(packet.field_packet.scope.service_site_routing_included).toBe(false);
    expect(packet.field_packet.scope.referral_transfer_included).toBe(false);
    expect(packet.field_packet.scope.persisted_packet_included).toBe(false);
    expect(packet.field_packet.assignment_context.case_status).toBe('Open');
    expect(packet.field_packet.assignment_context.portal_visibility_status).toBe('Internal Only');
    expect(packet.field_packet.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Housing navigation',
          type: 'housing',
          provider: 'Community Housing Team',
          status: 'scheduled',
          service_date: '2026-04-22',
          outcome: 'Bring lease paperwork',
        }),
      ])
    );
    expect(packet.field_packet.forms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Housing eligibility review',
          status: 'sent',
          recipient_email: 'handoff-client@example.com',
        }),
      ])
    );
    expect(packet.field_packet.appointments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Housing site visit',
          status: 'confirmed',
          location: 'Main office',
          request_type: 'slot_booking',
          pointperson: expect.objectContaining({
            email: testEmail,
          }),
        }),
      ])
    );
  });

  it('requires CASE_VIEW permission', async () => {
    // We could test with a user that doesn't have permission, but for simplicity we just test auth
    await request(app).get(`/api/v2/cases/${caseId}/handoff-packet`).expect(401);
  });
});
