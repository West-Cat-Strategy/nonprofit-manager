import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  TemplatePage,
  CreatePageRequest,
  UpdatePageRequest,
  PageSEO,
  PageSection,
} from '@app-types/websiteBuilder';
import { mapRowToPage } from './helpers';

/**
 * Get all pages for a template
 */
export async function getTemplatePages(templateId: string): Promise<TemplatePage[]> {
  const result = await pool.query(
    'SELECT * FROM template_pages WHERE template_id = $1 ORDER BY sort_order, created_at',
    [templateId]
  );

  return result.rows.map(mapRowToPage);
}

/**
 * Get a specific page
 */
export async function getTemplatePage(
  templateId: string,
  pageId: string,
  userId?: string
): Promise<TemplatePage | null> {
  let query = `
    SELECT tp.* FROM template_pages tp
    JOIN templates t ON tp.template_id = t.id
    WHERE tp.id = $1 AND tp.template_id = $2
  `;
  const params: string[] = [pageId, templateId];

  if (userId) {
    query += ' AND (t.user_id = $3 OR t.is_system_template = true)';
    params.push(userId);
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToPage(result.rows[0]);
}

/**
 * Create a new page in a template
 */
export async function createTemplatePage(
  templateId: string,
  userId: string,
  data: CreatePageRequest
): Promise<TemplatePage | null> {
  const checkResult = await pool.query(
    'SELECT id FROM templates WHERE id = $1 AND user_id = $2',
    [templateId, userId]
  );

  if (checkResult.rows.length === 0) {
    return null;
  }

  const orderResult = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM template_pages WHERE template_id = $1',
    [templateId]
  );
  const sortOrder = orderResult.rows[0].next_order;

  let sections: PageSection[] = data.sections || [];
  let seo: PageSEO = {
    title: data.name,
    description: '',
    ...data.seo,
  };

  if (data.cloneFromId) {
    const sourceResult = await pool.query(
      'SELECT * FROM template_pages WHERE id = $1',
      [data.cloneFromId]
    );

    if (sourceResult.rows.length > 0) {
      const source = sourceResult.rows[0];
      sections = source.sections;
      seo = { ...source.seo, ...data.seo, title: data.seo?.title || data.name };
    }
  }

  const result = await pool.query(
    `INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      templateId,
      data.name,
      data.slug,
      data.isHomepage || false,
      JSON.stringify(seo),
      JSON.stringify(sections),
      sortOrder,
    ]
  );

  logger.info('Template page created', { templateId, pageId: result.rows[0].id });
  return mapRowToPage(result.rows[0]);
}

/**
 * Update a page
 */
export async function updateTemplatePage(
  templateId: string,
  pageId: string,
  userId: string,
  data: UpdatePageRequest
): Promise<TemplatePage | null> {
  const checkResult = await pool.query(
    `SELECT tp.* FROM template_pages tp
     JOIN templates t ON tp.template_id = t.id
     WHERE tp.id = $1 AND tp.template_id = $2 AND t.user_id = $3`,
    [pageId, templateId, userId]
  );

  if (checkResult.rows.length === 0) {
    return null;
  }

  const current = checkResult.rows[0];
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }

  if (data.isHomepage !== undefined) {
    updates.push(`is_homepage = $${paramIndex++}`);
    values.push(data.isHomepage);
  }

  if (data.seo !== undefined) {
    const mergedSeo = { ...current.seo, ...data.seo };
    updates.push(`seo = $${paramIndex++}`);
    values.push(JSON.stringify(mergedSeo));
  }

  if (data.sections !== undefined) {
    updates.push(`sections = $${paramIndex++}`);
    values.push(JSON.stringify(data.sections));
  }

  if (updates.length === 0) {
    return mapRowToPage(current);
  }

  values.push(pageId);

  const result = await pool.query(
    `UPDATE template_pages SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  logger.info('Template page updated', { templateId, pageId });
  return mapRowToPage(result.rows[0]);
}

/**
 * Delete a page
 */
export async function deleteTemplatePage(
  templateId: string,
  pageId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM template_pages tp
     USING templates t
     WHERE tp.id = $1
       AND tp.template_id = $2
       AND t.id = tp.template_id
       AND t.user_id = $3
       AND tp.is_homepage = false`,
    [pageId, templateId, userId]
  );

  if (result.rowCount && result.rowCount > 0) {
    logger.info('Template page deleted', { templateId, pageId });
    return true;
  }

  return false;
}

/**
 * Reorder pages
 */
export async function reorderTemplatePages(
  templateId: string,
  userId: string,
  pageIds: string[]
): Promise<boolean> {
  const checkResult = await pool.query(
    'SELECT id FROM templates WHERE id = $1 AND user_id = $2',
    [templateId, userId]
  );

  if (checkResult.rows.length === 0) {
    return false;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < pageIds.length; i++) {
      await client.query(
        'UPDATE template_pages SET sort_order = $1 WHERE id = $2 AND template_id = $3',
        [i, pageIds[i], templateId]
      );
    }

    await client.query('COMMIT');
    logger.info('Template pages reordered', { templateId });
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
