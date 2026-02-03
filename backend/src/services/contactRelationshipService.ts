/**
 * Contact Relationship Service
 * Handles CRUD operations for contact relationships
 */

import pool from '../config/database';
import { logger } from '../config/logger';
import type {
  ContactRelationship,
  CreateContactRelationshipDTO,
  UpdateContactRelationshipDTO,
} from '../types/contact';

/**
 * Get all relationships for a contact
 */
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
    throw new Error('Failed to retrieve contact relationships');
  }
}

/**
 * Get a single relationship by ID
 */
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
      WHERE cr.id = $1
      `,
      [relationshipId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting contact relationship by ID:', error);
    throw new Error('Failed to retrieve contact relationship');
  }
}

/**
 * Create a new relationship
 */
export async function createContactRelationship(
  contactId: string,
  data: CreateContactRelationshipDTO,
  userId: string
): Promise<ContactRelationship> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create the primary relationship
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

    // If bidirectional, create the inverse relationship
    if (data.is_bidirectional && data.inverse_relationship_type) {
      await client.query(
        `
        INSERT INTO contact_relationships (
          contact_id, related_contact_id, relationship_type, relationship_label,
          is_bidirectional, inverse_relationship_type, notes, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        ON CONFLICT (contact_id, related_contact_id, relationship_type) DO NOTHING
        `,
        [
          data.related_contact_id,
          contactId,
          data.inverse_relationship_type,
          getInverseLabel(data.relationship_label, data.relationship_type, data.inverse_relationship_type),
          true,
          data.relationship_type,
          data.notes || null,
          userId,
        ]
      );
    }

    await client.query('COMMIT');

    logger.info(`Contact relationship created between ${contactId} and ${data.related_contact_id}`);
    return result.rows[0];
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      throw new Error('This relationship already exists');
    }
    if (error.code === '23503') {
      throw new Error('Related contact not found');
    }
    logger.error('Error creating contact relationship:', error);
    throw new Error('Failed to create contact relationship');
  } finally {
    client.release();
  }
}

/**
 * Helper to derive inverse relationship label
 */
function getInverseLabel(
  label: string | undefined,
  _type: string,
  _inverseType: string
): string | null {
  if (!label) return null;

  // Common inverses
  const inverseMap: Record<string, string> = {
    'Mother': 'Child',
    'Father': 'Child',
    'Parent': 'Child',
    'Child': 'Parent',
    'Son': 'Parent',
    'Daughter': 'Parent',
    'Spouse': 'Spouse',
    'Wife': 'Husband',
    'Husband': 'Wife',
    'Brother': 'Sibling',
    'Sister': 'Sibling',
    'Sibling': 'Sibling',
  };

  return inverseMap[label] || null;
}

/**
 * Update a relationship
 */
export async function updateContactRelationship(
  relationshipId: string,
  data: UpdateContactRelationshipDTO,
  userId: string
): Promise<ContactRelationship | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
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

    const result = await pool.query(
      `UPDATE contact_relationships SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Contact relationship updated: ${relationshipId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating contact relationship:', error);
    throw new Error('Failed to update contact relationship');
  }
}

/**
 * Delete a relationship (soft delete by setting is_active = false)
 */
export async function deleteContactRelationship(relationshipId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE contact_relationships SET is_active = false WHERE id = $1 RETURNING id`,
      [relationshipId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    logger.info(`Contact relationship soft deleted: ${relationshipId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting contact relationship:', error);
    throw new Error('Failed to delete contact relationship');
  }
}

/**
 * Hard delete a relationship
 */
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
    throw new Error('Failed to delete contact relationship');
  }
}

/**
 * Get inverse relationships (relationships where this contact is the related contact)
 */
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
    throw new Error('Failed to retrieve inverse relationships');
  }
}
