import { Response } from 'express';
import pool from '@config/database';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { getAuditLogPage } from '@services/auditLogQueryService';
import { serverError } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

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
            return sendSuccess(res, {
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

        return sendSuccess(res, {
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
        const query = req.validatedQuery as { limit: number; offset: number } | undefined;
        const limit = query?.limit ?? 50;
        const offset = query?.offset ?? 0;
        const page = await getAuditLogPage({ limit, offset });
        return sendSuccess(res, page);
    } catch (error) {
        logger.error('Failed to fetch audit logs', {
            error,
            correlationId: req.correlationId,
        });
        return serverError(res, 'Failed to fetch audit logs');
    }
};

export const getUserAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const query = req.validatedQuery as { limit: number; offset: number } | undefined;
        const limit = query?.limit ?? 50;
        const offset = query?.offset ?? 0;
        const params = (req.validatedParams ?? req.params) as { id: string };
        const page = await getAuditLogPage({ limit, offset, userId: params.id });
        return sendSuccess(res, page);
    } catch (error) {
        logger.error('Failed to fetch user audit logs', {
            error,
            correlationId: req.correlationId,
        });
        return serverError(res, 'Failed to fetch user audit logs');
    }
};
