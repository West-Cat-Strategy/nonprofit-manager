import { Pool } from 'pg';

const PROFILE_COLUMNS = `
  c.id as contact_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.mobile_phone,
  c.address_line1,
  c.address_line2,
  c.city,
  c.state_province,
  c.postal_code,
  c.country,
  c.preferred_contact_method,
  c.pronouns,
  c.gender,
  c.profile_picture
`;

export class PortalRepository {
  constructor(private readonly pool: Pool) {}

  async getProfile(contactId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT ${PROFILE_COLUMNS}
       FROM contacts c
       WHERE c.id = $1`,
      [contactId]
    );

    return result.rows[0] ?? null;
  }

  async updateProfile(
    contactId: string,
    updates: Record<string, string | null>
  ): Promise<Record<string, unknown> | null> {
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return null;
    }

    const assignments: string[] = [];
    const values: Array<string | null> = [];

    fields.forEach((field, idx) => {
      assignments.push(`${field} = $${idx + 1}`);
      values.push(updates[field]);
    });

    values.push(contactId);

    const result = await this.pool.query(
      `UPDATE contacts
       SET ${assignments.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${values.length}
       RETURNING ${PROFILE_COLUMNS}`,
      values
    );

    return result.rows[0] ?? null;
  }

  async getPortalUserPasswordHash(portalUserId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT password_hash FROM portal_users WHERE id = $1',
      [portalUserId]
    );

    return result.rows[0]?.password_hash ?? null;
  }

  async updatePortalUserPassword(portalUserId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE portal_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, portalUserId]
    );
  }

  async syncPortalUserEmail(portalUserId: string, email: string): Promise<void> {
    await this.pool.query('UPDATE portal_users SET email = $1 WHERE id = $2', [
      email.toLowerCase(),
      portalUserId,
    ]);
  }

  async getPortalEvents(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT
         e.*,
         er.id as registration_id,
         er.registration_status
       FROM events e
       LEFT JOIN event_registrations er
         ON er.event_id = e.id AND er.contact_id = $1
       WHERE e.start_date >= NOW()
         AND e.status NOT IN ('cancelled', 'completed')
         AND (
           e.is_public = true
           OR er.id IS NOT NULL
         )
       ORDER BY e.start_date ASC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalRelationships(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT
        cr.id,
        cr.relationship_type,
        cr.relationship_label,
        cr.notes,
        cr.is_active,
        cr.created_at,
        c.id as related_contact_id,
        c.first_name as related_contact_first_name,
        c.last_name as related_contact_last_name,
        c.email as related_contact_email,
        c.phone as related_contact_phone
      FROM contact_relationships cr
      LEFT JOIN contacts c ON cr.related_contact_id = c.id
      WHERE cr.contact_id = $1 AND cr.is_active = true
      ORDER BY cr.created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async createRelatedContact(input: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id`,
      [input.firstName, input.lastName, input.email ?? null, input.phone ?? null, null]
    );
    return result.rows[0].id as string;
  }

  async createPortalRelationship(input: {
    contactId: string;
    relatedContactId: string;
    relationshipType: string;
    relationshipLabel?: string | null;
    notes?: string | null;
  }): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `INSERT INTO contact_relationships (
        contact_id, related_contact_id, relationship_type, relationship_label, notes,
        is_bidirectional, inverse_relationship_type, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING id, relationship_type, relationship_label, notes, created_at`,
      [
        input.contactId,
        input.relatedContactId,
        input.relationshipType,
        input.relationshipLabel ?? null,
        input.notes ?? null,
        false,
        null,
        null,
      ]
    );

    return result.rows[0] as Record<string, unknown>;
  }

  async updatePortalRelationship(input: {
    contactId: string;
    relationshipId: string;
    relationshipType?: string;
    relationshipLabel?: string | null;
    notes?: string | null;
  }): Promise<Record<string, unknown> | null> {
    const fields: string[] = [];
    const values: Array<string | null> = [];
    let index = 1;

    if (input.relationshipType) {
      fields.push(`relationship_type = $${index++}`);
      values.push(input.relationshipType);
    }
    if (input.relationshipLabel !== undefined) {
      fields.push(`relationship_label = $${index++}`);
      values.push(input.relationshipLabel ?? null);
    }
    if (input.notes !== undefined) {
      fields.push(`notes = $${index++}`);
      values.push(input.notes ?? null);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(input.relationshipId, input.contactId);

    const result = await this.pool.query(
      `UPDATE contact_relationships
       SET ${fields.join(', ')}, updated_at = NOW(), modified_by = NULL
       WHERE id = $${index++} AND contact_id = $${index}
       RETURNING id, relationship_type, relationship_label, notes, updated_at`,
      values
    );

    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async deletePortalRelationship(contactId: string, relationshipId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE contact_relationships
       SET is_active = false
       WHERE id = $1 AND contact_id = $2
       RETURNING id`,
      [relationshipId, contactId]
    );

    return result.rows.length > 0;
  }

  async getEventForPortalRegistration(eventId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT id, is_public, start_date, status
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    return result.rows[0] ?? null;
  }

  async getPortalRegistrationByEvent(eventId: string, contactId: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT id
       FROM event_registrations
       WHERE event_id = $1 AND contact_id = $2`,
      [eventId, contactId]
    );

    return (result.rows[0]?.id as string | undefined) ?? null;
  }

  async getPortalDocuments(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT id, original_name, document_type, title, description, file_size, mime_type, created_at
       FROM contact_documents
       WHERE contact_id = $1
         AND is_active = true
         AND is_portal_visible = true
       ORDER BY created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalForms(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT id, original_name, document_type, title, description, created_at
       FROM contact_documents
       WHERE contact_id = $1
         AND is_active = true
         AND is_portal_visible = true
         AND document_type IN ('consent_form', 'assessment', 'report')
       ORDER BY created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalNotes(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT id, note_type, subject, content, created_at
       FROM contact_notes
       WHERE contact_id = $1
         AND is_internal = false
         AND is_portal_visible = true
       ORDER BY created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalReminderAppointments(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT id, title, start_time
       FROM appointments
       WHERE contact_id = $1 AND status IN ('requested', 'confirmed')
       ORDER BY start_time ASC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalReminderEvents(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT e.id, e.name, e.start_date
       FROM event_registrations er
       JOIN events e ON e.id = er.event_id
       WHERE er.contact_id = $1 AND e.start_date >= NOW()
       ORDER BY e.start_date ASC`,
      [contactId]
    );

    return result.rows;
  }

  async getDownloadableDocument(
    contactId: string,
    documentId: string
  ): Promise<{ file_path: string; original_name: string; mime_type: string } | null> {
    const result = await this.pool.query(
      `SELECT file_path, original_name, mime_type
       FROM contact_documents
       WHERE id = $1
         AND contact_id = $2
         AND is_active = true
         AND is_portal_visible = true`,
      [documentId, contactId]
    );

    return result.rows[0] ?? null;
  }
}
