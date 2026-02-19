import pool from '@config/database';

async function safeDelete(query: string, params: unknown[]) {
  try {
    await pool.query(query, params);
  } catch {
    // Intentionally ignore cleanup failures from optional tables.
  }
}

export async function cleanupUserGraph(userId: string): Promise<void> {
  const ids = [userId];
  await safeDelete('DELETE FROM donations WHERE created_by = ANY($1)', [ids]);
  await safeDelete('DELETE FROM tasks WHERE created_by = ANY($1)', [ids]);
  await safeDelete('DELETE FROM volunteer_assignments WHERE created_by = ANY($1)', [ids]);
  await safeDelete('DELETE FROM volunteers WHERE created_by = ANY($1)', [ids]);
  await safeDelete('DELETE FROM events WHERE created_by = ANY($1)', [ids]);
  await safeDelete('DELETE FROM contacts WHERE created_by = ANY($1)', [ids]);
  await safeDelete('DELETE FROM accounts WHERE created_by = ANY($1)', [ids]);
  await safeDelete('DELETE FROM user_roles WHERE user_id = ANY($1)', [ids]);
  await safeDelete('DELETE FROM users WHERE id = ANY($1)', [ids]);
}
