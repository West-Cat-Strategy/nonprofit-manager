import { type QueryValue } from '@services/contactServiceHelpers';

export interface ContactBulkUpdateOptions {
  is_active?: boolean;
  tags?: {
    add?: string[];
    remove?: string[];
    replace?: string[];
  };
}

export interface PlannedContactBulkUpdate {
  query: string;
  values: QueryValue[];
}

export const buildContactBulkUpdateQuery = (
  contactIds: string[],
  options: ContactBulkUpdateOptions,
  userId: string
): PlannedContactBulkUpdate | null => {
  if (contactIds.length === 0) {
    return null;
  }

  const fields: string[] = [];
  const values: QueryValue[] = [];
  let paramCounter = 1;

  if (options.is_active !== undefined) {
    fields.push(`is_active = $${paramCounter}`);
    values.push(options.is_active);
    paramCounter++;
  }

  if (options.tags?.replace) {
    fields.push(`tags = $${paramCounter}::text[]`);
    values.push(options.tags.replace);
    paramCounter++;
  } else if (options.tags?.add || options.tags?.remove) {
    const addTags = options.tags?.add ?? [];
    const removeTags = options.tags?.remove ?? [];
    const addParam = paramCounter++;
    const removeParam = paramCounter++;
    values.push(addTags, removeTags);
    fields.push(`tags = (
      SELECT ARRAY(
        SELECT DISTINCT t
        FROM UNNEST(COALESCE(c.tags, ARRAY[]::text[]) || $${addParam}::text[]) t
        WHERE NOT (t = ANY($${removeParam}::text[]))
      )
    )`);
  }

  if (fields.length === 0) {
    return null;
  }

  fields.push(`modified_by = $${paramCounter}`);
  values.push(userId);
  paramCounter++;
  fields.push('updated_at = CURRENT_TIMESTAMP');

  values.push(contactIds);
  return {
    query: `
      UPDATE contacts c
      SET ${fields.join(', ')}
      WHERE c.id = ANY($${paramCounter}::uuid[])
    `,
    values,
  };
};
