import type { GrantListFilters } from '@app-types/grant';
import { buildTabularExport, type GeneratedTabularFile } from '@modules/shared/export/tabularExport';
import { GrantsAwardsService } from '../grantsAwardsService';

export class GrantsServiceExportFacade {
  constructor(private readonly awardsService: GrantsAwardsService) {}

  async exportGrants(
    organizationId: string,
    filters: GrantListFilters = {},
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<GeneratedTabularFile> {
    const grants = await this.awardsService.listGrants(organizationId, {
      ...filters,
      limit: filters.limit ?? 1000,
      page: 1,
    });

    return buildTabularExport({
      format,
      fallbackBaseName: `grants-${organizationId}`,
      sheets: [
        {
          name: 'Grants',
          columns: [
            { key: 'grant_number', header: 'Grant Number', width: 18 },
            { key: 'title', header: 'Grant Title', width: 28 },
            { key: 'title', header: 'Grant Title', width: 28 },
            { key: 'funder_name', header: 'Funder', width: 24 },
            { key: 'program_name', header: 'Program', width: 24 },
            { key: 'recipient_name', header: 'Recipient', width: 24 },
            { key: 'funded_program_name', header: 'Funded Program', width: 24 },
            { key: 'status', header: 'Status', width: 16 },
            { key: 'amount', header: 'Amount', width: 16 },
            { key: 'committed_amount', header: 'Committed', width: 16 },
            { key: 'disbursed_amount', header: 'Disbursed', width: 16 },
            { key: 'currency', header: 'Currency', width: 12 },
            { key: 'award_date', header: 'Award Date', width: 16 },
            { key: 'expiry_date', header: 'Expiry Date', width: 16 },
            { key: 'next_report_due_at', header: 'Next Report Due', width: 18 },
          ],
          rows: grants.data.map((grant) => ({
            ...grant,
            amount: grant.amount,
            committed_amount: grant.committed_amount,
            disbursed_amount: grant.disbursed_amount,
          })),
        },
      ],
    });
  }
}
