import pool from '@config/database';
import { logger } from '@config/logger';
import type { TemplateVersion } from '@app-types/websiteBuilder';
import { incrementVersion } from './helpers';
import { getTemplate } from './templateCrud';

/**
 * Create a new version snapshot
 */
export async function createTemplateVersion(
  templateId: string,
  userId: string,
  changes?: string
): Promise<TemplateVersion | null> {
  const template = await getTemplate(templateId, userId);

  if (!template || template.userId !== userId) {
    return null;
  }

  const currentResult = await pool.query(
    'SELECT current_version FROM templates WHERE id = $1',
    [templateId]
  );
  const currentVersion = currentResult.rows[0]?.current_version || '1.0.0';
  const newVersion = incrementVersion(currentVersion);

  const snapshot = {
    theme: template.theme,
    globalSettings: template.globalSettings,
    pages: template.pages,
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const versionResult = await client.query(
      `INSERT INTO template_versions (template_id, version, changes, snapshot, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [templateId, newVersion, changes, JSON.stringify(snapshot), userId]
    );

    await client.query(
      'UPDATE templates SET current_version = $1 WHERE id = $2',
      [newVersion, templateId]
    );

    await client.query('COMMIT');

    logger.info('Template version created', { templateId, version: newVersion });

    return {
      id: versionResult.rows[0].id,
      templateId,
      version: newVersion,
      changes,
      createdAt: versionResult.rows[0].created_at.toISOString(),
      createdBy: userId,
      snapshot,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get version history for a template
 */
export async function getTemplateVersions(
  templateId: string,
  userId: string
): Promise<TemplateVersion[]> {
  const result = await pool.query(
    `SELECT tv.* FROM template_versions tv
     JOIN templates t ON tv.template_id = t.id
     WHERE tv.template_id = $1 AND (t.user_id = $2 OR t.is_system_template = true)
     ORDER BY tv.created_at DESC`,
    [templateId, userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    changes: row.changes,
    createdAt: row.created_at.toISOString(),
    createdBy: row.created_by,
    snapshot: row.snapshot,
  }));
}

/**
 * Restore a template to a specific version
 */
export async function restoreTemplateVersion(
  templateId: string,
  versionId: string,
  userId: string
): Promise<ReturnType<typeof getTemplate>> {
  const versionResult = await pool.query(
    `SELECT tv.* FROM template_versions tv
     JOIN templates t ON tv.template_id = t.id
     WHERE tv.id = $1 AND tv.template_id = $2 AND t.user_id = $3`,
    [versionId, templateId, userId]
  );

  if (versionResult.rows.length === 0) {
    return null;
  }

  const version = versionResult.rows[0];
  const snapshot = version.snapshot;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE templates SET theme = $1, global_settings = $2 WHERE id = $3',
      [JSON.stringify(snapshot.theme), JSON.stringify(snapshot.globalSettings), templateId]
    );

    await client.query('DELETE FROM template_pages WHERE template_id = $1', [templateId]);

    for (let i = 0; i < snapshot.pages.length; i++) {
      const page = snapshot.pages[i];
      await client.query(
        `INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          templateId,
          page.name,
          page.slug,
          page.isHomepage,
          JSON.stringify(page.seo),
          JSON.stringify(page.sections),
          i,
        ]
      );
    }

    await client.query('COMMIT');

    logger.info('Template version restored', { templateId, versionId, version: version.version });
    return getTemplate(templateId, userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
