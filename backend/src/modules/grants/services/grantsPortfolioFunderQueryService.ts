import { resolveSort } from '@utils/queryHelpers';
import {
  type GrantListFilters,
  type GrantFunder,
  type PaginatedGrantResult,
} from '@app-types/grant';
import { addSearchCondition } from './grantsShared';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';

export class GrantsPortfolioFunderQueryService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async listFunders(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantFunder>> {
    const values: unknown[] = [organizationId];
    const conditions = ['f.organization_id = $1'];
    addSearchCondition(conditions, values, ['f.name', 'f.funder_type', 'f.contact_name'], filters.search);

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      conditions.push(`f.jurisdiction = $${values.length}`);
    }

    if (filters.status === 'active') {
      conditions.push('f.active = true');
    } else if (filters.status === 'inactive' || filters.status === 'archived') {
      conditions.push('f.active = false');
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'f.name',
        jurisdiction: 'f.jurisdiction',
        active: 'f.active',
        created_at: 'f.created_at',
        updated_at: 'f.updated_at',
      },
      'name'
    );

    return this.deps.paginate({
      baseFrom: 'grant_funders f',
      selectColumns: `
        f.*,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, f.name ASC`,
      page,
      limit,
      mapper: this.deps.mapFunder,
    });
  }

  async getFunderById(organizationId: string, id: string): Promise<GrantFunder | null> {
    return this.deps.fetchById(
      this.deps.db,
      `SELECT
         f.*,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = f.organization_id AND g.funder_id = f.id), 0)::text AS total_amount
       FROM grant_funders f
       WHERE f.organization_id = $1
         AND f.id = $2`,
      [organizationId, id],
      this.deps.mapFunder
    );
  }
}

