"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUserRole = void 0;
const logger_1 = require("../config/logger");
const database_1 = __importDefault(require("../config/database"));
const hasRoleTables = async (db) => {
    const result = await db.query(`SELECT to_regclass('public.roles') as roles_table,
            to_regclass('public.user_roles') as user_roles_table`);
    return Boolean(result.rows[0]?.roles_table) && Boolean(result.rows[0]?.user_roles_table);
};
const syncUserRole = async (userId, roleName, db = database_1.default) => {
    try {
        const available = await hasRoleTables(db);
        if (!available)
            return;
        const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length === 0)
            return;
        const roleId = roleResult.rows[0].id;
        await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        await db.query(`INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, [userId, roleId]);
    }
    catch (error) {
        logger_1.logger.error('Failed to sync user role', { error, userId, roleName });
    }
};
exports.syncUserRole = syncUserRole;
//# sourceMappingURL=userRoleService.js.map