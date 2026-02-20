import pool from '@config/database';
import { resolvePortalCaseSelection } from '@services/portalPointpersonService';

export interface AppointmentSlot {
  id: string;
  pointperson_user_id: string;
  case_id: string | null;
  title: string | null;
  details: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  status: 'open' | 'closed' | 'cancelled';
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  available_count?: number;
}

export interface PortalAppointment {
  id: string;
  contact_id: string;
  case_id: string | null;
  pointperson_user_id: string | null;
  slot_id: string | null;
  request_type: 'manual_request' | 'slot_booking';
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  location: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  portal_user_id?: string | null;
  portal_email?: string | null;
}

const APPOINTMENT_SELECT = `
  SELECT
    a.id,
    a.contact_id,
    a.case_id,
    a.pointperson_user_id,
    a.slot_id,
    a.request_type,
    a.title,
    a.description,
    a.start_time,
    a.end_time,
    a.status,
    a.location,
    a.created_at,
    a.updated_at,
    c.case_number,
    c.title AS case_title,
    u.first_name AS pointperson_first_name,
    u.last_name AS pointperson_last_name,
    u.email AS pointperson_email,
    pu.id AS portal_user_id,
    pu.email AS portal_email
  FROM appointments a
  LEFT JOIN cases c ON c.id = a.case_id
  LEFT JOIN users u ON u.id = a.pointperson_user_id
  LEFT JOIN portal_users pu ON pu.id = a.requested_by_portal
`;

const SLOT_SELECT = `
  SELECT
    s.*,
    c.case_number,
    c.title AS case_title,
    u.first_name AS pointperson_first_name,
    u.last_name AS pointperson_last_name,
    u.email AS pointperson_email,
    GREATEST(s.capacity - s.booked_count, 0) AS available_count
  FROM appointment_availability_slots s
  LEFT JOIN cases c ON c.id = s.case_id
  LEFT JOIN users u ON u.id = s.pointperson_user_id
`;

const normalizeSlot = (row: Record<string, unknown>): AppointmentSlot => {
  return {
    ...(row as unknown as AppointmentSlot),
    capacity: Number(row.capacity || 0),
    booked_count: Number(row.booked_count || 0),
    available_count: Number(row.available_count || 0),
  };
};

export const listPortalAppointmentSlots = async (
  contactId: string,
  caseId?: string | null
): Promise<{ selected_case_id: string | null; selected_pointperson_user_id: string | null; slots: AppointmentSlot[] }> => {
  const selection = await resolvePortalCaseSelection(contactId, caseId);
  const selectedCase = selection.selected_case;

  if (!selectedCase || !selectedCase.assigned_to) {
    return {
      selected_case_id: selection.selected_case_id,
      selected_pointperson_user_id: selection.selected_pointperson_user_id,
      slots: [],
    };
  }

  const result = await pool.query(
    `${SLOT_SELECT}
     WHERE s.status = 'open'
       AND s.start_time >= NOW()
       AND s.pointperson_user_id = $1
       AND (s.case_id IS NULL OR s.case_id = $2)
       AND s.capacity > s.booked_count
     ORDER BY s.start_time ASC`,
    [selectedCase.assigned_to, selectedCase.case_id]
  );

  return {
    selected_case_id: selectedCase.case_id,
    selected_pointperson_user_id: selectedCase.assigned_to,
    slots: result.rows.map((row) => normalizeSlot(row as Record<string, unknown>)),
  };
};

