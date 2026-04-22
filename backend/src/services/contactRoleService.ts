import { Pool, PoolClient } from 'pg';
import { logger } from '@config/logger';

export interface ContactRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

const createValidationError = (message: string, details?: Record<string, unknown>) =>
  Object.assign(new Error(message), {
    statusCode: 400,
    code: 'validation_error',
    ...(details ? { details } : {}),
  });

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

  async getRolesForContact(contactId: string, client?: PoolClient): Promise<ContactRole[]> {
    const executor = client || this.pool;
    const result = await executor.query(
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
    assignedBy?: string,
    externalClient?: PoolClient
  ): Promise<ContactRole[]> {
    const trimmedNames = Array.from(new Set(roleNames.map((name) => name.trim()).filter(Boolean)));

    const client = externalClient || (await this.pool.connect());
    try {
      if (!externalClient) {
        await client.query('BEGIN');
      }

      if (trimmedNames.length === 0) {
        await client.query('DELETE FROM contact_role_assignments WHERE contact_id = $1', [contactId]);
        if (!externalClient) {
          await client.query('COMMIT');
        }
        return [];
      }

      const rolesResult = await client.query(
        `SELECT id, name, description, is_system
         FROM contact_roles
         WHERE name = ANY($1::text[])`,
        [trimmedNames]
      );

      const foundNames = new Set(rolesResult.rows.map((role) => role.name));
      const missing = trimmedNames.filter((name) => !foundNames.has(name));
      if (missing.length > 0) {
        throw createValidationError(`Invalid contact roles: ${missing.join(', ')}`, {
          field: 'roles',
          invalid_roles: missing,
        });
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

      if (!externalClient) {
        await client.query('COMMIT');
      }

      return rolesResult.rows;
    } catch (error) {
      if (!externalClient) {
        await client.query('ROLLBACK');
      }
      logger.error('Error setting contact roles', { error, contactId, roleNames });
      throw error;
    } finally {
      if (!externalClient) {
        client.release();
      }
    }
  }
}
