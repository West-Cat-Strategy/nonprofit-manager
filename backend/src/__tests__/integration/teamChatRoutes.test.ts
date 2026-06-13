import request from 'supertest';
import app from '../../index';
import {
  createIntegrationAuthContext,
  deleteIntegrationAuthFixtures,
} from './helpers/authFixtures';

describe('Team chat API route boundaries', () => {
  let authToken = '';
  let userId = '';
  let organizationId = '';
  const originalTeamChatEnabled = process.env.TEAM_CHAT_ENABLED;

  beforeAll(async () => {
    const context = await createIntegrationAuthContext({
      role: 'admin',
      emailPrefix: 'team-chat-routes-admin',
      accountName: `Team Chat Route Test Org ${Date.now()}`,
    });
    authToken = context.authToken;
    userId = context.userId;
    organizationId = context.organizationId;
  });

  beforeEach(() => {
    process.env.TEAM_CHAT_ENABLED = 'true';
  });

  afterEach(() => {
    if (originalTeamChatEnabled === undefined) {
      delete process.env.TEAM_CHAT_ENABLED;
    } else {
      process.env.TEAM_CHAT_ENABLED = originalTeamChatEnabled;
    }
  });

  afterAll(async () => {
    await deleteIntegrationAuthFixtures({
      userIds: userId ? [userId] : [],
      organizationIds: organizationId ? [organizationId] : [],
    });
  });

  it('validates case route identifiers before entering the chat use case', async () => {
    const response = await request(app)
      .get('/api/v2/team-chat/cases/not-a-uuid/messages')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', organizationId)
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'validation_error',
      },
    });
  });

  it('requires a valid organization context on messenger routes', async () => {
    const response = await request(app)
      .get('/api/v2/team-chat/messenger/conversations')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Organization-Id', '00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'not_found',
      },
    });
  });
});
