export interface BackupExportOptions {
    filename?: string;
    includeSecrets?: boolean;
    compress?: boolean;
}
export declare class BackupService {
    private exportDir;
    constructor();
    createBackupFile(options: BackupExportOptions): Promise<string>;
    deleteExport(filepath: string): Promise<void>;
    private listPublicTables;
    private getTableColumns;
    private redactRow;
    private writeBackupJson;
}
//# sourceMappingURL=backupService.d.ts.map