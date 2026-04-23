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
  const unwrap = <T>(body: { data?: T } | T): T =>
    (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

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
         client_viewable,
         assigned_to,
         created_by,
         modified_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, true, $6, $6, $6, NOW(), NOW())
       RETURNING id`,
      [`PORTAL-APPT-${suffix}`, contactId, caseTypeId, activeStatusId, 'Appointments Case', adminUserId]
    );
    caseId = caseResult.rows[0].id as string;
    createdCaseIds.push(caseId);

    const slotStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 45 * 60 * 1000);

    const slotResult = await request(app)
      .post('/api/v2/portal/admin/appointment-slots')
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

    const createdSlot = unwrap<{ slot: { id: string } }>(slotResult.body);
    slotId = createdSlot.slot.id as string;
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
      .post(`/api/v2/portal/appointments/slots/${slotId}/book`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({ case_id: caseId })
      .expect(201);

    const booked = unwrap<{
      appointment: {
        id: string;
        request_type: string;
        case_id?: string | null;
        case_number?: string | null;
        case_title?: string | null;
        pointperson_first_name?: string | null;
        pointperson_last_name?: string | null;
      };
    }>(bookingResponse.body);
    expect(booked.appointment.request_type).toBe('slot_booking');
    expect(booked.appointment.case_id).toBe(caseId);
    expect(booked.appointment.case_number).toMatch(/^PORTAL-APPT-/);
    expect(booked.appointment.case_title).toBe('Appointments Case');
    expect(booked.appointment.pointperson_first_name).toBe('Portal');
    expect(booked.appointment.pointperson_last_name).toBe('Scheduler');
    expect(booked.appointment).not.toHaveProperty('missing_note');
    expect(booked.appointment).not.toHaveProperty('missing_outcome');
    expect(booked.appointment).not.toHaveProperty('pointperson_email');
    createdAppointmentIds.push(booked.appointment.id as string);

    const secondAttempt = await request(app)
      .post(`/api/v2/portal/appointments/slots/${slotId}/book`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({ case_id: caseId })
      .expect(400);

    expect(secondAttempt.body.error?.message ?? secondAttempt.body.error).toMatch(/fully booked|not open/i);
  });

  it('allows duplicate bookings for the same contact when slot capacity allows it', async () => {
    const portalToken = buildPortalToken();
    const adminToken = buildAdminToken();
    const now = Date.now();
    const slotStart = new Date(now + 16 * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    const slotResponse = await request(app)
      .post('/api/v2/portal/admin/appointment-slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pointperson_user_id: adminUserId,
        case_id: caseId,
        title: 'Duplicate booking slot',
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        capacity: 2,
      })
      .expect(201);

    const duplicateSlotId = unwrap<{ slot: { id: string } }>(slotResponse.body).slot.id as string;
    createdSlotIds.push(duplicateSlotId);

    const first = await request(app)
      .post(`/api/v2/portal/appointments/slots/${duplicateSlotId}/book`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({ case_id: caseId })
      .expect(201);

    const second = await request(app)
      .post(`/api/v2/portal/appointments/slots/${duplicateSlotId}/book`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({ case_id: caseId })
      .expect(201);

    const firstAppointment = unwrap<{ appointment: { id: string } }>(first.body);
    const secondAppointment = unwrap<{ appointment: { id: string } }>(second.body);
    createdAppointmentIds.push(firstAppointment.appointment.id as string);
    createdAppointmentIds.push(secondAppointment.appointment.id as string);

    const slotStateResult = await pool.query<{ booked_count: number; status: string }>(
      `SELECT booked_count, status
       FROM appointment_availability_slots
       WHERE id = $1`,
      [duplicateSlotId]
    );
    expect(Number(slotStateResult.rows[0]?.booked_count || 0)).toBe(2);
    expect(slotStateResult.rows[0]?.status).toBe('closed');
  });

  it('creates and cancels a manual appointment request', async () => {
    const portalToken = buildPortalToken();
    const startTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const createResponse = await request(app)
      .post('/api/v2/portal/appointments/requests')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: caseId,
        title: 'Manual request',
        description: 'Need to discuss service options',
        start_time: startTime,
      })
      .expect(201);

    const created = unwrap<{
      appointment: {
        id: string;
        request_type: string;
        case_id?: string | null;
        case_number?: string | null;
        case_title?: string | null;
        pointperson_first_name?: string | null;
        pointperson_last_name?: string | null;
      };
    }>(createResponse.body);
    const appointmentId = created.appointment.id as string;
    createdAppointmentIds.push(appointmentId);
    expect(created.appointment.request_type).toBe('manual_request');
    expect(created.appointment.case_id).toBe(caseId);
    expect(created.appointment.case_title).toBe('Appointments Case');
    expect(created.appointment.pointperson_first_name).toBe('Portal');
    expect(created.appointment.pointperson_last_name).toBe('Scheduler');
    expect(created.appointment).not.toHaveProperty('missing_note');
    expect(created.appointment).not.toHaveProperty('missing_outcome');

    const cancelResponse = await request(app)
      .patch(`/api/v2/portal/appointments/${appointmentId}/cancel`)
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .expect(200);

    const cancelled = unwrap<{
      appointment: {
        status: string;
        case_id?: string | null;
        pointperson_first_name?: string | null;
        pointperson_last_name?: string | null;
      };
    }>(cancelResponse.body);
    expect(cancelled.appointment.status).toBe('cancelled');
    expect(cancelled.appointment.case_id).toBe(caseId);
    expect(cancelled.appointment.pointperson_first_name).toBe('Portal');
    expect(cancelled.appointment.pointperson_last_name).toBe('Scheduler');
    expect(cancelled.appointment).not.toHaveProperty('missing_note');
    expect(cancelled.appointment).not.toHaveProperty('missing_outcome');
  });

  it('supports appointment and slot filtering with pagination parameters', async () => {
    const portalToken = buildPortalToken();
    const adminToken = buildAdminToken();
    const now = Date.now();

    const requestedStart = new Date(now + 8 * 60 * 60 * 1000).toISOString();
    const requestedResponse = await request(app)
      .post('/api/v2/portal/appointments/requests')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .send({
        case_id: caseId,
        title: 'Filter target appointment',
        description: 'Filtering coverage',
        start_time: requestedStart,
      })
      .expect(201);

    const requestedAppointment = unwrap<{ appointment: { id: string } }>(requestedResponse.body);
    createdAppointmentIds.push(requestedAppointment.appointment.id as string);

    const filteredAppointmentsResponse = await request(app)
      .get('/api/v2/portal/appointments')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .query({
        status: 'requested',
        case_id: caseId,
        search: 'Filter target',
        limit: 1,
        offset: 0,
      })
      .expect(200);

    const filteredAppointments = unwrap<
      Array<{
        id: string;
        status: string;
        case_id?: string | null;
        case_number?: string | null;
        case_title?: string | null;
        pointperson_first_name?: string | null;
        pointperson_last_name?: string | null;
      }>
    >(
      filteredAppointmentsResponse.body
    );
    expect(filteredAppointments.length).toBe(1);
    expect(filteredAppointments[0]?.status).toBe('requested');
    expect(filteredAppointments[0]?.id).toBe(requestedAppointment.appointment.id);
    expect(filteredAppointments[0]?.case_id).toBe(caseId);
    expect(filteredAppointments[0]?.case_number).toMatch(/^PORTAL-APPT-/);
    expect(filteredAppointments[0]?.case_title).toBe('Appointments Case');
    expect(filteredAppointments[0]?.pointperson_first_name).toBe('Portal');
    expect(filteredAppointments[0]?.pointperson_last_name).toBe('Scheduler');
    expect(filteredAppointments[0]).not.toHaveProperty('missing_note');
    expect(filteredAppointments[0]).not.toHaveProperty('missing_outcome');
    expect(filteredAppointments[0]).not.toHaveProperty('pointperson_email');

    const openSlotStart = new Date(now + 10 * 60 * 60 * 1000);
    const openSlotEnd = new Date(openSlotStart.getTime() + 30 * 60 * 1000);
    const openSlotResponse = await request(app)
      .post('/api/v2/portal/admin/appointment-slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pointperson_user_id: adminUserId,
        case_id: caseId,
        title: 'Filter Open Slot',
        start_time: openSlotStart.toISOString(),
        end_time: openSlotEnd.toISOString(),
        capacity: 2,
      })
      .expect(201);

    const openSlotId = unwrap<{ slot: { id: string } }>(openSlotResponse.body).slot.id as string;
    createdSlotIds.push(openSlotId);

    const closedSlotStart = new Date(now + 12 * 60 * 60 * 1000);
    const closedSlotEnd = new Date(closedSlotStart.getTime() + 30 * 60 * 1000);
    const closedSlotResponse = await request(app)
      .post('/api/v2/portal/admin/appointment-slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pointperson_user_id: adminUserId,
        case_id: caseId,
        title: 'Filter Closed Slot',
        start_time: closedSlotStart.toISOString(),
        end_time: closedSlotEnd.toISOString(),
        capacity: 2,
      })
      .expect(201);

    const closedSlotId = unwrap<{ slot: { id: string } }>(closedSlotResponse.body).slot.id as string;
    createdSlotIds.push(closedSlotId);

    await request(app)
      .patch(`/api/v2/portal/admin/appointment-slots/${closedSlotId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'closed' })
      .expect(200);

    const filteredSlotsResponse = await request(app)
      .get('/api/v2/portal/admin/appointment-slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        status: 'open',
        case_id: caseId,
        from: new Date(now + 9 * 60 * 60 * 1000).toISOString(),
        to: new Date(now + 11 * 60 * 60 * 1000).toISOString(),
        limit: 10,
        offset: 0,
      })
      .expect(200);

    const filteredSlots = filteredSlotsResponse.body.slots as Array<{ id: string; status: string }>;
    expect(filteredSlots.some((slot) => slot.id === openSlotId)).toBe(true);
    expect(filteredSlots.some((slot) => slot.id === closedSlotId)).toBe(false);
  });

  it('filters portal-visible appointment slots by date range', async () => {
    const portalToken = buildPortalToken();
    const adminToken = buildAdminToken();
    const now = Date.now();

    const inRangeStart = new Date(now + 26 * 60 * 60 * 1000);
    const inRangeEnd = new Date(inRangeStart.getTime() + 30 * 60 * 1000);
    const inRangeResponse = await request(app)
      .post('/api/v2/portal/admin/appointment-slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pointperson_user_id: adminUserId,
        case_id: caseId,
        title: 'Portal in-range slot',
        start_time: inRangeStart.toISOString(),
        end_time: inRangeEnd.toISOString(),
        capacity: 1,
      })
      .expect(201);

    const inRangeSlotId = unwrap<{ slot: { id: string } }>(inRangeResponse.body).slot.id as string;
    createdSlotIds.push(inRangeSlotId);

    const outOfRangeStart = new Date(now + 32 * 60 * 60 * 1000);
    const outOfRangeEnd = new Date(outOfRangeStart.getTime() + 30 * 60 * 1000);
    const outOfRangeResponse = await request(app)
      .post('/api/v2/portal/admin/appointment-slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pointperson_user_id: adminUserId,
        case_id: caseId,
        title: 'Portal out-of-range slot',
        start_time: outOfRangeStart.toISOString(),
        end_time: outOfRangeEnd.toISOString(),
        capacity: 1,
      })
      .expect(201);

    const outOfRangeSlotId = unwrap<{ slot: { id: string } }>(outOfRangeResponse.body).slot.id as string;
    createdSlotIds.push(outOfRangeSlotId);

    const filteredSlotsResponse = await request(app)
      .get('/api/v2/portal/appointments/slots')
      .set('Cookie', [`portal_auth_token=${portalToken}`])
      .query({
        case_id: caseId,
        from: new Date(now + 25 * 60 * 60 * 1000).toISOString(),
        to: new Date(now + 27 * 60 * 60 * 1000).toISOString(),
      })
      .expect(200);

    const filteredSlots = unwrap<{
      selected_case_id: string | null;
      selected_pointperson_user_id: string | null;
      slots: Array<{
        id: string;
        case_number?: string | null;
        case_title?: string | null;
        pointperson_first_name?: string | null;
        pointperson_last_name?: string | null;
      }>;
    }>(filteredSlotsResponse.body);

    expect(filteredSlots.selected_case_id).toBe(caseId);
    expect(filteredSlots.selected_pointperson_user_id).toBe(adminUserId);
    expect(filteredSlots.slots.some((slot) => slot.id === inRangeSlotId)).toBe(true);
    expect(filteredSlots.slots.some((slot) => slot.id === outOfRangeSlotId)).toBe(false);
    const inRangeSlot = filteredSlots.slots.find((slot) => slot.id === inRangeSlotId);
    expect(inRangeSlot?.case_number).toMatch(/^PORTAL-APPT-/);
    expect(inRangeSlot?.case_title).toBe('Appointments Case');
    expect(inRangeSlot?.pointperson_first_name).toBe('Portal');
    expect(inRangeSlot?.pointperson_last_name).toBe('Scheduler');
    expect(inRangeSlot).not.toHaveProperty('pointperson_email');
  });

  it('supports admin appointment inbox, reminder history/manual send, and check-in', async () => {
    const adminToken = buildAdminToken();

    const inboxStart = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
    const createResponse = await request(app)
      .post('/api/v2/portal/appointments/requests')
      .set('Cookie', [`portal_auth_token=${buildPortalToken()}`])
      .send({
        case_id: caseId,
        title: 'Inbox reminder appointment',
        description: 'Admin inbox flow test',
        start_time: inboxStart,
      })
      .expect(201);

    const created = unwrap<{ appointment: { id: string } }>(createResponse.body);
    const appointmentId = created.appointment.id as string;
    createdAppointmentIds.push(appointmentId);

    await request(app)
      .patch(`/api/v2/portal/admin/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' })
      .expect(200);

    const inboxResponse = await request(app)
      .get('/api/v2/portal/admin/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'confirmed', page: 1, limit: 20 })
      .expect(200);

    const inboxRows = (inboxResponse.body.data?.data ?? []) as Array<{ id: string }>;
    expect(inboxRows.some((row) => row.id === appointmentId)).toBe(true);

    const remindersResponse = await request(app)
      .get(`/api/v2/portal/admin/appointments/${appointmentId}/reminders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const reminderJobs = remindersResponse.body.jobs as Array<{ cadence_key: string; channel: string }>;
    expect(reminderJobs.length).toBeGreaterThanOrEqual(1);
    expect(reminderJobs.some((job) => job.cadence_key === '2h')).toBe(true);

    const sendResponse = await request(app)
      .post(`/api/v2/portal/admin/appointments/${appointmentId}/reminders/send`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sendEmail: true, sendSms: false, customMessage: 'Testing reminder send' })
      .expect(200);

    expect(sendResponse.body.summary).toBeDefined();

    const checkInResponse = await request(app)
      .post(`/api/v2/portal/admin/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(checkInResponse.body.appointment?.status).toBe('completed');
    expect(checkInResponse.body.appointment?.checked_in_at).toBeTruthy();
  });
});
