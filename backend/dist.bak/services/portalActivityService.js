"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPortalActivity = exports.logPortalActivity = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const logPortalActivity = async (input) => {
    try {
        await database_1.default.query(`INSERT INTO portal_activity_logs (portal_user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`, [
            input.portalUserId,
            input.action,
            input.details || null,
            input.ipAddress || null,
            input.userAgent || null,
        ]);
    }
    catch (error) {
        logger_1.logger.warn('Failed to log portal activity', { error, portalUserId: input.portalUserId, action: input.action });
    }
};
exports.logPortalActivity = logPortalActivity;
const getPortalActivity = async (portalUserId, limit = 20) => {
    const result = await database_1.default.query(`SELECT id, portal_user_id, action, details, ip_address, user_agent, created_at
     FROM portal_activity_logs
     WHERE portal_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`, [portalUserId, limit]);
    return result.rows;
};
exports.getPortalActivity = getPortalActivity;
//# sourceMappingURL=portalActivityService.js.map