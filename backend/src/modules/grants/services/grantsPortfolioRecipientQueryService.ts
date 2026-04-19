import { resolveSort } from '@utils/queryHelpers';
import { type GrantListFilters, type PaginatedGrantResult, type RecipientOrganization } from '@app-types/grant';
import { addSearchCondition } from './grantsShared';
import type { GrantsPortfolioDependencies } from './grantsPortfolioTypes';

export class GrantsPortfolioRecipientQueryService {
  constructor(private readonly deps: GrantsPortfolioDependencies) {}

  async listRecipients(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<RecipientOrganization>> {
    const values: unknown[] = [organizationId];
    const conditions = ['r.organization_id = $1'];
    addSearchCondition(conditions, values, ['r.name', 'r.legal_name', 'r.contact_name'], filters.search);

    if (filters.jurisdiction) {
      values.push(filters.jurisdiction);
      conditions.push(`r.jurisdiction = $${values.length}`);
    }

    if (filters.status) {
      if (filters.status === 'active') {
        conditions.push('r.active = true');
      } else if (filters.status === 'inactive' || filters.status === 'archived') {
        conditions.push('r.active = false');
      } else {
        values.push(filters.status);
        conditions.push(`r.status = $${values.length}`);
      }
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sort = resolveSort(
      filters.sort_by,
      filters.sort_order,
      {
        name: 'r.name',
        status: 'r.status',
        active: 'r.active',
        updated_at: 'r.updated_at',
      },
      'updated_at'
    );

    return this.deps.paginate({
      baseFrom: 'recipient_organizations r',
      selectColumns: `
        r.*,
        COALESCE((SELECT COUNT(*) FROM funded_programs fp WHERE fp.organization_id = r.organization_id AND fp.recipient_organization_id = r.id), 0)::text AS funded_program_count,
        COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS grant_count,
        COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS total_amount
      `,
      conditions,
      values,
      orderBy: `${sort.sortColumn} ${sort.sortOrder}, r.name ASC`,
      page,
      limit,
      mapper: this.deps.mapRecipient,
    });
  }

  async getRecipientById(
    organizationId: string,
    id: string
  ): Promise<RecipientOrganization | null> {
    return this.deps.fetchById(
      this.deps.db,
      `SELECT
         r.*,
         COALESCE((SELECT COUNT(*) FROM funded_programs fp WHERE fp.organization_id = r.organization_id AND fp.recipient_organization_id = r.id), 0)::text AS funded_program_count,
         COALESCE((SELECT COUNT(*) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS grant_count,
         COALESCE((SELECT SUM(amount) FROM grants g WHERE g.organization_id = r.organization_id AND g.recipient_organization_id = r.id), 0)::text AS total_amount
       FROM recipient_organizations r
       WHERE r.organization_id = $1
         AND r.id = $2`,
      [organizationId, id],
      this.deps.mapRecipient
    );
  }
}