export const listAdminAppointmentSlots = async (filters?: {
  status?: 'open' | 'closed' | 'cancelled';
  pointpersonUserId?: string;
  caseId?: string;
}): Promise<AppointmentSlot[]> => {
  const conditions: string[] = [];
  const values: string[] = [];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`s.status = $${values.length}`);
  }

  if (filters?.pointpersonUserId) {
    values.push(filters.pointpersonUserId);
    conditions.push(`s.pointperson_user_id = $${values.length}`);
  }

  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`s.case_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `${SLOT_SELECT}
     ${whereClause}
     ORDER BY s.start_time ASC`,
    values
  );

  return result.rows.map((row) => normalizeSlot(row as Record<string, unknown>));
};

export const createAppointmentSlot = async (input: {
  pointpersonUserId: string;
  caseId?: string | null;
  title?: string | null;
  details?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  capacity?: number;
  userId: string;
}): Promise<AppointmentSlot> => {
  const result = await pool.query(
    `INSERT INTO appointment_availability_slots (
      pointperson_user_id,
      case_id,
      title,
      details,
      location,
      start_time,
      end_time,
      capacity,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    RETURNING id`,
    [
      input.pointpersonUserId,
      input.caseId || null,
      input.title?.trim() || null,
      input.details?.trim() || null,
      input.location?.trim() || null,
      input.startTime,
      input.endTime,
      input.capacity || 1,
      input.userId,
    ]
  );

  const slot = await getSlotById(result.rows[0].id as string);
  if (!slot) {
    throw new Error('Failed to create slot');
  }
  return slot;
};

export const updateAppointmentSlot = async (input: {
  slotId: string;
  pointpersonUserId?: string;
  caseId?: string | null;
  title?: string | null;
  details?: string | null;
  location?: string | null;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  status?: 'open' | 'closed' | 'cancelled';
  userId: string;
}): Promise<AppointmentSlot | null> => {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  const pushField = (field: string, value: string | number | null) => {
    values.push(value);
    fields.push(`${field} = $${values.length}`);
  };

  if (input.pointpersonUserId !== undefined) pushField('pointperson_user_id', input.pointpersonUserId);
  if (input.caseId !== undefined) pushField('case_id', input.caseId);
  if (input.title !== undefined) pushField('title', input.title?.trim() || null);
  if (input.details !== undefined) pushField('details', input.details?.trim() || null);
  if (input.location !== undefined) pushField('location', input.location?.trim() || null);
  if (input.startTime !== undefined) pushField('start_time', input.startTime);
  if (input.endTime !== undefined) pushField('end_time', input.endTime);
  if (input.capacity !== undefined) pushField('capacity', input.capacity);
  if (input.status !== undefined) pushField('status', input.status);

  if (fields.length === 0) {
    return getSlotById(input.slotId);
  }

  pushField('updated_by', input.userId);
  fields.push('updated_at = NOW()');
  values.push(input.slotId);

  const result = await pool.query(
    `UPDATE appointment_availability_slots
     SET ${fields.join(', ')}
     WHERE id = $${values.length}
     RETURNING id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return getSlotById(input.slotId);
};

export const deleteAppointmentSlot = async (slotId: string): Promise<boolean> => {
  const appointmentsUsingSlot = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM appointments
     WHERE slot_id = $1
       AND status != 'cancelled'`,
    [slotId]
  );

  const count = Number(appointmentsUsingSlot.rows[0]?.count || 0);
  if (count > 0) {
    await pool.query(
      `UPDATE appointment_availability_slots
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [slotId]
    );
    return true;
  }

  const result = await pool.query('DELETE FROM appointment_availability_slots WHERE id = $1 RETURNING id', [slotId]);
  return Boolean(result.rows[0]);
};

export const getSlotById = async (slotId: string): Promise<AppointmentSlot | null> => {
  const result = await pool.query(
    `${SLOT_SELECT}
     WHERE s.id = $1`,
    [slotId]
  );

  if (!result.rows[0]) {
    return null;
  }

  return normalizeSlot(result.rows[0] as Record<string, unknown>);
};

