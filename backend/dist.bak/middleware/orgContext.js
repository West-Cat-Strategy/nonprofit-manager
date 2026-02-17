"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgContextMiddleware = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const ORG_HEADER_KEYS = ['x-organization-id', 'x-org-id', 'x-account-id', 'x-tenant-id'];
const ORG_QUERY_KEYS = ['organization_id', 'org_id', 'account_id', 'tenant_id'];
const normalizeId = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};
const extractFromHeaders = (req) => {
    for (const key of ORG_HEADER_KEYS) {
        const value = req.headers[key];
        const normalized = normalizeId(value);
        if (normalized)
            return normalized;
    }
    return undefined;
};
const extractFromQuery = (req) => {
    for (const key of ORG_QUERY_KEYS) {
        const value = req.query[key];
        const normalized = normalizeId(value);
        if (normalized)
            return normalized;
    }
    return undefined;
};
const extractFromParams = (req) => {
    const value = normalizeId(req.params.accountId || req.params.account_id || req.params.orgId);
    return value;
};
const getOrgContext = (req) => {
    const headerValue = extractFromHeaders(req);
    if (headerValue)
        return { id: headerValue, source: 'header' };
    const queryValue = extractFromQuery(req);
    if (queryValue)
        return { id: queryValue, source: 'query' };
    const paramValue = extractFromParams(req);
    if (paramValue)
        return { id: paramValue, source: 'param' };
    return {};
};
const shouldValidateContext = () => process.env.ORG_CONTEXT_VALIDATE === 'true';
const shouldRequireContext = () => process.env.ORG_CONTEXT_REQUIRE === 'true';
const orgContextMiddleware = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    const path = req.path || '';
    const fullPath = req.originalUrl || req.url || path;
    const normalizedPath = fullPath.split('?')[0];
    const skipPrefixes = ['/auth', '/payments/webhook'];
    if (skipPrefixes.some((prefix) => path.startsWith(prefix) || normalizedPath.startsWith(prefix))) {
        return next();
    }
    if (req.method === 'POST' && (path === '/accounts' || normalizedPath.startsWith('/accounts'))) {
        return next();
    }
    const { id, source } = getOrgContext(req);
    if (!id) {
        if (shouldRequireContext()) {
            return res.status(400).json({ error: 'Organization context is required' });
        }
        return next();
    }
    req.organizationId = id;
    req.accountId = id;
    req.tenantId = id;
    if (!shouldValidateContext()) {
        return next();
    }
    try {
        const result = await database_1.default.query('SELECT id FROM accounts WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            logger_1.logger.warn('Organization context not found', { orgId: id, source });
            return res.status(404).json({ error: 'Organization context not found' });
        }
        return next();
    }
    catch (error) {
        logger_1.logger.error('Failed to validate organization context', { error, orgId: id, source });
        return res.status(500).json({ error: 'Failed to validate organization context' });
    }
};
exports.orgContextMiddleware = orgContextMiddleware;
exports.default = exports.orgContextMiddleware;
//# sourceMappingURL=orgContext.js.map