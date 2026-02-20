import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

describe('Portal Appointments Integration', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let adminUserId: string;
  let adminEmail: string;
  let contactId: string;
  let portalUserId: string;
  let portalEmail: string;
  let caseTypeId: string;
  let activeStatusId: string;
  let caseId: string;
  let slotId: string;

  const createdAppointmentIds: string[] = [];
  const createdCaseIds: string[] = [];
  const createdStatusIds: string[] = [];
  const createdCaseTypeIds: string[] = [];
  const createdSlotIds: string[] = [];
  const createdPortalUserIds: string[] = [];
  const createdContactIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildAdminToken = () =>
    jwt.sign({ id: adminUserId, email: adminEmail, role: 'admin' }, getJwtSecret(), {
      expiresIn: '1h',
    });

  const buildPortalToken = () =>
    jwt.sign(
      { id: portalUserId, email: portalEmail, contactId, type: 'portal' as const },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

  beforeAll(async () => {
    const suffix = unique();

    adminEmail = `portal-appointments-admin-${suffix}@example.com`;
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Portal', 'Scheduler', 'admin', NOW(), NOW())
       RETURNING id`,
      [adminEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    adminUserId = userResult.rows[0].id as string;
    createdUserIds.push(adminUserId);

    const caseTypeResult = await pool.query(
      `INSERT INTO case_types (name, description, created_at, updated_at)
       VALUES ($1, 'Appointments test type', NOW(), NOW())
       RETURNING id`,
      [`Portal Appointments Type ${suffix}`]
    );
    caseTypeId = caseTypeResult.rows[0].id as string;
    createdCaseTypeIds.push(caseTypeId);

    const statusResult = await pool.query(
      `INSERT INTO case_statuses (name, status_type, sort_order, is_active, created_at, updated_at)
       VALUES ($1, 'active', 10, true, NOW(), NOW())
       RETURNING id`,
      [`Portal Appointments Active ${suffix}`]
    );
    activeStatusId = statusResult.rows[0].id as string;
    createdStatusIds.push(activeStatusId);

    portalEmail = `portal-appointments-client-${suffix}@example.com`;
    const contactResult = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, created_by, modified_by)
       VALUES ('Portal', 'Client', $1, NULL, NULL)
       RETURNING id`,
      [portalEmail]
    );
    contactId = contactResult.rows[0].id as string;
    createdContactIds.push(contactId);

    const portalUserResult = await pool.query(
      `INSERT INTO portal_users (contact_id, email, password_hash, status, is_verified)
       VALUES ($1, $2, $3, 'active', true)
       RETURNING id`,
      [contactId, portalEmail, '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG']
    );
    portalUserId = portalUserResult.rows[0].id as string;
    createdPortalUserIds.push(portalUserId);

    const caseResult = await pool.query(
      `INSERT INTO cases (
         case_number,
         contact_id,
         case_type_id,
         status_id,
         title,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, $6, NOW(), NOW())
       RETURNING id`,
      [`PORTAL-APPT-${suffix}`, contactId, caseTypeId, activeStatusId, 'Appointments Case', adminUserId]
    );
    caseId = caseResult.rows[0].id as string;
    createdCaseIds.push(caseId);

    const slotStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 45 * 60 * 1000);

    const slotResult = await request(app)
      .post('/api/portal/admin/appointment-slots')
      .set('Authorization', `Bearer ${buildAdminToken()}`)
      .send({
        pointperson_user_id: adminUserId,
        case_id: caseId,
        title: 'Initial booking slot',
        details: 'Bring supporting documents',
        location: 'Main office',
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        capacity: 1,
      })
      .expect(201);

    slotId = slotResult.body.slot.id as string;
    createdSlotIds.push(slotId);
  });

  afterAll(async () => {
    if (createdAppointmentIds.length > 0) {
      await pool.query('DELETE FROM appointments WHERE id = ANY($1)', [createdAppointmentIds]);
    }
    if (createdSlotIds.length > 0) {
      await pool.query('DELETE FROM appointment_availability_slots WHERE id = ANY($1)', [createdSlotIds]);
    }
    if (createdCaseIds.length > 0) {
      await pool.query('DELETE FROM cases WHERE id = ANY($1)', [createdCaseIds]);
    }
    if (createdPortalUserIds.length > 0) {
      await pool.query('DELETE FROM portal_users WHERE id = ANY($1)', [createdPortalUserIds]);
    }
    if (createdContactIds.length > 0) {
      await pool.query('DELETE FROM contacts WHERE id = ANY($1)', [createdContactIds]);
    }
    if (createdStatusIds.length > 0) {
      await pool.query('DELETE FROM case_statuses WHERE id = ANY($1)', [createdStatusIds]);
    }
    if (createdCaseTypeIds.length > 0) {
      await pool.query('DELETE FROM case_types WHERE id = ANY($1)', [createdCaseTypeIds]);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
    }
  });

  it('books a published slot and blocks double booking when slot reaches capacity', async () => {
    const portalToken = buildPortalToken();

    const bookingResponse = await request(app)
      .post(`/api/portal/appointments/slots/${slotId}/book`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({ case_id: caseId })
      .expect(201);

    expect(bookingResponse.body.appointment.request_type).toBe('slot_booking');
    createdAppointmentIds.push(bookingResponse.body.appointment.id as string);

    const secondAttempt = await request(app)
      .post(`/api/portal/appointments/slots/${slotId}/book`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({ case_id: caseId })
      .expect(400);

    expect(secondAttempt.body.error).toMatch(/fully booked|not open/i);
  });

  it('creates and cancels a manual appointment request', async () => {
    const portalToken = buildPortalToken();
    const startTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const createResponse = await request(app)
      .post('/api/portal/appointments/requests')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: caseId,
        title: 'Manual request',
        description: 'Need to discuss service options',
        start_time: startTime,
      })
      .expect(201);

    const appointmentId = createResponse.body.appointment.id as string;
    createdAppointmentIds.push(appointmentId);
    expect(createResponse.body.appointment.request_type).toBe('manual_request');

    const cancelResponse = await request(app)
      .patch(`/api/portal/appointments/${appointmentId}/cancel`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .expect(200);

    expect(cancelResponse.body.appointment.status).toBe('cancelled');
  });
});
