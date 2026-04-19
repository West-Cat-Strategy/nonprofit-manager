import type { DataScopeFilter } from '@app-types/dataScope';
import type { ContactExportRequest } from './contactImportExport.types';
import { resolveContactRoleNames } from '../shared/contactRoleFilters';

export const appendContactScopeConditions = (
  conditions: string[],
  values: Array<string | boolean | string[]>,
  scope: DataScopeFilter | undefined,
  startingParameter: number
): number => {
  let parameter = startingParameter;

  if (scope?.accountIds?.length) {
    conditions.push(`c.account_id = ANY($${parameter}::uuid[])`);
    values.push(scope.accountIds);
    parameter += 1;
  }

  if (scope?.contactIds?.length) {
    conditions.push(`c.id = ANY($${parameter}::uuid[])`);
    values.push(scope.contactIds);
    parameter += 1;
  }

  if (scope?.createdByUserIds?.length) {
    conditions.push(`c.created_by = ANY($${parameter}::uuid[])`);
    values.push(scope.createdByUserIds);
    parameter += 1;
  }

  return parameter;
};

export const buildContactWhereClause = (
  organizationId: string,
  filters: Omit<ContactExportRequest, 'format' | 'columns' | 'sort_by' | 'sort_order'>,
  scope?: DataScopeFilter,
  ids?: string[]
): { clause: string; values: Array<string | boolean | string[]> } => {
  const conditions = ['c.account_id = $1'];
  const values: Array<string | boolean | string[]> = [organizationId];
  let parameter = 2;

  if (ids?.length) {
    conditions.push(`c.id = ANY($${parameter}::uuid[])`);
    values.push(ids);
    parameter += 1;
  } else {
    if (filters.search) {
      conditions.push(`(
        c.first_name ILIKE $${parameter}
        OR c.preferred_name ILIKE $${parameter}
        OR c.last_name ILIKE $${parameter}
        OR c.email ILIKE $${parameter}
        OR c.phone ILIKE $${parameter}
        OR c.mobile_phone ILIKE $${parameter}
      )`);
      values.push(`%${filters.search}%`);
      parameter += 1;
    }

    if (filters.role) {
      const roleNames = resolveContactRoleNames(filters.role);

      conditions.push(`EXISTS (
        SELECT 1
        FROM contact_role_assignments cra
        JOIN contact_roles cr ON cr.id = cra.role_id
        WHERE cra.contact_id = c.id
          AND cr.name = ANY($${parameter}::text[])
      )`);
      values.push(roleNames);
      parameter += 1;
    }

    if (filters.account_id) {
      conditions.push(`c.account_id = $${parameter}`);
      values.push(filters.account_id);
      parameter += 1;
    }

    if (typeof filters.is_active === 'boolean') {
      conditions.push(`c.is_active = $${parameter}`);
      values.push(filters.is_active);
      parameter += 1;
    }

    if (filters.tags?.length) {
      conditions.push(`c.tags && $${parameter}::text[]`);
      values.push(filters.tags);
      parameter += 1;
    }
  }

  appendContactScopeConditions(conditions, values, scope, parameter);

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
};
