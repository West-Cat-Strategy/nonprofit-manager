import { resolveSort } from '@utils/queryHelpers';
import { type GrantListFilters, type GrantProgram, type PaginatedGrantResult } from '@app-types/grant';
import { addSearchCondition } from './grantsShared';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';

export class GrantsPortfolioProgramQueryService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async listPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantProgram>> {
    const values: unknown[] = [organizationId];
    const conditions = ['gp.organization_id = $1'];
    addSearchCondition(conditions, values, ['gp.name', 'gp.program_code'], filters.search);

    if (filters.funder_id) {
      values.push(filters.funder_id);
      conditions.push(`gp.funder_id = $${values.length}`);
    }

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      conditions.push(`gp.jurisdiction = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`gp.status = $${values.length}`);
    }

    if (filters.fiscal_year) {
      values.push(filters.fiscal_year);
      conditions.push(`COALESCE(gp.fiscal_year, '') = $${values.length}`);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'gp.name',
        fiscal_year: 'gp.fiscal_year',
        status: 'gp.status',
        application_due_at: 'gp.application_due_at',
        award_date: 'gp.award_date',
        updated_at: 'gp.updated_at',
      },
      'updated_at'
    );

    return this.deps.paginate({
      baseFrom: 'grant_programs gp LEFT JOIN grant_funders f ON f.id = gp.funder_id',
      selectColumns: `
        gp.*,
        f.name AS funder_name,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, gp.name ASC`,
      page,
      limit,
      mapper: this.deps.mapProgram,
    });
  }

  async getProgramById(organizationId: string, id: string): Promise<GrantProgram | null> {
    return this.deps.fetchById(
      this.deps.db,
      `SELECT
         gp.*,
         f.name AS funder_name,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = gp.organization_id AND g.program_id = gp.id), 0)::text AS total_amount
       FROM grant_programs gp
       LEFT JOIN grant_funders f ON f.id = gp.funder_id
       WHERE gp.organization_id = $1
         AND gp.id = $2`,
      [organizationId, id],
      this.deps.mapProgram
    );
  }
}

