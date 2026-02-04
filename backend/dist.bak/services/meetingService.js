"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMinutesDraft = exports.createActionItem = exports.updateMotion = exports.addMotion = exports.reorderAgendaItems = exports.addAgendaItem = exports.updateMeeting = exports.createMeeting = exports.getMeetingDetail = exports.listMeetings = exports.listCommittees = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const listCommittees = async () => {
    const result = await database_1.default.query(`SELECT id, name, description, is_system, created_at, updated_at
     FROM committees
     ORDER BY is_system DESC, name ASC`);
    return result.rows;
};
exports.listCommittees = listCommittees;
const listMeetings = async (filters) => {
    const conditions = [];
    const params = [];
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
    const result = await database_1.default.query(`SELECT id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
            presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at
     FROM meetings
     ${where}
     ORDER BY starts_at DESC
     LIMIT $${idx}`, [...params, limit]);
    return result.rows;
};
exports.listMeetings = listMeetings;
const getMeetingDetail = async (meetingId) => {
    const meetingResult = await database_1.default.query(`SELECT id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
            presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at
     FROM meetings
     WHERE id = $1`, [meetingId]);
    if (meetingResult.rows.length === 0)
        return null;
    const meeting = meetingResult.rows[0];
    const committee = meeting.committee_id
        ? (await database_1.default.query(`SELECT id, name, description, is_system, created_at, updated_at
         FROM committees
         WHERE id = $1`, [meeting.committee_id])).rows[0] || null
        : null;
    const [agendaItems, motions, actionItems] = await Promise.all([
        database_1.default.query(`SELECT id, meeting_id, position, title, description, item_type, duration_minutes,
              presenter_contact_id, status, created_at, updated_at
       FROM meeting_agenda_items
       WHERE meeting_id = $1
       ORDER BY position ASC`, [meetingId]),
        database_1.default.query(`SELECT id, meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id,
              seconded_by_contact_id, status, votes_for, votes_against, votes_abstain, result_notes,
              created_at, updated_at
       FROM meeting_motions
       WHERE meeting_id = $1
       ORDER BY created_at ASC`, [meetingId]),
        database_1.default.query(`SELECT id, meeting_id, motion_id, subject, description, assigned_contact_id, due_date,
              status, created_at, updated_at
       FROM meeting_action_items
       WHERE meeting_id = $1
       ORDER BY created_at DESC`, [meetingId]),
    ]);
    return {
        meeting,
        committee,
        agenda_items: agendaItems.rows,
        motions: motions.rows,
        action_items: actionItems.rows,
    };
};
exports.getMeetingDetail = getMeetingDetail;
const createMeeting = async (input, userId) => {
    const result = await database_1.default.query(`INSERT INTO meetings (
      committee_id, meeting_type, title, starts_at, ends_at, location,
      presiding_contact_id, secretary_contact_id, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
    RETURNING id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
              presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at`, [
        input.committee_id || null,
        input.meeting_type,
        input.title,
        input.starts_at,
        input.ends_at || null,
        input.location || null,
        input.presiding_contact_id || null,
        input.secretary_contact_id || null,
        userId,
    ]);
    return result.rows[0];
};
exports.createMeeting = createMeeting;
const updateMeeting = async (meetingId, input, userId) => {
    const fields = [];
    const params = [];
    let idx = 1;
    const setField = (col, value) => {
        fields.push(`${col} = $${idx++}`);
        params.push(value);
    };
    if (input.committee_id !== undefined)
        setField('committee_id', input.committee_id);
    if (input.meeting_type !== undefined)
        setField('meeting_type', input.meeting_type);
    if (input.title !== undefined)
        setField('title', input.title);
    if (input.starts_at !== undefined)
        setField('starts_at', input.starts_at);
    if (input.ends_at !== undefined)
        setField('ends_at', input.ends_at);
    if (input.location !== undefined)
        setField('location', input.location);
    if (input.status !== undefined)
        setField('status', input.status);
    if (input.presiding_contact_id !== undefined)
        setField('presiding_contact_id', input.presiding_contact_id);
    if (input.secretary_contact_id !== undefined)
        setField('secretary_contact_id', input.secretary_contact_id);
    if (input.minutes_notes !== undefined)
        setField('minutes_notes', input.minutes_notes);
    if (fields.length === 0)
        return await (0, exports.getMeetingDetail)(meetingId).then((d) => d?.meeting || null);
    setField('modified_by', userId);
    fields.push('updated_at = NOW()');
    params.push(meetingId);
    const result = await database_1.default.query(`UPDATE meetings
     SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, committee_id, meeting_type, title, starts_at, ends_at, location, status,
               presiding_contact_id, secretary_contact_id, minutes_notes, created_at, updated_at`, params);
    return result.rows[0] || null;
};
exports.updateMeeting = updateMeeting;
const addAgendaItem = async (meetingId, input, userId) => {
    const positionResult = await database_1.default.query('SELECT COALESCE(MAX(position), 0) as max_pos FROM meeting_agenda_items WHERE meeting_id = $1', [meetingId]);
    const nextPos = Number(positionResult.rows[0].max_pos) + 1;
    const result = await database_1.default.query(`INSERT INTO meeting_agenda_items (
      meeting_id, position, title, description, item_type, duration_minutes, presenter_contact_id, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
    RETURNING id, meeting_id, position, title, description, item_type, duration_minutes, presenter_contact_id, status, created_at, updated_at`, [
        meetingId,
        nextPos,
        input.title,
        input.description || null,
        input.item_type || 'discussion',
        input.duration_minutes ?? null,
        input.presenter_contact_id || null,
        userId,
    ]);
    return result.rows[0];
};
exports.addAgendaItem = addAgendaItem;
const reorderAgendaItems = async (meetingId, orderedIds, userId) => {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < orderedIds.length; i++) {
            await client.query(`UPDATE meeting_agenda_items
         SET position = $1, updated_at = NOW(), modified_by = $2
         WHERE id = $3 AND meeting_id = $4`, [i + 1, userId, orderedIds[i], meetingId]);
        }
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error('Failed to reorder agenda items', { error, meetingId });
        throw error;
    }
    finally {
        client.release();
    }
};
exports.reorderAgendaItems = reorderAgendaItems;
const addMotion = async (meetingId, input, userId) => {
    const result = await database_1.default.query(`INSERT INTO meeting_motions (
      meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id, seconded_by_contact_id, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
    RETURNING id, meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id, seconded_by_contact_id,
              status, votes_for, votes_against, votes_abstain, result_notes, created_at, updated_at`, [
        meetingId,
        input.agenda_item_id || null,
        input.parent_motion_id || null,
        input.text,
        input.moved_by_contact_id || null,
        input.seconded_by_contact_id || null,
        userId,
    ]);
    return result.rows[0];
};
exports.addMotion = addMotion;
const updateMotion = async (motionId, input, userId) => {
    const fields = [];
    const params = [];
    let idx = 1;
    const setField = (col, value) => {
        fields.push(`${col} = $${idx++}`);
        params.push(value);
    };
    if (input.status !== undefined)
        setField('status', input.status);
    if (input.votes_for !== undefined)
        setField('votes_for', input.votes_for);
    if (input.votes_against !== undefined)
        setField('votes_against', input.votes_against);
    if (input.votes_abstain !== undefined)
        setField('votes_abstain', input.votes_abstain);
    if (input.result_notes !== undefined)
        setField('result_notes', input.result_notes);
    if (fields.length === 0)
        return null;
    setField('modified_by', userId);
    fields.push('updated_at = NOW()');
    params.push(motionId);
    const result = await database_1.default.query(`UPDATE meeting_motions
     SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, meeting_id, agenda_item_id, parent_motion_id, text, moved_by_contact_id, seconded_by_contact_id,
               status, votes_for, votes_against, votes_abstain, result_notes, created_at, updated_at`, params);
    return result.rows[0] || null;
};
exports.updateMotion = updateMotion;
const createActionItem = async (meetingId, input, userId) => {
    const result = await database_1.default.query(`INSERT INTO meeting_action_items (
      meeting_id, motion_id, subject, description, assigned_contact_id, due_date, created_by, modified_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
    RETURNING id, meeting_id, motion_id, subject, description, assigned_contact_id, due_date, status, created_at, updated_at`, [
        meetingId,
        input.motion_id || null,
        input.subject,
        input.description || null,
        input.assigned_contact_id || null,
        input.due_date || null,
        userId,
    ]);
    return result.rows[0];
};
exports.createActionItem = createActionItem;
const generateMinutesDraft = async (meetingId) => {
    const detail = await (0, exports.getMeetingDetail)(meetingId);
    if (!detail)
        return null;
    const { meeting, committee, agenda_items, motions, action_items } = detail;
    const lines = [];
    lines.push(`# Minutes Draft: ${meeting.title}`);
    lines.push('');
    lines.push(`- Committee: ${committee?.name || '—'}`);
    lines.push(`- Type: ${meeting.meeting_type.toUpperCase()}`);
    lines.push(`- Start: ${new Date(meeting.starts_at).toLocaleString('en-CA')}`);
    if (meeting.ends_at)
        lines.push(`- End: ${new Date(meeting.ends_at).toLocaleString('en-CA')}`);
    if (meeting.location)
        lines.push(`- Location: ${meeting.location}`);
    lines.push('');
    lines.push('## Agenda');
    for (const item of agenda_items) {
        lines.push(`${item.position}. ${item.title}`);
        if (item.description)
            lines.push(`   - ${item.description}`);
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
    }
    else {
        motions.forEach((m) => {
            lines.push(`- ${m.text}`);
            lines.push(`  - Status: ${m.status}`);
            if (m.result_notes)
                lines.push(`  - Notes: ${m.result_notes}`);
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
    }
    else {
        action_items.forEach((a) => {
            lines.push(`- ${a.subject} (${a.status})`);
            if (a.description)
                lines.push(`  - ${a.description}`);
            if (a.due_date)
                lines.push(`  - Due: ${new Date(a.due_date).toLocaleDateString('en-CA')}`);
        });
    }
    if (meeting.minutes_notes) {
        lines.push('');
        lines.push('## Additional Notes');
        lines.push(meeting.minutes_notes);
    }
    return { markdown: lines.join('\n') };
};
exports.generateMinutesDraft = generateMinutesDraft;
//# sourceMappingURL=meetingService.js.map