export interface PortalActivityEntry {
    id: string;
    portal_user_id: string;
    action: string;
    details: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}
interface LogPortalActivityInput {
    portalUserId: string;
    action: string;
    details?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}
export declare const logPortalActivity: (input: LogPortalActivityInput) => Promise<void>;
export declare const getPortalActivity: (portalUserId: string, limit?: number) => Promise<PortalActivityEntry[]>;
export {};
//# sourceMappingURL=portalActivityService.d.ts.map