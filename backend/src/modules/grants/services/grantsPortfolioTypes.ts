import type { Pool } from 'pg';
import type {
  CreateGrantActivityLogDTO,
  FundedProgram,
  GrantFunder,
  GrantProgram,
  PaginatedGrantResult,
  RecipientOrganization,
} from '@app-types/grant';
import { type GrantPaginateOptions, type GrantQueryClient, type GrantRow } from './grantsShared';

export interface GrantsPortfolioDependencies {
  db: Pool;
  paginate: <T>(options: GrantPaginateOptions<T>) => Promise<PaginatedGrantResult<T>>;
  fetchById: <T>(
    query: GrantQueryClient,
    sql: string,
    values: unknown[],
    mapper: (row: GrantRow) => T
  ) => Promise<T | null>;
  deleteById: (table: string, organizationId: string, id: string) => Promise<boolean>;
  recordActivity: (
    client: GrantQueryClient,
    organizationId: string,
    userId: string | null,
    data: CreateGrantActivityLogDTO
  ) => Promise<void>;
  mapFunder: (row: GrantRow) => GrantFunder;
  mapProgram: (row: GrantRow) => GrantProgram;
  mapRecipient: (row: GrantRow) => RecipientOrganization;
  mapFundedProgram: (row: GrantRow) => FundedProgram;
}
