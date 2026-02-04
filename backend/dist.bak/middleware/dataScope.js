"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDataScope = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const normalizeFilter = (filter) => {
    if (!isPlainObject(filter))
        return undefined;
    const accountIds = Array.isArray(filter.accountIds)
        ? filter.accountIds.filter(Boolean)
        : undefined;
    const contactIds = Array.isArray(filter.contactIds)
        ? filter.contactIds.filter(Boolean)
        : undefined;
    const createdByUserIds = Array.isArray(filter.createdByUserIds)
        ? filter.createdByUserIds.filter(Boolean)
        : undefined;
    const accountTypes = Array.isArray(filter.accountTypes)
        ? filter.accountTypes.filter(Boolean)
        : undefined;
    return {
        ...(accountIds?.length ? { accountIds } : {}),
        ...(contactIds?.length ? { contactIds } : {}),
        ...(createdByUserIds?.length ? { createdByUserIds } : {}),
        ...(accountTypes?.length ? { accountTypes } : {}),
    };
};
const loadDataScope = (resource) => {
    return async (req, _res, next) => {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            if (!userId || userRole === 'admin') {
                return next();
            }
            const result = await database_1.default.query(`SELECT ds.*
         FROM data_scopes ds
         LEFT JOIN user_roles ur
           ON ds.role_id = ur.role_id
           AND ur.user_id = $1
         WHERE ds.is_active = true
           AND ds.resource = $2
           AND (ds.user_id = $1 OR ur.user_id = $1)
         ORDER BY ds.priority DESC, ds.created_at ASC`, [userId, resource]);
            if (result.rows.length === 0) {
                return next();
            }
            const scopeRow = result.rows[0];
            const filter = normalizeFilter(scopeRow.scope_filter);
            const context = {
                resource,
                scopeId: scopeRow.id,
                filter,
            };
            req.dataScope = context;
            return next();
        }
        catch (error) {
            logger_1.logger.error('Failed to load data scope', { error, resource, userId: req.user?.id });
            return next();
        }
    };
};
exports.loadDataScope = loadDataScope;
exports.default = exports.loadDataScope;
//# sourceMappingURL=dataScope.js.map