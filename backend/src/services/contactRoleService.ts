import { Pool } from 'pg';
import { logger } from '../config/logger';

export interface ContactRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

export class ContactRoleService {
  constructor(private pool: Pool) {}

  async getAllRoles(): Promise<ContactRole[]> {
    const result = await this.pool.query(
      `SELECT id, name, description, is_system
       FROM contact_roles
       ORDER BY name`
    );
    return result.rows;
  }

  async getRolesForContact(contactId: string): Promise<ContactRole[]> {
    const result = await this.pool.query(
      `SELECT r.id, r.name, r.description, r.is_system
       FROM contact_role_assignments cra
       INNER JOIN contact_roles r ON r.id = cra.role_id
       WHERE cra.contact_id = $1
       ORDER BY r.name`,
      [contactId]
    );
    return result.rows;
  }

  async setRolesForContact(
    contactId: string,
    roleNames: string[],
    assignedBy?: string
  ): Promise<ContactRole[]> {
    const trimmedNames = roleNames.map((name) => name.trim()).filter(Boolean);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (trimmedNames.length === 0) {
        await client.query('DELETE FROM contact_role_assignments WHERE contact_id = $1', [contactId]);
        await client.query('COMMIT');
        return [];
      }

      const rolesResult = await client.query(
        `SELECT id, name, description, is_system
         FROM contact_roles
         WHERE name = ANY($1::text[])`,
        [trimmedNames]
      );

      const foundNames = rolesResult.rows.map((role) => role.name);
      const missing = trimmedNames.filter((name) => !foundNames.includes(name));
      if (missing.length > 0) {
        throw new Error(`Invalid contact roles: ${missing.join(', ')}`);
      }

      await client.query('DELETE FROM contact_role_assignments WHERE contact_id = $1', [contactId]);

      const insertValues: string[] = [];
      const params: unknown[] = [];
      rolesResult.rows.forEach((role, index) => {
        const base = index * 3;
        insertValues.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        params.push(contactId, role.id, assignedBy || null);
      });

      await client.query(
        `INSERT INTO contact_role_assignments (contact_id, role_id, assigned_by)
         VALUES ${insertValues.join(', ')}`,
        params
      );

      await client.query('COMMIT');

      return rolesResult.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error setting contact roles', { error, contactId, roleNames });
      throw error;
    } finally {
      client.release();
    }
  }
}
