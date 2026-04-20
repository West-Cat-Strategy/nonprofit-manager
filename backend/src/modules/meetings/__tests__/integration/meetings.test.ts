import request from 'supertest';
import app from '../../../../index';
import pool from '../../../../config/database';

describe('Meetings API Integration Tests', () => {
  let adminAuthToken: string;
  let testAccountId: string;
  let testContactId: string;
  let testCommitteeId: string;
  let testMeetingId: string;
  const sharedPassword = 'Test123!Strong';
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const tokenFromResponse = (body: any): string | undefined => {
    return body.token || body.data?.token;
  };

  const accountIdFromResponse = (body: any): string | undefined => {
    return body.account_id || body.data?.account_id;
  };

  const withAuthToken = (token: string, req: any) =>
    req
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', testAccountId);

  beforeAll(async () => {
    // Register and login admin
    const email = `meeting-admin-${unique()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email,
        password: sharedPassword,
        password_confirm: sharedPassword,
        first_name: 'Meeting',
        last_name: 'Admin',
      });

    adminAuthToken = tokenFromResponse(registerResponse.body) || '';
    expect(adminAuthToken).toBeTruthy();

    // Create a test account
    const accountResponse = await request(app)
      .post('/api/v2/accounts')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({
        account_name: 'Test Account for Meetings',
        account_type: 'organization',
      });

    testAccountId = accountIdFromResponse(accountResponse.body) || '';
    expect(testAccountId).toBeTruthy();

    const accountOwnerResult = await pool.query<{ created_by: string }>(
      'SELECT created_by FROM accounts WHERE id = $1',
      [testAccountId]
    );
    const creatorUserId = accountOwnerResult.rows[0]?.created_by || '';
    expect(creatorUserId).toBeTruthy();

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES ($1, $2, 'admin', $1, TRUE)`,
      [creatorUserId, testAccountId]
    );

    // Create a test contact
    const contactResponse = await withAuthToken(adminAuthToken, request(app).post('/api/v2/contacts'))
      .send({
        first_name: 'Meeting',
        last_name: 'Contact',
        email: `meeting-contact-${unique()}@example.com`,
      });
    
    testContactId = contactResponse.body.data?.contact_id || contactResponse.body.contact_id;
    expect(testContactId).toBeTruthy();

    // Get a committee (Staff committee is seeded by default)
    const committeeResponse = await withAuthToken(adminAuthToken, request(app).get('/api/v2/meetings/committees'));
    testCommitteeId = committeeResponse.body.committees[0].id;
    expect(testCommitteeId).toBeTruthy();
  });

  afterAll(async () => {
    if (testAccountId) {
      await pool.query('DELETE FROM meetings WHERE committee_id IN (SELECT id FROM committees WHERE created_by IN (SELECT id FROM users WHERE email LIKE \'meeting-%\'))');
      await pool.query('DELETE FROM contacts WHERE account_id = $1', [testAccountId]);
      await pool.query('DELETE FROM user_account_access WHERE account_id = $1', [testAccountId]);
      await pool.query('DELETE FROM accounts WHERE id = $1', [testAccountId]);
    }
  });

  describe('Meetings CRUD', () => {
    it('should create a meeting', async () => {
      const startsAt = new Date(Date.now() + 86400000).toISOString();
      const response = await withAuthToken(adminAuthToken, request(app).post('/api/v2/meetings'))
        .send({
          meeting_type: 'committee',
          title: 'Monthly Staff Meeting',
          starts_at: startsAt,
          committee_id: testCommitteeId,
          location: 'Conference Room A',
        })
        .expect(201);

      expect(response.body.meeting).toHaveProperty('id');
      expect(response.body.meeting.title).toBe('Monthly Staff Meeting');
      testMeetingId = response.body.meeting.id;
    });

    it('should list meetings', async () => {
      const response = await withAuthToken(adminAuthToken, request(app).get('/api/v2/meetings'))
        .expect(200);

      expect(Array.isArray(response.body.meetings)).toBe(true);
      expect(response.body.meetings.length).toBeGreaterThan(0);
    });

    it('should get meeting details', async () => {
      const response = await withAuthToken(adminAuthToken, request(app).get(`/api/v2/meetings/${testMeetingId}`))
        .expect(200);

      expect(response.body.meeting.id).toBe(testMeetingId);
      expect(response.body.meeting.title).toBe('Monthly Staff Meeting');
    });

    it('should update a meeting', async () => {
      const response = await withAuthToken(adminAuthToken, request(app).patch(`/api/v2/meetings/${testMeetingId}`))
        .send({
          title: 'Updated Meeting Title',
          status: 'scheduled',
        })
        .expect(200);

      expect(response.body.meeting.title).toBe('Updated Meeting Title');
      expect(response.body.meeting.status).toBe('scheduled');
    });
  });

  describe('Agenda and Motions', () => {
    let agendaItemId: string;

    it('should add an agenda item', async () => {
      const response = await withAuthToken(adminAuthToken, request(app).post(`/api/v2/meetings/${testMeetingId}/agenda-items`))
        .send({
          title: 'Review Quarterly Progress',
          duration_minutes: 30,
          item_type: 'discussion',
        })
        .expect(201);

      expect(response.body.agendaItem).toHaveProperty('id');
      expect(response.body.agendaItem.title).toBe('Review Quarterly Progress');
      agendaItemId = response.body.agendaItem.id;
    });

    it('should add a motion', async () => {
      const response = await withAuthToken(adminAuthToken, request(app).post(`/api/v2/meetings/${testMeetingId}/motions`))
        .send({
          text: 'That the quarterly report be adopted as presented.',
          agenda_item_id: agendaItemId,
          moved_by_contact_id: testContactId,
        })
        .expect(201);

      expect(response.body.motion).toHaveProperty('id');
      expect(response.body.motion.text).toContain('quarterly report');
    });

    it('should create an action item', async () => {
      const response = await withAuthToken(adminAuthToken, request(app).post(`/api/v2/meetings/${testMeetingId}/action-items`))
        .send({
          subject: 'Distribute approved report',
          assigned_contact_id: testContactId,
          due_date: new Date(Date.now() + 172800000).toISOString(),
        })
        .expect(201);

      expect(response.body.actionItem).toHaveProperty('id');
      expect(response.body.actionItem.subject).toBe('Distribute approved report');
    });

    it('should get minutes draft', async () => {
      const response = await withAuthToken(adminAuthToken, request(app).get(`/api/v2/meetings/${testMeetingId}/minutes/draft`))
        .expect(200);

      expect(response.body).toHaveProperty('markdown');
      expect(typeof response.body.markdown).toBe('string');
      expect(response.body.markdown).toContain('Updated Meeting Title');
    });
  });
});
