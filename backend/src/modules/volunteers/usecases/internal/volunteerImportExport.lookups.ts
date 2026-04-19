import type { Pool } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import { lookupScopedAccounts } from '@modules/shared/import/scopedAccountLookup';
import type {
  VolunteerAccountLookup,
  VolunteerImportIdentity,
  VolunteerImportIdentityLookup,
} from '../volunteerImportExport.types';
import { appendVolunteerScopeConditions } from '../volunteerImportExport.utils';

export const lookupVolunteerIdentities = async (
  pool: Pick<Pool, 'query'>,
  volunteerIds: string[],
  contactIds: string[],
  emails: string[],
  organizationId: string,
  scope?: DataScopeFilter
): Promise<VolunteerImportIdentityLookup> => {
  if (volunteerIds.length === 0 && contactIds.length === 0 && emails.length === 0) {
    return {
      byVolunteerId: new Map(),
      byContactId: new Map(),
      byEmail: new Map(),
    };
  }

  const conditions = ['c.account_id = $1'];
  const values: Array<string | boolean | string[]> = [organizationId];
  let parameter = 2;

  const identityConditions: string[] = [];
  if (volunteerIds.length) {
    identityConditions.push(`v.id = ANY($${parameter}::uuid[])`);
    values.push(volunteerIds);
    parameter += 1;
  }
  if (contactIds.length) {
    identityConditions.push(`c.id = ANY($${parameter}::uuid[])`);
    values.push(contactIds);
    parameter += 1;
  }
  if (emails.length) {
    identityConditions.push(`LOWER(c.email) = ANY($${parameter}::text[])`);
    values.push(emails);
    parameter += 1;
  }

  conditions.push(`(${identityConditions.join(' OR ')})`);
  appendVolunteerScopeConditions(conditions, values, scope, parameter);

  const result = await pool.query<{
    volunteer_id: string | null;
    contact_id: string;
    email: string | null;
  }>(
    `
      SELECT
        v.id AS volunteer_id,
        c.id AS contact_id,
        c.email
      FROM contacts c
      LEFT JOIN volunteers v ON v.contact_id = c.id
      WHERE ${conditions.join(' AND ')}
    `,
    values
  );

  const byVolunteerId = new Map<string, VolunteerImportIdentity>();
  const byContactId = new Map<string, VolunteerImportIdentity>();
  const byEmail = new Map<string, VolunteerImportIdentity[]>();

  result.rows.forEach((row) => {
    const identity: VolunteerImportIdentity = {
      ...(row.volunteer_id ? { volunteerId: row.volunteer_id } : {}),
      contactId: row.contact_id,
    };

    if (row.volunteer_id) {
      byVolunteerId.set(row.volunteer_id, identity);
    }
    byContactId.set(row.contact_id, identity);
    if (row.email) {
      const email = row.email.toLowerCase();
      const matches = byEmail.get(email) ?? [];
      matches.push(identity);
      byEmail.set(email, matches);
    }
  });

  return {
    byVolunteerId,
    byContactId,
    byEmail,
  };
};

export const lookupVolunteerAccounts = async (
  pool: Pick<Pool, 'query'>,
  accountIds: string[],
  accountNumbers: string[],
  organizationId: string,
  scope?: DataScopeFilter
): Promise<VolunteerAccountLookup> => {
  const rows = await lookupScopedAccounts(pool, accountIds, accountNumbers, organizationId, scope);

  return {
    byId: new Map(rows.map((row) => [row.account_id, row.account_id])),
    byNumber: new Map(
      rows
        .filter((row) => Boolean(row.account_number))
        .map((row) => [row.account_number as string, row.account_id])
    ),
  };
};

export const lookupVolunteerRoleNames = async (
  pool: Pick<Pool, 'query'>
): Promise<Set<string>> => {
  const result = await pool.query<{ name: string }>('SELECT name FROM contact_roles');
  return new Set(result.rows.map((row) => row.name));
};
