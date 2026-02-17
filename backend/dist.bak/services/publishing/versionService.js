"use strict";
/**
 * Version Service
 * Handles version history and rollback operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionService = void 0;
const siteManagementService_1 = require("./siteManagementService");
class VersionService {
    constructor(pool) {
        this.pool = pool;
        this.siteManagement = new siteManagementService_1.SiteManagementService(pool);
    }
    /**
     * Get version history for a site
     */
    async getVersionHistory(siteId, userId, limit = 10) {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            throw new Error('Site not found or access denied');
        }
        const result = await this.pool.query(`SELECT * FROM site_versions
       WHERE site_id = $1
       ORDER BY published_at DESC
       LIMIT $2`, [siteId, limit]);
        const versions = result.rows.map((row) => ({
            id: row.id,
            siteId: row.site_id,
            version: row.version,
            publishedContent: row.published_content,
            publishedAt: new Date(row.published_at),
            publishedBy: row.published_by,
            changeDescription: row.change_description,
            isCurrent: row.version === site.publishedVersion,
        }));
        // Get total count
        const countResult = await this.pool.query('SELECT COUNT(*) FROM site_versions WHERE site_id = $1', [siteId]);
        return {
            siteId,
            versions,
            currentVersion: site.publishedVersion,
            total: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Save a version when publishing
     */
    async saveVersion(siteId, userId, version, publishedContent, changeDescription) {
        const result = await this.pool.query(`INSERT INTO site_versions (site_id, version, published_content, published_by, change_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [siteId, version, JSON.stringify(publishedContent), userId, changeDescription || null]);
        const row = result.rows[0];
        return {
            id: row.id,
            siteId: row.site_id,
            version: row.version,
            publishedContent: row.published_content,
            publishedAt: new Date(row.published_at),
            publishedBy: row.published_by,
            changeDescription: row.change_description,
            isCurrent: true,
        };
    }
    /**
     * Rollback to a previous version
     */
    async rollback(siteId, userId, targetVersion) {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            throw new Error('Site not found or access denied');
        }
        const previousVersion = site.publishedVersion;
        if (!previousVersion) {
            throw new Error('Site has no published version');
        }
        if (targetVersion === previousVersion) {
            throw new Error('Already on this version');
        }
        // Find the target version
        const versionResult = await this.pool.query('SELECT * FROM site_versions WHERE site_id = $1 AND version = $2', [siteId, targetVersion]);
        if (versionResult.rows.length === 0) {
            throw new Error('Target version not found');
        }
        const targetVersionData = versionResult.rows[0];
        const publishedContent = targetVersionData.published_content;
        // Update site with the rolled-back content
        await this.pool.query(`UPDATE published_sites
       SET published_content = $1,
           published_version = $2,
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`, [JSON.stringify(publishedContent), targetVersion, siteId, userId]);
        // Save rollback as a new version entry for audit
        await this.saveVersion(siteId, userId, `${targetVersion}-rollback-${Date.now()}`, publishedContent, `Rollback from ${previousVersion} to ${targetVersion}`);
        return {
            success: true,
            siteId,
            previousVersion,
            currentVersion: targetVersion,
            rolledBackAt: new Date(),
            message: `Successfully rolled back from ${previousVersion} to ${targetVersion}`,
        };
    }
    /**
     * Get a specific version
     */
    async getVersion(siteId, userId, version) {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            return null;
        }
        const result = await this.pool.query('SELECT * FROM site_versions WHERE site_id = $1 AND version = $2', [siteId, version]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            siteId: row.site_id,
            version: row.version,
            publishedContent: row.published_content,
            publishedAt: new Date(row.published_at),
            publishedBy: row.published_by,
            changeDescription: row.change_description,
            isCurrent: row.version === site.publishedVersion,
        };
    }
    /**
     * Delete old versions (keep latest N versions)
     */
    async pruneVersions(siteId, userId, keepCount = 10) {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            throw new Error('Site not found or access denied');
        }
        // Delete versions beyond keepCount
        const result = await this.pool.query(`DELETE FROM site_versions
       WHERE site_id = $1
       AND id NOT IN (
         SELECT id FROM site_versions
         WHERE site_id = $1
         ORDER BY published_at DESC
         LIMIT $2
       )
       RETURNING id`, [siteId, keepCount]);
        return result.rows.length;
    }
}
exports.VersionService = VersionService;
//# sourceMappingURL=versionService.js.map