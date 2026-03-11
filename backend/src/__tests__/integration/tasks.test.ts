import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Task API Integration Tests', () => {
  let authToken: string;
  let testTaskId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const isoDateTime = (date: string, time = '00:00:00Z') => `${date}T${time}`;

  beforeAll(async () => {
    // Register and login
    const registerResponse = await request(app)
      .post('/api/v2/auth/register')
      .send({
        email: `task-test-${unique()}@example.com`,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Task',
        last_name: 'Tester',
      });

    authToken = registerResponse.body.token;
  });

  afterAll(async () => {
    // Clean up
    if (testTaskId) {
      await pool.query('DELETE FROM tasks WHERE id = $1', [testTaskId]);
    }
  });

  describe('POST /api/v2/tasks', () => {
    it('should create a new task with valid data', async () => {
      const response = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Follow up with donor',
          priority: 'high',
          due_date: isoDateTime('2024-04-15'),
          status: 'not_started',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.subject).toBe('Follow up with donor');
      expect(response.body.priority).toBe('high');
      testTaskId = response.body.id;
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v2/tasks')
        .send({
          subject: 'Test Task',
        })
        .expect(401);
    });

    it('should create task with minimal fields', async () => {
      const response = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Minimal task',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.subject).toBe('Minimal task');
      expect(response.body.status).toBe('not_started');
      expect(response.body.priority).toBe('normal');
    });

    it('should create task with related entity', async () => {
      const response = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Prepare event materials',
          priority: 'normal',
          due_date: isoDateTime('2024-05-20'),
          related_to_type: 'event',
        })
        .expect(201);

      expect(response.body.related_to_type).toBe('event');
    });

    it('should reject invalid priority enum', async () => {
      const response = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Invalid Priority Task',
          priority: 'invalid_priority',
        })
        .expect(400); // Validation middleware correctly rejects invalid enum

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'validation_error',
          message: 'Validation failed',
        },
      });
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('GET /api/v2/tasks', () => {
    it('should return list of tasks with pagination', async () => {
      const response = await request(app)
        .get('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });

    it('should support search query', async () => {
      const response = await request(app)
        .get('/api/v2/tasks?search=donor')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/v2/tasks?priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v2/tasks?status=not_started')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
    });

    it('should filter by due date range', async () => {
      const response = await request(app)
        .get(
          `/api/v2/tasks?due_after=${isoDateTime('2024-01-01')}&due_before=${isoDateTime('2024-12-31', '23:59:59Z')}`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/tasks').expect(401);
    });
  });

  describe('GET /api/v2/tasks/:id', () => {
    it('should return a single task by ID', async () => {
      const createResponse = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Single Task Test',
          priority: 'low',
        });

      const taskId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/v2/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(taskId);
      expect(response.body.subject).toBe('Single Task Test');
    });

    it('should return 404 for non-existent task', async () => {
      await request(app)
        .get('/api/v2/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v2/tasks/1').expect(401);
    });
  });

  describe('PUT /api/v2/tasks/:id', () => {
    it('should update an existing task', async () => {
      const createResponse = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Original Task',
          priority: 'low',
          status: 'not_started',
        });

      const taskId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/v2/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Updated Task',
          priority: 'high',
          status: 'in_progress',
        })
        .expect(200);

      expect(response.body.subject).toBe('Updated Task');
      expect(response.body.priority).toBe('high');
      expect(response.body.status).toBe('in_progress');
    });

    it('should update task completion status', async () => {
      const createResponse = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Task to Complete',
          status: 'in_progress',
        });

      const taskId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/v2/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
        })
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.completed_date).toBeTruthy();
    });

    it('should return 404 for non-existent task', async () => {
      await request(app)
        .put('/api/v2/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Updated',
        })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).put('/api/v2/tasks/1').send({ subject: 'Test' }).expect(401);
    });
  });

  describe('DELETE /api/v2/tasks/:id', () => {
    it('should delete a task', async () => {
      const createResponse = await request(app)
        .post('/api/v2/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Task to Delete',
        });

      const taskId = createResponse.body.id;

      await request(app)
        .delete(`/api/v2/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify task is deleted
      await request(app)
        .get(`/api/v2/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent task', async () => {
      await request(app)
        .delete('/api/v2/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/v2/tasks/1').expect(401);
    });
  });
});
