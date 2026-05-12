interface QueryablePool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  connect?: () => Promise<QueryableClient>;
}

interface QueryableClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  release(): void;
}

interface RemainingReferenceCount {
  label: string;
  count: number;
}

const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);

const quoteIdentifier = (value: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value}"`;
};

const quoteQualifiedIdentifier = (schemaName: string, tableName: string): string =>
  `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;

const loadRemainingContactReferenceCounts = async (
  db: QueryablePool,
  contactId: string
): Promise<RemainingReferenceCount[]> => {
  const fkResult = await db.query<{
    schema_name: string;
    table_name: string;
    column_name: string;
  }>(
    `
      SELECT
        ns.nspname AS schema_name,
        rel.relname AS table_name,
        att.attname AS column_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
      JOIN pg_class ref_rel ON ref_rel.oid = con.confrelid
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
      JOIN pg_attribute ref_att ON ref_att.attrelid = con.confrelid AND ref_att.attnum = con.confkey[1]
      WHERE con.contype = 'f'
        AND array_length(con.conkey, 1) = 1
        AND array_length(con.confkey, 1) = 1
        AND ref_rel.relname = 'contacts'
        AND ref_att.attname = 'id'
    `
  );

  const counts: RemainingReferenceCount[] = [];
  for (const row of fkResult.rows) {
    const tableName = quoteQualifiedIdentifier(row.schema_name, row.table_name);
    const columnName = quoteIdentifier(row.column_name);
    let countResult: { rows: Array<{ count: string | number }> };
    try {
      countResult = await db.query<{ count: string | number }>(
        `SELECT COUNT(*) AS count FROM ${tableName} WHERE ${columnName} = $1::uuid`,
        [contactId]
      );
    } catch (error) {
      throw Object.assign(
        new Error(`Reference guard failed for ${row.table_name}.${row.column_name}`),
        { cause: error }
      );
    }
    const count = toNumber(countResult.rows[0]?.count);
    if (count > 0) {
      counts.push({ label: `${row.table_name}.${row.column_name}`, count });
    }
  }

  const polymorphicChecks = [
    {
      label: 'activities.regarding_id',
      sql: "SELECT COUNT(*) AS count FROM activities WHERE regarding_type = 'contact' AND regarding_id::text = $1",
    },
    {
      label: 'tasks.related_to_id',
      sql: "SELECT COUNT(*) AS count FROM tasks WHERE related_to_type = 'contact' AND related_to_id::text = $1",
    },
    {
      label: 'activity_events.entity_id',
      sql: "SELECT COUNT(*) AS count FROM activity_events WHERE entity_type = 'contact' AND entity_id::text = $1",
    },
    {
      label: 'activity_events.related_entity_id',
      sql: "SELECT COUNT(*) AS count FROM activity_events WHERE related_entity_type = 'contact' AND related_entity_id::text = $1",
    },
    {
      label: 'public_submissions.result_entity_id',
      sql: "SELECT COUNT(*) AS count FROM public_submissions WHERE result_entity_type = 'contact' AND result_entity_id::text = $1",
    },
    {
      label: 'conversion_events.source_entity_id',
      sql: "SELECT COUNT(*) AS count FROM conversion_events WHERE source_entity_type = 'contact' AND source_entity_id::text = $1",
    },
    {
      label: 'case_notes.source_entity_id',
      sql: "SELECT COUNT(*) AS count FROM case_notes WHERE source_entity_type = 'contact' AND source_entity_id::text = $1",
    },
    {
      label: 'case_outcomes.source_entity_id',
      sql: "SELECT COUNT(*) AS count FROM case_outcomes WHERE source_entity_type = 'contact' AND source_entity_id::text = $1",
    },
    {
      label: 'follow_ups.entity_id',
      sql: "SELECT COUNT(*) AS count FROM follow_ups WHERE entity_type = 'contact' AND entity_id::text = $1",
    },
    {
      label: 'website_public_action_submissions.source_entity_id',
      sql: "SELECT COUNT(*) AS count FROM website_public_action_submissions WHERE source_entity_type = 'contact' AND source_entity_id::text = $1",
    },
  ];

  for (const check of polymorphicChecks) {
    let result: { rows: Array<{ count: string | number }> };
    try {
      result = await db.query<{ count: string | number }>(check.sql, [contactId]);
    } catch (error) {
      throw Object.assign(new Error(`Reference guard failed for ${check.label}`), {
        cause: error,
      });
    }
    const count = toNumber(result.rows[0]?.count);
    if (count > 0) {
      counts.push({ label: check.label, count });
    }
  }

  return counts;
};

export const hardDeleteMergedSourceContact = async (
  db: QueryablePool,
  contactId: string,
  actorId: string
): Promise<void> => {
  const runDelete = async (queryable: QueryablePool): Promise<void> => {
    const remainingReferences = await loadRemainingContactReferenceCounts(queryable, contactId);
    if (remainingReferences.length > 0) {
      throw new Error(
        `Refusing to hard-delete merged contact ${contactId}; remaining references: ${remainingReferences
          .map((row) => `${row.label}=${row.count}`)
          .join(', ')}`
      );
    }

    const result = await queryable.query<{ id: string }>(
      `
        DELETE FROM contacts
        WHERE id = $1::uuid
          AND is_active = false
        RETURNING id::text
      `,
      [contactId]
    );
    if (result.rows.length !== 1) {
      throw new Error(`Refusing to hard-delete contact ${contactId}; source is missing or still active`);
    }
  };

  if (!db.connect) {
    await runDelete(db);
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [actorId]);
    await runDelete(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
