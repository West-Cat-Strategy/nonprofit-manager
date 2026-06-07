import request, { type Test } from 'supertest';
import app from '../../../../index';
import pool from '../../../../config/database';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from '../../../../__tests__/integration/helpers/authFixtures';

describe('Meetings API Integration Tests', () => {
  let adminAuthToken: string;
  let testAccountId: string;
  let testContactId: string;
  let testCommitteeId: string;
  let testMeetingId: string;
  let creatorUserId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const withAuthToken = (token: string, req: Test): Test =>
    req
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', testAccountId);

  beforeAll(async () => {
    const authContext = await createIntegrationAuthContext({
      role: 'admin',
      emailPrefix: 'meeting-admin',
      accountName: `Test Account for Meetings ${unique()}`,
    });
    adminAuthToken = authContext.authToken;
    testAccountId = authContext.organizationId;
    creatorUserId = authContext.userId;

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
      await pool.query('DELETE FROM meetings WHERE organization_id = $1', [testAccountId]);
      await pool.query('DELETE FROM contacts WHERE account_id = $1', [testAccountId]);
      if (creatorUserId) {
        await pool.query(
          `DELETE FROM contacts
           WHERE created_by = $1
              OR modified_by = $1`,
          [creatorUserId]
        );
      }
      await deleteIntegrationAuthFixtures({
        userIds: creatorUserId ? [creatorUserId] : [],
        organizationIds: [testAccountId],
      });
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

    it('does not expose meetings from another organization context', async () => {
      const otherAccountResult = await pool.query<{ id: string }>(
        `INSERT INTO accounts (account_name, account_type, created_by, modified_by)
         VALUES ($1, 'organization', $2, $2)
         RETURNING id`,
        [`Other Meeting Org ${unique()}`, creatorUserId]
      );
      const otherAccountId = otherAccountResult.rows[0].id;

      const otherMeetingResult = await pool.query<{ id: string }>(
        `INSERT INTO meetings (
           organization_id, meeting_type, title, starts_at, location, created_by, modified_by
         )
         VALUES ($1, 'board', $2, $3, 'Other room', $4, $4)
         RETURNING id`,
        [otherAccountId, `Other Org Meeting ${unique()}`, new Date(Date.now() + 86400000).toISOString(), creatorUserId]
      );
      const otherMeetingId = otherMeetingResult.rows[0].id;

      try {
        await withAuthToken(adminAuthToken, request(app).get(`/api/v2/meetings/${otherMeetingId}`))
          .expect(404);

        await withAuthToken(adminAuthToken, request(app).patch(`/api/v2/meetings/${otherMeetingId}`))
          .send({ title: 'Cross-tenant edit' })
          .expect(404);

        const listResponse = await withAuthToken(adminAuthToken, request(app).get('/api/v2/meetings'))
          .expect(200);
        expect(listResponse.body.meetings.map((meeting: { id: string }) => meeting.id)).not.toContain(otherMeetingId);
      } finally {
        await pool.query('DELETE FROM meetings WHERE id = $1', [otherMeetingId]);
        await pool.query('DELETE FROM accounts WHERE id = $1', [otherAccountId]);
      }
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