export const bookPortalAppointmentSlot = async (input: {
  slotId: string;
  contactId: string;
  portalUserId: string;
  caseId?: string | null;
  title?: string | null;
  description?: string | null;
}): Promise<PortalAppointment> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the slot row directly before reading joined/aggregated slot details.
    await client.query(
      `SELECT id
       FROM appointment_availability_slots
       WHERE id = $1
       FOR UPDATE`,
      [input.slotId]
    );

    const slotResult = await client.query(
      `${SLOT_SELECT}
       WHERE s.id = $1`,
      [input.slotId]
    );

    const slot = slotResult.rows[0] as (AppointmentSlot & { available_count: number }) | undefined;
    if (!slot) {
      throw new Error('Slot not found');
    }
    if (slot.status !== 'open') {
      throw new Error('Slot is not open for booking');
    }
    if (Number(slot.capacity) <= Number(slot.booked_count)) {
      throw new Error('Slot is fully booked');
    }

    const selection = await resolvePortalCaseSelection(input.contactId, input.caseId || slot.case_id || undefined);
    const selectedCase = selection.selected_case;

    if (!selectedCase || !selectedCase.assigned_to) {
      throw new Error('Selected case does not have an assigned pointperson');
    }

    if (selectedCase.assigned_to !== slot.pointperson_user_id) {
      throw new Error('Selected case pointperson does not match slot owner');
    }

    if (slot.case_id && selectedCase.case_id !== slot.case_id) {
      throw new Error('Slot is bound to a different case');
    }

    const appointmentInsert = await client.query(
      `INSERT INTO appointments (
        contact_id,
        title,
        description,
        start_time,
        end_time,
        status,
        location,
        requested_by_portal,
        case_id,
        pointperson_user_id,
        slot_id,
        request_type
      ) VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, $9, $10, 'slot_booking')
      RETURNING id`,
      [
        input.contactId,
        input.title?.trim() || slot.title || 'Appointment',
        input.description?.trim() || slot.details || null,
        slot.start_time,
        slot.end_time,
        slot.location || null,
        input.portalUserId,
        selectedCase.case_id,
        selectedCase.assigned_to,
        slot.id,
      ]
    );

    await client.query(
      `UPDATE appointment_availability_slots
       SET booked_count = booked_count + 1,
           status = CASE WHEN booked_count + 1 >= capacity THEN 'closed' ELSE status END,
           updated_at = NOW()
       WHERE id = $1`,
      [slot.id]
    );

    await client.query('COMMIT');

    const appointment = await getAppointmentById(appointmentInsert.rows[0].id as string);
    if (!appointment) {
      throw new Error('Failed to load booked appointment');
    }

    return appointment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createPortalManualAppointmentRequest = async (input: {
  contactId: string;
  portalUserId: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  description?: string | null;
  location?: string | null;
  caseId?: string | null;
}): Promise<PortalAppointment> => {
  const selection = await resolvePortalCaseSelection(input.contactId, input.caseId);
  const selectedCase = selection.selected_case;

  if (!selectedCase || !selectedCase.assigned_to) {
    throw new Error('Selected case does not have an assigned pointperson');
  }

  const result = await pool.query(
    `INSERT INTO appointments (
      contact_id,
      title,
      description,
      start_time,
      end_time,
      status,
      location,
      requested_by_portal,
      case_id,
      pointperson_user_id,
      request_type
    ) VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7, $8, $9, 'manual_request')
    RETURNING id`,
    [
      input.contactId,
      input.title.trim(),
      input.description?.trim() || null,
      input.startTime,
      input.endTime || null,
      input.location?.trim() || null,
      input.portalUserId,
      selectedCase.case_id,
      selectedCase.assigned_to,
    ]
  );

  const appointment = await getAppointmentById(result.rows[0].id as string);
  if (!appointment) {
    throw new Error('Failed to create appointment request');
  }
  return appointment;
};

export const listPortalAppointments = async (contactId: string): Promise<PortalAppointment[]> => {
  const result = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE a.contact_id = $1
     ORDER BY a.start_time ASC`,
    [contactId]
  );

  return result.rows as PortalAppointment[];
};

export const getAppointmentById = async (appointmentId: string): Promise<PortalAppointment | null> => {
  const result = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE a.id = $1`,
    [appointmentId]
  );

  return (result.rows[0] as PortalAppointment | undefined) || null;
};

export const cancelPortalAppointment = async (input: {
  appointmentId: string;
  contactId: string;
}): Promise<PortalAppointment | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT id, status, slot_id
       FROM appointments
       WHERE id = $1 AND contact_id = $2
       FOR UPDATE`,
      [input.appointmentId, input.contactId]
    );

    const current = currentResult.rows[0] as { id: string; status: string; slot_id: string | null } | undefined;
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [input.appointmentId]
    );

    if (current.slot_id && current.status !== 'cancelled') {
      await client.query(
        `UPDATE appointment_availability_slots
         SET booked_count = GREATEST(booked_count - 1, 0),
             status = CASE
               WHEN status = 'closed' AND booked_count - 1 < capacity THEN 'open'
               ELSE status
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [current.slot_id]
      );
    }

    await client.query('COMMIT');

    return getAppointmentById(input.appointmentId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateAppointmentStatusByStaff = async (input: {
  appointmentId: string;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
}): Promise<PortalAppointment | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT id, status, slot_id
       FROM appointments
       WHERE id = $1
       FOR UPDATE`,
      [input.appointmentId]
    );

    const current = currentResult.rows[0] as { id: string; status: string; slot_id: string | null } | undefined;
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE appointments
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [input.status, input.appointmentId]
    );

    if (current.slot_id && input.status === 'cancelled' && current.status !== 'cancelled') {
      await client.query(
        `UPDATE appointment_availability_slots
         SET booked_count = GREATEST(booked_count - 1, 0),
             status = CASE
               WHEN status = 'closed' AND booked_count - 1 < capacity THEN 'open'
               ELSE status
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [current.slot_id]
      );
    }

    await client.query('COMMIT');
    return getAppointmentById(input.appointmentId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
