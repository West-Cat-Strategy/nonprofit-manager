import pool from '@config/database';
import { resolvePortalCaseSelection } from '@services/portalPointpersonService';
import type { AppointmentSlot, PortalAppointment } from '../portalAppointmentSlotService';
import { APPOINTMENT_SELECT, SLOT_SELECT, normalizeSlot } from './helpers';

export const listPortalAppointmentSlots = async (
  contactId: string,
  filters?: { caseId?: string | null; from?: string; to?: string }
): Promise<{ selected_case_id: string | null; selected_pointperson_user_id: string | null; slots: AppointmentSlot[] }> => {
  const selection = await resolvePortalCaseSelection(contactId, filters?.caseId);
  const selectedCase = selection.selected_case;
  if (!selectedCase || !selectedCase.assigned_to) {
    return {
      selected_case_id: selection.selected_case_id,
      selected_pointperson_user_id: selection.selected_pointperson_user_id,
      slots: [],
    };
  }

  const values: Array<string | number | null> = [selectedCase.assigned_to, selectedCase.case_id];
  let whereClause = `
     WHERE s.status = 'open'
       AND s.start_time >= NOW()
       AND s.pointperson_user_id = $1
       AND (s.case_id IS NULL OR s.case_id = $2)
       AND s.capacity > s.booked_count`;

  if (filters?.from) {
    values.push(filters.from);
    whereClause += ` AND s.start_time >= $${values.length}`;
  }

  if (filters?.to) {
    values.push(filters.to);
    whereClause += ` AND s.start_time <= $${values.length}`;
  }

  const result = await pool.query(
    `${SLOT_SELECT}
     ${whereClause}
     ORDER BY s.start_time ASC`,
    values
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
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<AppointmentSlot[]> => {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

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

  if (filters?.from) {
    values.push(filters.from);
    conditions.push(`s.start_time >= $${values.length}`);
  }

  if (filters?.to) {
    values.push(filters.to);
    conditions.push(`s.start_time <= $${values.length}`);
  }

  let paginationSql = '';
  if (typeof filters?.limit === 'number') {
    values.push(filters.limit);
    paginationSql += ` LIMIT $${values.length}`;
  }
  if (typeof filters?.offset === 'number' && filters.offset > 0) {
    values.push(filters.offset);
    paginationSql += ` OFFSET $${values.length}`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `${SLOT_SELECT}
     ${whereClause}
     ORDER BY s.start_time ASC${paginationSql}`,
    values
  );

  return result.rows.map((row) => normalizeSlot(row as Record<string, unknown>));
};

export const listAdminAppointments = async (filters?: {
  status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  requestType?: 'manual_request' | 'slot_booking';
  caseId?: string;
  pointpersonUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: PortalAppointment[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
  const page = Math.max(1, filters?.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`a.status = $${values.length}`);
  }
  if (filters?.requestType) {
    values.push(filters.requestType);
    conditions.push(`a.request_type = $${values.length}`);
  }
  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`a.case_id = $${values.length}`);
  }
  if (filters?.pointpersonUserId) {
    values.push(filters.pointpersonUserId);
    conditions.push(`a.pointperson_user_id = $${values.length}`);
  }
  if (filters?.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`a.start_time >= $${values.length}`);
  }
  if (filters?.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`a.start_time <= $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM appointments a
     ${whereClause}`,
    values
  );
  const total = Number.parseInt(countResult.rows[0]?.total || '0', 10);

  const pagedValues = [...values, limit, offset];
  const rows = await pool.query<PortalAppointment>(
    `${APPOINTMENT_SELECT}
     ${whereClause}
     ORDER BY a.start_time ASC
     LIMIT $${pagedValues.length - 1}
     OFFSET $${pagedValues.length}`,
    pagedValues
  );

  return {
    data: rows.rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  };
};

export const listPortalAppointments = async (
  contactId: string,
  filters?: {
    status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
    caseId?: string;
    from?: string;
    to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<PortalAppointment[]> => {
  const conditions: string[] = ['a.contact_id = $1'];
  const values: Array<string | number> = [contactId];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`a.case_id = $${values.length}`);
  }

  if (filters?.from) {
    values.push(filters.from);
    conditions.push(`a.start_time >= $${values.length}`);
  }

  if (filters?.to) {
    values.push(filters.to);
    conditions.push(`a.start_time <= $${values.length}`);
  }

  if (filters?.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(COALESCE(a.title, '') ILIKE $${values.length}
        OR COALESCE(a.description, '') ILIKE $${values.length}
        OR COALESCE(c.case_number, '') ILIKE $${values.length}
        OR COALESCE(c.title, '') ILIKE $${values.length}
        OR COALESCE(a.location, '') ILIKE $${values.length}
        OR COALESCE(a.status, '') ILIKE $${values.length})`
    );
  }

  let paginationSql = '';
  if (typeof filters?.limit === 'number') {
    values.push(filters.limit);
    paginationSql += ` LIMIT $${values.length}`;
  }
  if (typeof filters?.offset === 'number' && filters.offset > 0) {
    values.push(filters.offset);
    paginationSql += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.start_time ASC${paginationSql}`,
    values
  );

  return result.rows as PortalAppointment[];
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

export const getAppointmentById = async (appointmentId: string): Promise<PortalAppointment | null> => {
  const result = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE a.id = $1`,
    [appointmentId]
  );

  return (result.rows[0] as PortalAppointment | undefined) || null;
};
