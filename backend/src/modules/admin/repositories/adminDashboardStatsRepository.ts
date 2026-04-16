import pool from '@config/database';

export interface AdminRecentSignup {
  id: string;
  email: string;
  created_at: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalContacts: number;
  recentDonations: number;
  recentSignups: AdminRecentSignup[];
}

const tableExists = async (tableName: string): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${tableName}`]
  );
  return result.rows[0]?.exists === true;
};

const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [tableName, columnName]
  );
  return result.rows[0]?.exists === true;
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const [usersTable, contactsTable, donationsTable, usersHasLastLoginAt] = await Promise.all([
    tableExists('users'),
    tableExists('contacts'),
    tableExists('donations'),
    columnExists('users', 'last_login_at'),
  ]);

  if (!usersTable) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalContacts: 0,
      recentDonations: 0,
      recentSignups: [],
    };
  }

  const [userCount, activeUserCount, contactCount, donationSum, recentSignups] =
    await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
      usersHasLastLoginAt
        ? pool.query<{ count: string }>(
            "SELECT COUNT(*)::text AS count FROM users WHERE last_login_at >= NOW() - INTERVAL '30 days'"
          )
        : pool.query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM users WHERE is_active = true'
          ),
      contactsTable
        ? pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM contacts')
        : Promise.resolve({ rows: [{ count: '0' }] }),
      donationsTable
        ? pool.query<{ sum: string | null }>(
            "SELECT COALESCE(SUM(amount), 0)::text AS sum FROM donations WHERE donation_date >= NOW() - INTERVAL '30 days'"
          )
        : Promise.resolve({ rows: [{ sum: '0' }] }),
      pool.query<{ id: string; email: string; created_at: Date }>(
        'SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5'
      ),
    ]);

  return {
    totalUsers: Number.parseInt(userCount.rows[0]?.count ?? '0', 10),
    activeUsers: Number.parseInt(activeUserCount.rows[0]?.count ?? '0', 10),
    totalContacts: Number.parseInt(contactCount.rows[0]?.count ?? '0', 10),
    recentDonations: Number.parseFloat(donationSum.rows[0]?.sum ?? '0'),
    recentSignups: recentSignups.rows.map((row) => ({
      id: row.id,
      email: row.email,
      created_at: row.created_at.toISOString(),
    })),
  };
};
