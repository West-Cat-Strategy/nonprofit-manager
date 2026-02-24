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

  async getPortalCases(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.priority,
        c.client_viewable,
        c.updated_at,
        cs.name AS status_name,
        cs.status_type,
        ct.name AS case_type_name
      FROM cases c
      LEFT JOIN case_statuses cs ON cs.id = c.status_id
      LEFT JOIN case_types ct ON ct.id = c.case_type_id
      WHERE c.contact_id = $1
        AND c.client_viewable = true
      ORDER BY c.updated_at DESC, c.created_at DESC
    `,
      [contactId]
    );

    return result.rows;
  }

  async getPortalCaseById(contactId: string, caseId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.priority,
        c.client_viewable,
        c.intake_date,
        c.opened_date,
        c.closed_date,
        c.due_date,
        c.updated_at,
        cs.name AS status_name,
        cs.status_type,
        ct.name AS case_type_name
      FROM cases c
      LEFT JOIN case_statuses cs ON cs.id = c.status_id
      LEFT JOIN case_types ct ON ct.id = c.case_type_id
      WHERE c.id = $1
        AND c.contact_id = $2
        AND c.client_viewable = true
      LIMIT 1
    `,
      [caseId, contactId]
    );

    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async getPortalCaseTimeline(contactId: string, caseId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM (
        SELECT
          cn.id,
          'note'::text AS type,
          cn.created_at,
          COALESCE(cn.subject, cn.note_type, 'Note') AS title,
          cn.content,
          jsonb_build_object(
            'note_type', cn.note_type,
            'category', cn.category
          ) AS metadata
        FROM case_notes cn
        JOIN cases c ON c.id = cn.case_id
        WHERE cn.case_id = $1
          AND c.contact_id = $2
          AND c.client_viewable = true
          AND cn.visible_to_client = true

        UNION ALL

        SELECT
          co.id,
          'outcome'::text AS type,
          co.created_at,
          COALESCE(co.outcome_type, 'Outcome') AS title,
          co.notes AS content,
          jsonb_build_object(
            'outcome_date', co.outcome_date
          ) AS metadata
        FROM case_outcomes co
        JOIN cases c ON c.id = co.case_id
        WHERE co.case_id = $1
          AND c.contact_id = $2
          AND c.client_viewable = true
          AND co.visible_to_client = true

        UNION ALL

        SELECT
          cd.id,
          'document'::text AS type,
          COALESCE(cd.created_at, cd.uploaded_at) AS created_at,
          COALESCE(cd.document_name, cd.original_filename, 'Document') AS title,
          cd.description AS content,
          jsonb_build_object(
            'document_type', cd.document_type,
            'mime_type', cd.mime_type,
            'file_size', cd.file_size,
            'document_id', cd.id
          ) AS metadata
        FROM case_documents cd
        JOIN cases c ON c.id = cd.case_id
        WHERE cd.case_id = $1
          AND c.contact_id = $2
          AND c.client_viewable = true
          AND cd.visible_to_client = true
          AND COALESCE(cd.is_active, true) = true
      ) timeline
      ORDER BY created_at DESC, id DESC
    `,
      [caseId, contactId]
    );

    return result.rows;
  }

  async getPortalCaseDocuments(contactId: string, caseId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `
      SELECT
        cd.id,
        cd.document_name,
        COALESCE(cd.original_filename, cd.document_name) AS original_filename,
        cd.document_type,
        cd.description,
        cd.file_size,
        cd.mime_type,
        COALESCE(cd.created_at, cd.uploaded_at) AS created_at
      FROM case_documents cd
      JOIN cases c ON c.id = cd.case_id
      WHERE cd.case_id = $1
        AND c.contact_id = $2
        AND c.client_viewable = true
        AND cd.visible_to_client = true
        AND COALESCE(cd.is_active, true) = true
      ORDER BY COALESCE(cd.created_at, cd.uploaded_at) DESC
    `,
      [caseId, contactId]
    );

    return result.rows;
  }

  async getPortalCaseDownloadableDocument(
    contactId: string,
    caseId: string,
    documentId: string
  ): Promise<{ file_path: string; original_filename: string; mime_type: string } | null> {
    const result = await this.pool.query(
      `
      SELECT
        cd.file_path,
        COALESCE(cd.original_filename, cd.document_name) AS original_filename,
        cd.mime_type
      FROM case_documents cd
      JOIN cases c ON c.id = cd.case_id
      WHERE cd.id = $1
        AND cd.case_id = $2
        AND c.contact_id = $3
        AND c.client_viewable = true
        AND cd.visible_to_client = true
        AND COALESCE(cd.is_active, true) = true
      LIMIT 1
    `,
      [documentId, caseId, contactId]
    );

    return result.rows[0] ?? null;
  }

  async getPortalDocuments(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT cd.id, cd.original_name, cd.document_type, cd.title, cd.description, cd.file_size, cd.mime_type, cd.created_at
       FROM contact_documents cd
       LEFT JOIN cases c ON c.id = cd.case_id
       WHERE cd.contact_id = $1
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND (
           cd.case_id IS NULL
           OR (c.contact_id = cd.contact_id AND c.client_viewable = true)
         )
       ORDER BY cd.created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalForms(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT cd.id, cd.original_name, cd.document_type, cd.title, cd.description, cd.created_at
       FROM contact_documents cd
       LEFT JOIN cases c ON c.id = cd.case_id
       WHERE cd.contact_id = $1
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND cd.document_type IN ('consent_form', 'assessment', 'report')
         AND (
           cd.case_id IS NULL
           OR (c.contact_id = cd.contact_id AND c.client_viewable = true)
         )
       ORDER BY cd.created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalNotes(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT cn.id, cn.note_type, cn.subject, cn.content, cn.created_at
       FROM contact_notes cn
       LEFT JOIN cases c ON c.id = cn.case_id
       WHERE cn.contact_id = $1
         AND cn.is_internal = false
         AND cn.is_portal_visible = true
         AND (
           cn.case_id IS NULL
           OR (c.contact_id = cn.contact_id AND c.client_viewable = true)
         )
       ORDER BY cn.created_at DESC`,
      [contactId]
    );

    return result.rows;
  }

  async getPortalReminderAppointments(contactId: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT a.id, a.title, a.start_time
       FROM appointments a
       LEFT JOIN cases c ON c.id = a.case_id
       WHERE a.contact_id = $1
         AND a.status IN ('requested', 'confirmed')
         AND (
           a.case_id IS NULL
           OR (c.contact_id = a.contact_id AND c.client_viewable = true)
         )
       ORDER BY a.start_time ASC`,
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
      `SELECT cd.file_path, cd.original_name, cd.mime_type
       FROM contact_documents cd
       LEFT JOIN cases c ON c.id = cd.case_id
       WHERE cd.id = $1
         AND cd.contact_id = $2
         AND cd.is_active = true
         AND cd.is_portal_visible = true
         AND (
           cd.case_id IS NULL
           OR (c.contact_id = cd.contact_id AND c.client_viewable = true)
         )`,
      [documentId, contactId]
    );

    return result.rows[0] ?? null;
  }
}
