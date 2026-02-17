import { Pool } from 'pg';
export interface ContactRole {
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
}
export declare class ContactRoleService {
    private pool;
    constructor(pool: Pool);
    getAllRoles(): Promise<ContactRole[]>;
    getRolesForContact(contactId: string): Promise<ContactRole[]>;
    setRolesForContact(contactId: string, roleNames: string[], assignedBy?: string): Promise<ContactRole[]>;
}
//# sourceMappingURL=contactRoleService.d.ts.map