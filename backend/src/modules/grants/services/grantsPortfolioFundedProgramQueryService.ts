import { resolveSort } from '@utils/queryHelpers';
import {
  type GrantListFilters,
  type PaginatedGrantResult,
  type FundedProgram,
} from '@app-types/grant';
import { addSearchCondition } from './grantsShared';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';

export class GrantsPortfolioFundedProgramQueryService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async listFundedPrograms(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<FundedProgram>> {
    const values: unknown[] = [organizationId];
    const conditions = ['fp.organization_id = $1'];
    addSearchCondition(conditions, values, ['fp.name', 'fp.description', 'r.name'], filters.search);

    if (filters.recipient_organization_id) {
      values.push(filters.recipient_organization_id);
      conditions.push(`fp.recipient_organization_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`fp.status = $${values.length}`);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'fp.name',
        status: 'fp.status',
        start_date: 'fp.start_date',
        end_date: 'fp.end_date',
        updated_at: 'fp.updated_at',
      },
      'updated_at'
    );

    return this.deps.paginate({
      baseFrom: 'funded_programs fp LEFT JOIN recipient_organizations r ON r.id = fp.recipient_organization_id LEFT JOIN users u ON u.id = fp.owner_user_id',
      selectColumns: `
        fp.*,
        r.name AS recipient_name,
        u.first_name || ' ' || u.last_name AS owner_name,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, fp.name ASC`,
      page,
      limit,
      mapper: this.deps.mapFundedProgram,
    });
  }

  async getFundedProgramById(
    organizationId: string,
    id: string
  ): Promise<FundedProgram | null> {
    return this.deps.fetchById(
      this.deps.db,
      `SELECT
         fp.*,
         r.name AS recipient_name,
         u.first_name || ' ' || u.last_name AS owner_name,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = fp.organization_id AND g.funded_program_id = fp.id), 0)::text AS total_amount
       FROM funded_programs fp
       LEFT JOIN recipient_organizations r ON r.id = fp.recipient_organization_id
       LEFT JOIN users u ON u.id = fp.owner_user_id
       WHERE fp.organization_id = $1
         AND fp.id = $2`,
      [organizationId, id],
      this.deps.mapFundedProgram
    );
  }
}

