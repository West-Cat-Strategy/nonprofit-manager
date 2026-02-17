import { Pool, PoolClient } from 'pg';
type DbClient = Pool | PoolClient;
export declare const syncUserRole: (userId: string, roleName: string, db?: DbClient) => Promise<void>;
export {};
//# sourceMappingURL=userRoleService.d.ts.map