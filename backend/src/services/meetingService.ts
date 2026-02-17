import pool from '@config/database';
import { logger } from '@config/logger';
import type { Committee, Meeting, MeetingAgendaItem, MeetingMotion, MeetingActionItem, MeetingDetail } from '@app-types/meeting';

export const listCommittees = async (): Promise<Committee[]> => {
  const result = await pool.query(
    `SELECT id, name, description, is_system, created_at, updated_at
     FROM committees
     ORDER BY is_system DESC, name ASC`
  );
  return result.rows;
};

export const listMeetings = async (filters: {
  committee_id?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<Meeting[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.committee_id) {
    conditions.push(`committee_id = $${idx++}`);
    params.push(filters.committee_id);
  }
  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.from) {
    conditions.push(`starts_at >= $${idx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`starts_at <= $${idx++}`);
    params.push(filters.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);

  const result = await pool.query(
    `SELECT id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
            presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at
     FROM meetings
     ${where}
     ORDER BY starts_at DESC
     LIMIT $${idx}`,
    [...params, limit]
  );
  return result.rows;
};

export const getMeetingDetail = async (meetingId: string): Promise<MeetingDetail | null> => {
  const meetingResult = await pool.query(
    `SELECT id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
            presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at
     FROM meetings
     WHERE id = $1`,
    [meetingId]
  );
  if (meetingResult.rows.length === 0) return null;

  const meeting: Meeting = meetingResult.rows[0];

  const committee = meeting.committee_id
    ? (await pool.query(
        `SELECT id, name, description, is_system, created_at, updated_at
         FROM committees
         WHERE id = $1`,
        [meeting.committee_id]
      )).rows[0] || null
    : null;

  const [agendaItems, motions, actionItems] = await Promise.all([
    pool.query(
      `SELECT id, meeting_id, position, title, description, item_type, duration_minutes,
              presenter_contact_id, status, created_at, updated_at
       FROM meeting_agenda_items
       WHERE meeting_id = $1
       ORDER BY position ASC`,
      [meetingId]
    ),
    pool.query(
      `SELECT id, meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id,
              seconded_by_contact_id, status, votes_for, votes_against, votes_abstain, result_notes,
              created_at, updated_at
       FROM meeting_motions
       WHERE meeting_id = $1
       ORDER BY created_at ASC`,
      [meetingId]
    ),
    pool.query(
      `SELECT id, meeting_id, motion_id, subject, description, assigned_contact_id, due_date,
              status, created_at, updated_at
       FROM meeting_action_items
       WHERE meeting_id = $1
       ORDER BY created_at DESC`,
      [meetingId]
    ),
  ]);

  return {
    meeting,
    committee,
    agenda_items: agendaItems.rows as MeetingAgendaItem[],
    motions: motions.rows as MeetingMotion[],
    action_items: actionItems.rows as MeetingActionItem[],
  };
};

export const createMeeting = async (input: {
  committee_id?: string | null;
  meeting_type: Meeting['meeting_type'];
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  presiding_contact_id?: string | null;
  secretary_contact_id?: string | null;
}, userId: string): Promise<Meeting> => {
  const result = await pool.query(
    `INSERT INTO meetings (
      committee_id, meeting_type, title, starts_at, ends_at, location,
      presiding_contact_id, secretary_contact_id, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
    RETURNING id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
              presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at`,
    [
      input.committee_id || null,
      input.meeting_type,
      input.title,
      input.starts_at,
      input.ends_at || null,
      input.location || null,
      input.presiding_contact_id || null,
      input.secretary_contact_id || null,
      userId,
    ]
  );
  return result.rows[0];
};

export const updateMeeting = async (meetingId: string, input: Partial<{
  committee_id: string | null;
  meeting_type: Meeting['meeting_type'];
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  status: Meeting['status'];
  presiding_contact_id: string | null;
  secretary_contact_id: string | null;
  minutes_notes: string | null;
}>, userId: string): Promise<Meeting | null> => {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const setField = (col: string, value: unknown) => {
    fields.push(`${col} = $${idx++}`);
    params.push(value);
  };

  if (input.committee_id !== undefined) setField('committee_id', input.committee_id);
  if (input.meeting_type !== undefined) setField('meeting_type', input.meeting_type);
  if (input.title !== undefined) setField('title', input.title);
  if (input.starts_at !== undefined) setField('starts_at', input.starts_at);
  if (input.ends_at !== undefined) setField('ends_at', input.ends_at);
  if (input.location !== undefined) setField('location', input.location);
  if (input.status !== undefined) setField('status', input.status);
  if (input.presiding_contact_id !== undefined) setField('presiding_contact_id', input.presiding_contact_id);
  if (input.secretary_contact_id !== undefined) setField('secretary_contact_id', input.secretary_contact_id);
  if (input.minutes_notes !== undefined) setField('minutes_notes', input.minutes_notes);

  if (fields.length === 0) return await getMeetingDetail(meetingId).then((d) => d?.meeting || null);

  setField('modified_by', userId);
  fields.push('updated_at = NOW()');

  params.push(meetingId);

  const result = await pool.query(
    `UPDATE meetings
     SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
               presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at`,
    params
  );
  return result.rows[0] || null;
};

export const addAgendaItem = async (meetingId: string, input: {
  title: string;
  description?: string | null;
  item_type?: MeetingAgendaItem['item_type'];
  duration_minutes?: number | null;
  presenter_contact_id?: string | null;
}, userId: string): Promise<MeetingAgendaItem> => {
  const positionResult = await pool.query(
    'SELECT COALESCE(MAX(position), 0) as max_pos FROM meeting_agenda_items WHERE meeting_id = $1',
    [meetingId]
  );
  const nextPos = Number(positionResult.rows[0].max_pos) + 1;

  const result = await pool.query(
    `INSERT INTO meeting_agenda_items (
      meeting_id, position, title, description, item_type, duration_minutes, presenter_contact_id, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
    RETURNING id, meeting_id, position, title, description, item_type, duration_minutes, presenter_contact_id, status, created_at, updated_at`,
    [
      meetingId,
      nextPos,
      input.title,
      input.description || null,
      input.item_type || 'discussion',
      input.duration_minutes ?? null,
      input.presenter_contact_id || null,
      userId,
    ]
  );
  return result.rows[0];
};

export const reorderAgendaItems = async (meetingId: string, orderedIds: string[], userId: string): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        `UPDATE meeting_agenda_items
         SET position = $1, updated_at = NOW(), modified_by = $2
         WHERE id = $3 AND meeting_id = $4`,
        [i + 1, userId, orderedIds[i], meetingId]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to reorder agenda items', { error, meetingId });
    throw error;
  } finally {
    client.release();
  }
};

export const addMotion = async (meetingId: string, input: {
  agenda_item_id?: string | null;
  parent_motion_id?: string | null;
  text: string;
  moved_by_contact_id?: string | null;
  seconded_by_contact_id?: string | null;
} , userId: string): Promise<MeetingMotion> => {
  const result = await pool.query(
    `INSERT INTO meeting_motions (
      meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id, seconded_by_contact_id, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
    RETURNING id, meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id, seconded_by_contact_id,
              status, votes_for, votes_against, votes_abstain, result_notes, created_at, updated_at`,
    [
      meetingId,
      input.agenda_item_id || null,
      input.parent_motion_id || null,
      input.text,
      input.moved_by_contact_id || null,
      input.seconded_by_contact_id || null,
      userId,
    ]
  );
  return result.rows[0];
};

export const updateMotion = async (motionId: string, input: Partial<{
  status: MeetingMotion['status'];
  votes_for: number | null;
  votes_against: number | null;
  votes_abstain: number | null;
  result_notes: string | null;
}>, userId: string): Promise<MeetingMotion | null> => {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const setField = (col: string, value: unknown) => {
    fields.push(`${col} = $${idx++}`);
    params.push(value);
  };

  if (input.status !== undefined) setField('status', input.status);
  if (input.votes_for !== undefined) setField('votes_for', input.votes_for);
  if (input.votes_against !== undefined) setField('votes_against', input.votes_against);
  if (input.votes_abstain !== undefined) setField('votes_abstain', input.votes_abstain);
  if (input.result_notes !== undefined) setField('result_notes', input.result_notes);

  if (fields.length === 0) return null;

  setField('modified_by', userId);
  fields.push('updated_at = NOW()');
  params.push(motionId);

  const result = await pool.query(
    `UPDATE meeting_motions
     SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id, seconded_by_contact_id,
               status, votes_for, votes_against, votes_abstain, result_notes, created_at, updated_at`,
    params
  );
  return result.rows[0] || null;
};

export const createActionItem = async (meetingId: string, input: {
  motion_id?: string | null;
  subject: string;
  description?: string | null;
  assigned_contact_id?: string | null;
  due_date?: string | null;
}, userId: string): Promise<MeetingActionItem> => {
  const result = await pool.query(
    `INSERT INTO meeting_action_items (
      meeting_id, motion_id, subject, description, assigned_contact_id, due_date, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
    RETURNING id, meeting_id, motion_id, subject, description, assigned_contact_id, due_date, status, created_at, updated_at`,
    [
      meetingId,
      input.motion_id || null,
      input.subject,
      input.description || null,
      input.assigned_contact_id || null,
      input.due_date || null,
      userId,
    ]
  );
  return result.rows[0];
};

export const generateMinutesDraft = async (meetingId: string): Promise<{ markdown: string } | null> => {
  const detail = await getMeetingDetail(meetingId);
  if (!detail) return null;

  const { meeting, committee, agenda_items, motions, action_items } = detail;
  const lines: string[] = [];

  lines.push(`# Minutes Draft: ${meeting.title}`);
  lines.push('');
  lines.push(`- Committee: ${committee?.name || '—'}`);
  lines.push(`- Type: ${meeting.meeting_type.toUpperCase()}`);
  lines.push(`- Start: ${new Date(meeting.starts_at).toLocaleString('en-CA')}`);
  if (meeting.ends_at) lines.push(`- End: ${new Date(meeting.ends_at).toLocaleString('en-CA')}`);
  if (meeting.location) lines.push(`- Location: ${meeting.location}`);
  lines.push('');

  lines.push('## Agenda');
  for (const item of agenda_items) {
    lines.push(`${item.position}. ${item.title}`);
    if (item.description) lines.push(`   - ${item.description}`);
    const itemMotions = motions.filter((m) => m.agenda_item_id === item.id);
    if (itemMotions.length > 0) {
      lines.push(`   - Motions:`);
      for (const m of itemMotions) {
        lines.push(`     - (${m.status}) ${m.text}`);
      }
    }
  }

  lines.push('');
  lines.push('## Motions Summary');
  if (motions.length === 0) {
    lines.push('No motions recorded.');
  } else {
    motions.forEach((m) => {
      lines.push(`- ${m.text}`);
      lines.push(`  - Status: ${m.status}`);
      if (m.result_notes) lines.push(`  - Notes: ${m.result_notes}`);
      const votes = [m.votes_for, m.votes_against, m.votes_abstain].some((v) => v !== null && v !== undefined);
      if (votes) {
        lines.push(`  - Votes: For ${m.votes_for ?? '—'}, Against ${m.votes_against ?? '—'}, Abstain ${m.votes_abstain ?? '—'}`);
      }
    });
  }

  lines.push('');
  lines.push('## Action Items');
  if (action_items.length === 0) {
    lines.push('No action items recorded.');
  } else {
    action_items.forEach((a) => {
      lines.push(`- ${a.subject} (${a.status})`);
      if (a.description) lines.push(`  - ${a.description}`);
      if (a.due_date) lines.push(`  - Due: ${new Date(a.due_date).toLocaleDateString('en-CA')}`);
    });
  }

  if (meeting.minutes_notes) {
    lines.push('');
    lines.push('## Additional Notes');
    lines.push(meeting.minutes_notes);
  }

  return { markdown: lines.join('\n') };
};

