export type DataScopeFilter = {
    accountIds?: string[];
    contactIds?: string[];
    createdByUserIds?: string[];
    accountTypes?: string[];
};
export type DataScopeContext = {
    resource: string;
    scopeId?: string;
    filter?: DataScopeFilter;
};
//# sourceMappingURL=dataScope.d.ts.map