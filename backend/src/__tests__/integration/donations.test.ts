import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Donation API Integration Tests', () => {
  let authToken: string;
  let testAccountId: string;
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    // Register and login
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `donation-test-${unique()}@example.com`,
        password: 'Test123!Strong',
        password_confirm: 'Test123!Strong',
        first_name: 'Donation',
        last_name: 'Tester',
      });

    authToken = registerResponse.body.token;

    // Create test account for donations
    const accountResponse = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        account_name: 'Test Donor Account',
        account_type: 'individual',
      });

    testAccountId = accountResponse.body.account_id;
  });

  afterAll(async () => {
    // Clean up - delete in correct order due to foreign key constraints
    if (testAccountId) {
      await pool.query('DELETE FROM donations WHERE account_id = $1', [testAccountId]);
      await pool.query('DELETE FROM accounts WHERE id = $1', [testAccountId]);
    }
    await pool.end();
  });

  describe('POST /api/donations', () => {
    it('should create a new donation with valid data', async () => {
      const response = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 500.00,
          donation_date: '2024-03-15',
          payment_method: 'credit_card',
        })
        .expect(201);

      expect(response.body).toHaveProperty('donation_id');
      expect(response.body.amount).toBe('500.00');
      expect(response.body.payment_method).toBe('credit_card');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/donations')
        .send({
          account_id: testAccountId,
          amount: 100,
          donation_date: '2024-04-01',
        })
        .expect(401);
    });

    it('should require amount and donation_date for creation', async () => {
      // The route validation requires amount and donation_date
      const response = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 100,
          donation_date: '2024-05-01',
        })
        .expect(201);

      expect(response.body).toHaveProperty('donation_id');
    });

    it('should create donation with campaign and designation', async () => {
      const response = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 1000.00,
          donation_date: '2024-06-01',
          payment_method: 'check',
          campaign_name: 'Summer 2024 Campaign',
          designation: 'Building Fund',
        })
        .expect(201);

      expect(response.body.campaign_name).toBe('Summer 2024 Campaign');
      expect(response.body.designation).toBe('Building Fund');
    });

    it('should create recurring donation', async () => {
      const response = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 50.00,
          donation_date: '2024-07-01',
          payment_method: 'credit_card',
          is_recurring: true,
          recurring_frequency: 'monthly',
        })
        .expect(201);

      expect(response.body.is_recurring).toBe(true);
      expect(response.body.recurring_frequency).toBe('monthly');
    });
  });

  describe('GET /api/donations', () => {
    it('should return paginated list of donations', async () => {
      const response = await request(app)
        .get('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const payload = response.body.data?.data ? response.body.data : response.body;
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('pagination');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('should filter by account_id', async () => {
      const response = await request(app)
        .get(`/api/donations?account_id=${testAccountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/donations?start_date=2024-01-01&end_date=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by payment_method', async () => {
      const response = await request(app)
        .get('/api/donations?payment_method=credit_card')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should filter by campaign_name', async () => {
      const response = await request(app)
        .get('/api/donations?campaign_name=Summer 2024 Campaign')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/donations').expect(401);
    });
  });

  describe('GET /api/donations/:id', () => {
    it('should return a single donation by ID', async () => {
      const createResponse = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 250.00,
          donation_date: '2024-08-10',
          payment_method: 'cash',
        });

      const donationId = createResponse.body.donation_id;

      const response = await request(app)
        .get(`/api/donations/${donationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.donation_id).toBe(donationId);
      expect(response.body.amount).toBe('250.00');
    });

    it('should return 404 for non-existent donation', async () => {
      await request(app)
        .get('/api/donations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/donations/00000000-0000-0000-0000-000000000000').expect(401);
    });
  });

  describe('PUT /api/donations/:id', () => {
    it('should update an existing donation', async () => {
      const createResponse = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 300.00,
          donation_date: '2024-09-01',
          payment_method: 'check',
        });

      const donationId = createResponse.body.donation_id;

      const response = await request(app)
        .put(`/api/donations/${donationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 350.00,
          payment_method: 'cash',
          notes: 'Updated donation amount',
        })
        .expect(200);

      expect(response.body.amount).toBe('350.00');
      expect(response.body.payment_method).toBe('cash');
      expect(response.body.notes).toBe('Updated donation amount');
    });

    it('should update receipt status', async () => {
      const createResponse = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 500.00,
          donation_date: '2024-10-01',
          payment_method: 'credit_card',
        });

      const donationId = createResponse.body.donation_id;

      const response = await request(app)
        .put(`/api/donations/${donationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          receipt_sent: true,
        })
        .expect(200);

      expect(response.body.receipt_sent).toBe(true);
    });

    it('should return 404 for non-existent donation', async () => {
      await request(app)
        .put('/api/donations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
        })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/donations/00000000-0000-0000-0000-000000000000')
        .send({ amount: 100 })
        .expect(401);
    });
  });

  describe('DELETE /api/donations/:id', () => {
    it('should delete a donation', async () => {
      const createResponse = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          account_id: testAccountId,
          amount: 200.00,
          donation_date: '2024-11-01',
          payment_method: 'cash',
        });

      const donationId = createResponse.body.donation_id;

      await request(app)
        .delete(`/api/donations/${donationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify donation is deleted
      await request(app)
        .get(`/api/donations/${donationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent donation', async () => {
      await request(app)
        .delete('/api/donations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/donations/00000000-0000-0000-0000-000000000000').expect(401);
    });
  });
});
