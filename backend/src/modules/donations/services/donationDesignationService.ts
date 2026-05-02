import { Pool } from 'pg';
import type { DonationDesignation, FundRestrictionType } from '@app-types/donation';

type DesignationRow = {
  designation_id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  restriction_type: FundRestrictionType;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

interface ResolvedDesignation {
  designation_id: string | null;
  designation: string | null;
  designation_code: string | null;
  designation_restriction_type: FundRestrictionType | null;
}

const DESIGNATION_COLUMNS = `
  id as designation_id,
  organization_id,
  code,
  name,
  description,
  restriction_type,
  is_active,
  created_at,
  updated_at
`;

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : value;

const mapDesignation = (row: DesignationRow): DonationDesignation => ({
  designation_id: row.designation_id,
  organization_id: row.organization_id,
  code: row.code,
  name: row.name,
  description: row.description,
  restriction_type: row.restriction_type,
  is_active: row.is_active,
  created_at: toIso(row.created_at),
  updated_at: toIso(row.updated_at),
});

const buildDesignationCode = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'designation';
};

export class DonationDesignationService {
  constructor(private readonly pool: Pool) {}

  async listDesignations(
    organizationId: string,
    includeInactive = false
  ): Promise<DonationDesignation[]> {
    const result = await this.pool.query<DesignationRow>(
      `
        SELECT ${DESIGNATION_COLUMNS}
        FROM fund_designations
        WHERE organization_id = $1
          AND ($2::boolean = true OR is_active = true)
        ORDER BY is_active DESC, name ASC
      `,
      [organizationId, includeInactive]
    );

    return result.rows.map(mapDesignation);
  }

  async resolveDesignationInput(input: {
    organizationId?: string | null;
    userId?: string | null;
    designationId?: string | null;
    designationName?: string | null;
    allowInactiveDesignationId?: string | null;
  }): Promise<ResolvedDesignation> {
    const name = input.designationName?.trim();

    if (!input.organizationId) {
      if (input.designationId) {
        throw new Error('Donation designation organization context is required');
      }

      return {
        designation_id: null,
        designation: name || null,
        designation_code: null,
        designation_restriction_type: null,
      };
    }

    if (input.designationId) {
      const result = await this.pool.query<{
        id: string;
        name: string;
        code: string;
        restriction_type: FundRestrictionType;
      }>(
        `
          SELECT id, name, code, restriction_type
          FROM fund_designations
          WHERE id = $1
            AND organization_id = $2
            AND (is_active = true OR id = $3)
          LIMIT 1
        `,
        [input.designationId, input.organizationId, input.allowInactiveDesignationId || null]
      );

      if (result.rows.length === 0) {
        throw new Error('Selected donation designation is not available for this organization');
      }

      const row = result.rows[0];
      return {
        designation_id: row.id,
        designation: row.name,
        designation_code: row.code,
        designation_restriction_type: row.restriction_type,
      };
    }

    if (!name) {
      return {
        designation_id: null,
        designation: null,
        designation_code: null,
        designation_restriction_type: null,
      };
    }

    const existing = await this.pool.query<{
      id: string;
      name: string;
      code: string;
      restriction_type: FundRestrictionType;
    }>(
      `
        SELECT id, name, code, restriction_type
        FROM fund_designations
        WHERE organization_id = $1
          AND lower(name) = lower($2)
          AND is_active = true
        LIMIT 1
      `,
      [input.organizationId, name]
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      return {
        designation_id: row.id,
        designation: row.name,
        designation_code: row.code,
        designation_restriction_type: row.restriction_type,
      };
    }

    const baseCode = buildDesignationCode(name);
    const inserted = await this.pool.query<{
      id: string;
      name: string;
      code: string;
      restriction_type: FundRestrictionType;
    }>(
      `
        INSERT INTO fund_designations (
          organization_id,
          code,
          name,
          created_by,
          modified_by
        )
        VALUES (
          $1,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM fund_designations
              WHERE organization_id = $1
                AND lower(code) = lower($2)
            )
            THEN concat($2, '-', substr(md5($3), 1, 8))
            ELSE $2
          END,
          $3,
          $4,
          $4
        )
        ON CONFLICT DO NOTHING
        RETURNING id, name, code, restriction_type
      `,
      [input.organizationId, baseCode, name, input.userId || null]
    );

    let row = inserted.rows[0];
    if (!row) {
      const existingAfterConflict = await this.pool.query<{
        id: string;
        name: string;
        code: string;
        restriction_type: FundRestrictionType;
      }>(
        `
          SELECT id, name, code, restriction_type
          FROM fund_designations
          WHERE organization_id = $1
            AND lower(name) = lower($2)
            AND is_active = true
          LIMIT 1
        `,
        [input.organizationId, name]
      );
      row = existingAfterConflict.rows[0];
    }

    if (!row) {
      throw new Error('Donation designation name is inactive for this organization');
    }

    return {
      designation_id: row.id,
      designation: row.name,
      designation_code: row.code,
      designation_restriction_type: row.restriction_type,
    };
  }
}
