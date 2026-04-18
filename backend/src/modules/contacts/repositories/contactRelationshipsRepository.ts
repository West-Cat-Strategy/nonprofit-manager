import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  ContactRelationship,
  CreateContactRelationshipDTO,
  UpdateContactRelationshipDTO,
} from '@app-types/contact';
import type { ContactRelationshipsPort } from '../types/ports';

type RelationshipClient = Pick<typeof pool, 'query'>;

type ContactRelationshipRow = ContactRelationship & {
  related_contact_first_name?: string;
  related_contact_last_name?: string;
  related_contact_email?: string;
  related_contact_phone?: string;
};

type InverseRelationshipState = {
  isActive: boolean;
  shouldMaterialize: boolean;
  inverseType: ContactRelationship['relationship_type'] | null;
  primaryType: ContactRelationship['relationship_type'];
  relationshipLabel: string | null;
  inverseLabel: string | null;
  notes: string | null;
};

type UpdateRelationshipRowInput = {
  relationship_type?: ContactRelationship['relationship_type'];
  relationship_label?: string | null;
  is_bidirectional?: boolean;
  inverse_relationship_type?: ContactRelationship['relationship_type'] | null;
  notes?: string | null;
  is_active?: boolean;
};

type CreateInverseOptions = {
  client: RelationshipClient;
  contactId: string;
  relatedContactId: string;
  primaryType: ContactRelationship['relationship_type'];
  inverseType: ContactRelationship['relationship_type'];
  relationshipLabel: string | null;
  notes: string | null;
  userId: string;
};

