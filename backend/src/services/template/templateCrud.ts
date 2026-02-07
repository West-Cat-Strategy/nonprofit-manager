import pool from '../../config/database';
import { logger } from '../../config/logger';
import type {
  Template,
  TemplateSearchParams,
  TemplateSearchResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '../../types/websiteBuilder';
import { defaultTheme, defaultGlobalSettings } from './constants';
import { mapRowToTemplate, mapRowToListItem, mapRowToPage } from './helpers';
import { getTemplatePages } from './templatePages';

/**
 * Create a new template
 */
export async function createTemplate(
  userId: string,
  data: CreateTemplateRequest
): Promise<Template> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let theme = { ...defaultTheme, ...data.theme };
    let globalSettings = { ...defaultGlobalSettings, ...data.globalSettings };
    let pages: ReturnType<typeof mapRowToPage>[] = [];

    // If cloning from existing template
    if (data.cloneFromId) {
      const sourceResult = await client.query(
        'SELECT * FROM templates WHERE id = $1',
        [data.cloneFromId]
      );

      if (sourceResult.rows.length > 0) {
        const source = sourceResult.rows[0];
        theme = { ...source.theme, ...data.theme };
        globalSettings = { ...source.global_settings, ...data.globalSettings };

        // Clone pages
        const pagesResult = await client.query(
          'SELECT * FROM template_pages WHERE template_id = $1 ORDER BY sort_order',
          [data.cloneFromId]
        );
        pages = pagesResult.rows.map(mapRowToPage);
      }
    }

    // Create template
    const templateResult = await client.query(
      `INSERT INTO templates (user_id, name, description, category, tags, theme, global_settings, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.name,
        data.description || '',
        data.category,
        data.tags || [],
        JSON.stringify(theme),
        JSON.stringify(globalSettings),
        JSON.stringify({ version: '1.0.0' }),
      ]
    );

    const template = mapRowToTemplate(templateResult.rows[0]);
    template.theme = theme;
    template.globalSettings = globalSettings;

    // Clone pages if applicable
    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        await client.query(
          `INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            template.id,
            page.name,
            page.slug,
            page.isHomepage,
            JSON.stringify(page.seo),
            JSON.stringify(page.sections),
            i,
          ]
        );
      }
    } else {
      // Create default homepage
      await client.query(
        `INSERT INTO template_pages (template_id, name, slug, is_homepage, seo, sections, sort_order)
         VALUES ($1, 'Home', 'home', true, $2, '[]', 0)`,
        [
          template.id,
          JSON.stringify({ title: data.name, description: data.description || '' }),
        ]
      );
    }

    await client.query('COMMIT');

    // Fetch pages
    template.pages = await getTemplatePages(template.id);

    logger.info('Template created', { templateId: template.id, userId });
    return template;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create template', { error, userId });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a template by ID
 */
export async function getTemplate(
  templateId: string,
  userId?: string
): Promise<Template | null> {
  let query = 'SELECT * FROM templates WHERE id = $1';
  const params: string[] = [templateId];

  if (userId) {
    query += ' AND (user_id = $2 OR is_system_template = true)';
    params.push(userId);
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return null;
  }

  const template = mapRowToTemplate(result.rows[0]);
  template.pages = await getTemplatePages(templateId);

  return template;
}

/**
 * Search and list templates
 */
export async function searchTemplates(
  userId: string,
  params: TemplateSearchParams
): Promise<TemplateSearchResponse> {
  const {
    search,
    category,
    tags,
    status,
    isSystemTemplate,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const conditions: string[] = ['(t.user_id = $1 OR t.is_system_template = true)'];
  const queryParams: (string | string[] | boolean | number)[] = [userId];
  let paramIndex = 2;

  if (search) {
    conditions.push(`(t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (category) {
    conditions.push(`t.category = $${paramIndex}`);
    queryParams.push(category);
    paramIndex++;
  }

  if (tags && tags.length > 0) {
    conditions.push(`t.tags && $${paramIndex}`);
    queryParams.push(tags);
    paramIndex++;
  }

  if (status) {
    conditions.push(`t.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  if (typeof isSystemTemplate === 'boolean') {
    conditions.push(`t.is_system_template = $${paramIndex}`);
    queryParams.push(isSystemTemplate);
    paramIndex++;
  }

  const sortColumn = {
    name: 't.name',
    createdAt: 't.created_at',
    updatedAt: 't.updated_at',
  }[sortBy] || 't.created_at';

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM templates t WHERE ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count);

  const templatesResult = await pool.query(
    `SELECT t.*, COUNT(tp.id) as page_count
     FROM templates t
     LEFT JOIN template_pages tp ON t.id = tp.template_id
     WHERE ${whereClause}
     GROUP BY t.id
     ORDER BY ${sortColumn} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    templates: templatesResult.rows.map(mapRowToListItem),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  userId: string,
  data: UpdateTemplateRequest
): Promise<Template | null> {
  const checkResult = await pool.query(
    'SELECT * FROM templates WHERE id = $1 AND user_id = $2',
    [templateId, userId]
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

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (data.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(data.category);
  }

  if (data.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(data.tags);
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }

  if (data.theme !== undefined) {
    const mergedTheme = { ...current.theme, ...data.theme };
    updates.push(`theme = $${paramIndex++}`);
    values.push(JSON.stringify(mergedTheme));
  }

  if (data.globalSettings !== undefined) {
    const mergedSettings = { ...current.global_settings, ...data.globalSettings };
    updates.push(`global_settings = $${paramIndex++}`);
    values.push(JSON.stringify(mergedSettings));
  }

  if (updates.length === 0) {
    return getTemplate(templateId, userId);
  }

  values.push(templateId);

  await pool.query(
    `UPDATE templates SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  logger.info('Template updated', { templateId, userId });
  return getTemplate(templateId, userId);
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  templateId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM templates WHERE id = $1 AND user_id = $2 AND is_system_template = false',
    [templateId, userId]
  );

  if (result.rowCount && result.rowCount > 0) {
    logger.info('Template deleted', { templateId, userId });
    return true;
  }

  return false;
}
