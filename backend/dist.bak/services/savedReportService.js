"use strict";
/**
 * Saved Report Service
 * Handles CRUD operations for saved reports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedReportService = void 0;
const logger_1 = require("../config/logger");
class SavedReportService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Get all saved reports (optionally filter by user or entity)
     */
    async getSavedReports(userId, entity) {
        try {
            let query = `
        SELECT * FROM saved_reports
        WHERE (is_public = TRUE OR created_by = $1)
      `;
            const params = [userId];
            if (entity) {
                query += ` AND entity = $2`;
                params.push(entity);
            }
            query += ` ORDER BY updated_at DESC`;
            const result = await this.pool.query(query, params);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error fetching saved reports', { error, userId, entity });
            throw new Error('Failed to fetch saved reports');
        }
    }
    /**
     * Get a single saved report by ID
     */
    async getSavedReportById(id, userId) {
        try {
            const query = `
        SELECT * FROM saved_reports
        WHERE id = $1 AND (is_public = TRUE OR created_by = $2)
      `;
            const result = await this.pool.query(query, [id, userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error fetching saved report by ID', { error, id, userId });
            throw new Error('Failed to fetch saved report');
        }
    }
    /**
     * Create a new saved report
     */
    async createSavedReport(userId, data) {
        try {
            const query = `
        INSERT INTO saved_reports (name, description, entity, report_definition, created_by, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
            const values = [
                data.name,
                data.description || null,
                data.entity,
                JSON.stringify(data.report_definition),
                userId,
                data.is_public || false,
            ];
            const result = await this.pool.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error creating saved report', { error, userId, data });
            throw new Error('Failed to create saved report');
        }
    }
    /**
     * Update an existing saved report
     */
    async updateSavedReport(id, userId, data) {
        try {
            // First check if report exists and user owns it
            const checkQuery = `
        SELECT * FROM saved_reports
        WHERE id = $1 AND created_by = $2
      `;
            const checkResult = await this.pool.query(checkQuery, [id, userId]);
            if (checkResult.rows.length === 0) {
                return null;
            }
            const updates = [];
            const values = [];
            let paramIndex = 1;
            if (data.name !== undefined) {
                updates.push(`name = $${paramIndex}`);
                values.push(data.name);
                paramIndex++;
            }
            if (data.description !== undefined) {
                updates.push(`description = $${paramIndex}`);
                values.push(data.description);
                paramIndex++;
            }
            if (data.report_definition !== undefined) {
                updates.push(`report_definition = $${paramIndex}`);
                values.push(JSON.stringify(data.report_definition));
                paramIndex++;
            }
            if (data.is_public !== undefined) {
                updates.push(`is_public = $${paramIndex}`);
                values.push(data.is_public);
                paramIndex++;
            }
            if (updates.length === 0) {
                return checkResult.rows[0];
            }
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(id, userId);
            const query = `
        UPDATE saved_reports
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND created_by = $${paramIndex + 1}
        RETURNING *
      `;
            const result = await this.pool.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error updating saved report', { error, id, userId, data });
            throw new Error('Failed to update saved report');
        }
    }
    /**
     * Delete a saved report
     */
    async deleteSavedReport(id, userId) {
        try {
            const query = `
        DELETE FROM saved_reports
        WHERE id = $1 AND created_by = $2
        RETURNING id
      `;
            const result = await this.pool.query(query, [id, userId]);
            return result.rows.length > 0;
        }
        catch (error) {
            logger_1.logger.error('Error deleting saved report', { error, id, userId });
            throw new Error('Failed to delete saved report');
        }
    }
}
exports.SavedReportService = SavedReportService;
exports.default = SavedReportService;
//# sourceMappingURL=savedReportService.js.map