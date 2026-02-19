import { Response } from 'express';
import pool from '@config/database';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { serverError } from '@utils/responseHelpers';

const tableExists = async (tableName: string): Promise<boolean> => {
    const result = await pool.query(
        'SELECT to_regclass($1) IS NOT NULL AS exists',
        [`public.${tableName}`]
    );
    return result.rows[0]?.exists === true;
};

const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
    const result = await pool.query(
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

export const getAdminStats = async (req: AuthRequest, res: Response) => {
    try {
        const [usersTable, contactsTable, donationsTable, usersHasLastLoginAt] = await Promise.all([
            tableExists('users'),
            tableExists('contacts'),
            tableExists('donations'),
            columnExists('users', 'last_login_at'),
        ]);

        if (!usersTable) {
            return res.json({
                totalUsers: 0,
                activeUsers: 0,
                totalContacts: 0,
                recentDonations: 0,
                recentSignups: [],
            });
        }

        const [
            userCount,
            activeUserCount,
            contactCount,
            donationSum,
            recentSignups
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            usersHasLastLoginAt
                ? pool.query("SELECT COUNT(*) FROM users WHERE last_login_at >= NOW() - INTERVAL '30 days'")
                : pool.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
            contactsTable ? pool.query('SELECT COUNT(*) FROM contacts') : Promise.resolve({ rows: [{ count: '0' }] }),
            donationsTable
                ? pool.query("SELECT SUM(amount) FROM donations WHERE donation_date >= NOW() - INTERVAL '30 days'")
                : Promise.resolve({ rows: [{ sum: '0' }] }),
            pool.query('SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5')
        ]);

        return res.json({
            totalUsers: parseInt(userCount.rows[0].count),
            activeUsers: parseInt(activeUserCount.rows[0].count),
            totalContacts: parseInt(contactCount.rows[0].count),
            recentDonations: parseFloat(donationSum.rows[0].sum || '0'),
            recentSignups: recentSignups.rows
        });
    } catch (error) {
        logger.error('Failed to fetch admin stats', {
            error,
            correlationId: req.correlationId,
        });
        return serverError(res, 'Failed to fetch admin stats');
    }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        // Check if audit_log table exists (it might not in early dev environments without full migrations)
        // and fallback gracefully if it doesn't to prevent crashing the admin panel
        const tableCheck = await pool.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log')"
        );

        if (!tableCheck.rows[0].exists) {
            return res.json({ logs: [], total: 0, warning: 'Audit logging not enabled' });
        }

        const logs = await pool.query(
            `SELECT 
        al.id, 
        al.table_name, 
        al.operation, 
        al.changed_at, 
        u.email as changed_by_email,
        al.changes 
      FROM audit_log al
      LEFT JOIN users u ON al.changed_by = u.id
      ORDER BY al.changed_at DESC
      LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const count = await pool.query('SELECT COUNT(*) FROM audit_log');

        return res.json({
            logs: logs.rows,
            total: parseInt(count.rows[0].count)
        });
    } catch {
        // If column 'changes' doesn't exist (schema Mismatch from 002 vs 033), handle specific query error? 
        // The migration 033 uses 'old_values', 'new_values', 'changed_fields'.
        // Let's adjust the query to match 033 schema better.
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const logsRetry = await pool.query(
                `SELECT 
            al.id, 
            al.table_name, 
            al.operation, 
            al.changed_at, 
            u.email as changed_by_email,
            al.changed_fields,
            al.is_sensitive
        FROM audit_log al
        LEFT JOIN users u ON al.changed_by = u.id
        ORDER BY al.changed_at DESC
        LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            const countRetry = await pool.query('SELECT COUNT(*) FROM audit_log');
            return res.json({
                logs: logsRetry.rows,
                total: parseInt(countRetry.rows[0].count)
            });

        } catch {
            return serverError(res, 'Failed to fetch audit logs');
        }
    }
};