export async function getContactRelationships(contactId: string): Promise<ContactRelationship[]> {
  try {
    const result = await pool.query(
      `
      SELECT
        cr.*,
        c.first_name as related_contact_first_name,
        c.last_name as related_contact_last_name,
        c.email as related_contact_email,
        c.phone as related_contact_phone
      FROM contact_relationships cr
      LEFT JOIN contacts c ON cr.related_contact_id = c.id
      WHERE cr.contact_id = $1 AND cr.is_active = true
      ORDER BY cr.relationship_type, cr.created_at
      `,
      [contactId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting contact relationships:', error);
    throw Object.assign(new Error('Failed to retrieve contact relationships'), { cause: error });
  }
}

export async function getContactRelationshipById(relationshipId: string): Promise<ContactRelationship | null> {
  try {
    const result = await pool.query(
      `
      SELECT
        cr.*,
        c.first_name as related_contact_first_name,
        c.last_name as related_contact_last_name,
        c.email as related_contact_email,
        c.phone as related_contact_phone
      FROM contact_relationships cr
      LEFT JOIN contacts c ON cr.related_contact_id = c.id
      WHERE cr.id = $1 AND cr.is_active = true
      `,
      [relationshipId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting contact relationship by ID:', error);
    throw Object.assign(new Error('Failed to retrieve contact relationship'), { cause: error });
  }
}

export async function createContactRelationship(
  contactId: string,
  data: CreateContactRelationshipDTO,
  userId: string
): Promise<ContactRelationship> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      INSERT INTO contact_relationships (
        contact_id, related_contact_id, relationship_type, relationship_label,
        is_bidirectional, inverse_relationship_type, notes, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
      `,
      [
        contactId,
        data.related_contact_id,
        data.relationship_type,
        data.relationship_label || null,
        data.is_bidirectional || false,
        data.inverse_relationship_type || null,
        data.notes || null,
        userId,
      ]
    );

    await syncInverseRelationshipAfterCreate(client, result.rows[0] as ContactRelationshipRow, userId);

    await client.query('COMMIT');

    logger.info(`Contact relationship created between ${contactId} and ${data.related_contact_id}`);
    return result.rows[0];
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      throw Object.assign(new Error('This relationship already exists'), { cause: error });
    }
    if (error.code === '23503') {
      throw Object.assign(new Error('Related contact not found'), { cause: error });
    }
    logger.error('Error creating contact relationship:', error);
    throw Object.assign(new Error('Failed to create contact relationship'), { cause: error });
  } finally {
    client.release();
  }
}

function getInverseLabel(
  label: string | undefined,
  _type: string,
  _inverseType: string
): string | null {
  if (!label) return null;

  const inverseMap: Record<string, string> = {
    Mother: 'Child',
    Father: 'Child',
    Parent: 'Child',
    Child: 'Parent',
    Son: 'Parent',
    Daughter: 'Parent',
    Spouse: 'Spouse',
    Wife: 'Husband',
    Husband: 'Wife',
    Brother: 'Sibling',
    Sister: 'Sibling',
    Sibling: 'Sibling',
  };

  return inverseMap[label] || null;
}

const getRelationshipByIdForSync = async (
  client: RelationshipClient,
  relationshipId: string
): Promise<ContactRelationshipRow | null> => {
  const result = await client.query(
    `
      SELECT *
      FROM contact_relationships
      WHERE id = $1
    `,
    [relationshipId]
  );

  return (result.rows[0] as ContactRelationshipRow | undefined) || null;
};

const findInverseRelationship = async (
  client: RelationshipClient,
  row: Pick<ContactRelationship, 'contact_id' | 'related_contact_id' | 'relationship_type'>
): Promise<ContactRelationshipRow | null> => {
  const result = await client.query(
    `
      SELECT *
      FROM contact_relationships
      WHERE contact_id = $1
        AND related_contact_id = $2
        AND relationship_type = $3
      ORDER BY is_active DESC, updated_at DESC, created_at DESC
      LIMIT 1
    `,
    [row.related_contact_id, row.contact_id, row.relationship_type]
  );

  return (result.rows[0] as ContactRelationshipRow | undefined) || null;
};

const updateRelationshipRow = async (
  client: RelationshipClient,
  relationshipId: string,
  data: UpdateRelationshipRowInput,
  userId: string
): Promise<ContactRelationshipRow | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.relationship_type !== undefined) {
    fields.push(`relationship_type = $${paramIndex++}`);
    values.push(data.relationship_type);
  }

  if (data.relationship_label !== undefined) {
    fields.push(`relationship_label = $${paramIndex++}`);
    values.push(data.relationship_label);
  }

  if (data.is_bidirectional !== undefined) {
    fields.push(`is_bidirectional = $${paramIndex++}`);
    values.push(data.is_bidirectional);
  }

  if (data.inverse_relationship_type !== undefined) {
    fields.push(`inverse_relationship_type = $${paramIndex++}`);
    values.push(data.inverse_relationship_type);
  }

  if (data.notes !== undefined) {
    fields.push(`notes = $${paramIndex++}`);
    values.push(data.notes);
  }

  if (data.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`modified_by = $${paramIndex++}`);
  values.push(userId);

  values.push(relationshipId);

  const result = await client.query(
    `UPDATE contact_relationships SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return (result.rows[0] as ContactRelationshipRow | undefined) || null;
};

const softDeleteRelationshipRow = async (
  client: RelationshipClient,
  relationshipId: string,
  userId?: string
): Promise<boolean> => {
  const values: unknown[] = [relationshipId];
  const modifiedByClause =
    userId === undefined ? '' : `, modified_by = $2`;
  if (userId !== undefined) {
    values.push(userId);
  }

  const result = await client.query(
    `UPDATE contact_relationships
     SET is_active = false${modifiedByClause}
     WHERE id = $1
     RETURNING id`,
    values
  );

  return result.rows.length > 0;
};

const createInverseRelationshipRow = async ({
  client,
  contactId,
  relatedContactId,
  primaryType,
  inverseType,
  relationshipLabel,
  notes,
  userId,
}: CreateInverseOptions): Promise<void> => {
  await client.query(
    `
      INSERT INTO contact_relationships (
        contact_id, related_contact_id, relationship_type, relationship_label,
        is_bidirectional, inverse_relationship_type, notes, is_active, created_by, modified_by
      ) VALUES ($1, $2, $3, $4, true, $5, $6, true, $7, $7)
      ON CONFLICT (contact_id, related_contact_id, relationship_type) DO UPDATE
      SET relationship_label = EXCLUDED.relationship_label,
          is_bidirectional = true,
          inverse_relationship_type = EXCLUDED.inverse_relationship_type,
          notes = EXCLUDED.notes,
          is_active = true,
          modified_by = EXCLUDED.modified_by,
          updated_at = NOW()
    `,
    [
      relatedContactId,
      contactId,
      inverseType,
      getInverseLabel(relationshipLabel ?? undefined, primaryType, inverseType),
      primaryType,
      notes,
      userId,
    ]
  );
};

const deriveInverseState = (
  existing: ContactRelationshipRow,
  data: UpdateContactRelationshipDTO
): InverseRelationshipState => {
  const nextBidirectional = data.is_bidirectional ?? existing.is_bidirectional;
  const nextPrimaryType = data.relationship_type ?? existing.relationship_type;
  const nextInverseType = data.inverse_relationship_type ?? existing.inverse_relationship_type ?? null;
  const nextLabel = data.relationship_label !== undefined ? data.relationship_label ?? null : existing.relationship_label;
  const nextNotes = data.notes !== undefined ? data.notes ?? null : existing.notes;
  const nextIsActive = data.is_active ?? existing.is_active;

  return {
    isActive: nextIsActive,
    shouldMaterialize: Boolean(nextIsActive && nextBidirectional && nextInverseType),
    inverseType: nextBidirectional ? nextInverseType : null,
    primaryType: nextPrimaryType,
    relationshipLabel: nextLabel,
    inverseLabel: nextInverseType ? getInverseLabel(nextLabel ?? undefined, nextPrimaryType, nextInverseType) : null,
    notes: nextNotes,
  };
};

const syncInverseRelationshipAfterCreate = async (
  client: RelationshipClient,
  primaryRow: ContactRelationshipRow,
  userId: string
): Promise<void> => {
  if (!primaryRow.is_bidirectional || !primaryRow.inverse_relationship_type) {
    return;
  }

  await createInverseRelationshipRow({
    client,
    contactId: primaryRow.contact_id,
    relatedContactId: primaryRow.related_contact_id,
    primaryType: primaryRow.relationship_type,
    inverseType: primaryRow.inverse_relationship_type,
    relationshipLabel: primaryRow.relationship_label,
    notes: primaryRow.notes,
    userId,
  });
};

const syncInverseRelationshipAfterUpdate = async (
  client: RelationshipClient,
  previousRow: ContactRelationshipRow,
  updatedRow: ContactRelationshipRow,
  data: UpdateContactRelationshipDTO,
  userId: string
): Promise<void> => {
  const previousInverse = previousRow.inverse_relationship_type
    ? await findInverseRelationship(client, {
        contact_id: previousRow.contact_id,
        related_contact_id: previousRow.related_contact_id,
        relationship_type: previousRow.inverse_relationship_type,
      })
    : null;

  const nextState = deriveInverseState(previousRow, data);

  if (!nextState.shouldMaterialize || !nextState.inverseType) {
    if (previousInverse && previousInverse.is_active) {
      await softDeleteRelationshipRow(client, previousInverse.id, userId);
    }
    return;
  }

  if (previousInverse) {
    const inverseUpdate: UpdateRelationshipRowInput = {
      relationship_type: nextState.inverseType,
      relationship_label: nextState.inverseLabel,
      is_bidirectional: true,
      inverse_relationship_type: nextState.primaryType,
      notes: nextState.notes,
      is_active: true,
    };

    await updateRelationshipRow(client, previousInverse.id, inverseUpdate, userId);
    return;
  }

  await createInverseRelationshipRow({
    client,
    contactId: updatedRow.contact_id,
    relatedContactId: updatedRow.related_contact_id,
    primaryType: nextState.primaryType,
    inverseType: nextState.inverseType,
    relationshipLabel: nextState.relationshipLabel,
    notes: nextState.notes,
    userId,
  });
};

export async function updateContactRelationship(
  relationshipId: string,
  data: UpdateContactRelationshipDTO,
  userId: string
): Promise<ContactRelationship | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingRow = await getRelationshipByIdForSync(client, relationshipId);
    if (!existingRow) {
      await client.query('ROLLBACK');
      return null;
    }

    const updatedRow = await updateRelationshipRow(client, relationshipId, data, userId);
    if (!updatedRow) {
      await client.query('ROLLBACK');
      return null;
    }

    await syncInverseRelationshipAfterUpdate(client, existingRow, updatedRow, data, userId);

    await client.query('COMMIT');
    logger.info(`Contact relationship updated: ${relationshipId}`);
    return updatedRow;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating contact relationship:', error);
    throw Object.assign(new Error('Failed to update contact relationship'), { cause: error });
  } finally {
    client.release();
  }
}

export async function deleteContactRelationship(relationshipId: string): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingRow = await getRelationshipByIdForSync(client, relationshipId);
    if (!existingRow) {
      await client.query('ROLLBACK');
      return false;
    }

    const deleted = await softDeleteRelationshipRow(client, relationshipId);
    if (!deleted) {
      await client.query('ROLLBACK');
      return false;
    }

    if (existingRow.is_bidirectional && existingRow.inverse_relationship_type) {
      const inverseRow = await findInverseRelationship(client, {
        contact_id: existingRow.contact_id,
        related_contact_id: existingRow.related_contact_id,
        relationship_type: existingRow.inverse_relationship_type,
      });
      if (inverseRow && inverseRow.is_active) {
        await softDeleteRelationshipRow(client, inverseRow.id);
      }
    }

    await client.query('COMMIT');
    logger.info(`Contact relationship soft deleted: ${relationshipId}`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting contact relationship:', error);
    throw Object.assign(new Error('Failed to delete contact relationship'), { cause: error });
  } finally {
    client.release();
  }
}

export async function hardDeleteContactRelationship(relationshipId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM contact_relationships WHERE id = $1 RETURNING id`,
      [relationshipId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    logger.info(`Contact relationship permanently deleted: ${relationshipId}`);
    return true;
  } catch (error) {
    logger.error('Error hard deleting contact relationship:', error);
    throw Object.assign(new Error('Failed to delete contact relationship'), { cause: error });
  }
}

export async function getInverseRelationships(contactId: string): Promise<ContactRelationship[]> {
  try {
    const result = await pool.query(
      `
      SELECT
        cr.*,
        c.first_name as related_contact_first_name,
        c.last_name as related_contact_last_name,
        c.email as related_contact_email,
        c.phone as related_contact_phone
      FROM contact_relationships cr
      LEFT JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.related_contact_id = $1 AND cr.is_active = true
      ORDER BY cr.relationship_type, cr.created_at
      `,
      [contactId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting inverse relationships:', error);
    throw Object.assign(new Error('Failed to retrieve inverse relationships'), { cause: error });
  }
}

export class ContactRelationshipsRepository implements ContactRelationshipsPort {
  async list(contactId: string): Promise<ContactRelationship[]> {
    return getContactRelationships(contactId);
  }

  async getById(relationshipId: string): Promise<ContactRelationship | null> {
    return getContactRelationshipById(relationshipId);
  }

  async create(
    contactId: string,
    payload: CreateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship> {
    return createContactRelationship(contactId, payload, userId);
  }

  async update(
    relationshipId: string,
    payload: UpdateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship | null> {
    return updateContactRelationship(relationshipId, payload, userId);
  }

  async delete(relationshipId: string): Promise<boolean> {
    return deleteContactRelationship(relationshipId);
  }
}
