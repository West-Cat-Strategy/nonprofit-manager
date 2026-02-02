/**
 * Account Controller
 * Handles HTTP requests for account management
 */

import { Response, NextFunction } from 'express';
import { AccountService } from '../services/accountService';
import pool from '../config/database';
import { AccountCategory, AccountFilters, AccountType, PaginationParams } from '../types/account';
import { AuthRequest } from '../middleware/auth';

const accountService = new AccountService(pool);

/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getBoolean = (value: unknown): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export const getAccounts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: AccountFilters = {
      search: getString(req.query.search),
      account_type: getString(req.query.account_type) as AccountType | undefined,
      category: getString(req.query.category) as AccountCategory | undefined,
      is_active: getBoolean(req.query.is_active),
    };

    const pagination: PaginationParams = {
      page: getString(req.query.page) ? parseInt(req.query.page as string) : undefined,
      limit: getString(req.query.limit) ? parseInt(req.query.limit as string) : undefined,
      sort_by: getString(req.query.sort_by),
      sort_order: getString(req.query.sort_order) as 'asc' | 'desc' | undefined,
    };

    const result = await accountService.getAccounts(filters, pagination);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/accounts/:id
 * Get account by ID
 */
export const getAccountById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const account = await accountService.getAccountById(req.params.id);

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json(account);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/accounts/:id/contacts
 * Get contacts for an account
 */
export const getAccountContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contacts = await accountService.getAccountContacts(req.params.id);
    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/accounts
 * Create new account
 */
export const createAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const account = await accountService.createAccount(req.body, userId);
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/accounts/:id
 * Update account
 */
export const updateAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const account = await accountService.updateAccount(req.params.id, req.body, userId);

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json(account);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/accounts/:id
 * Soft delete account
 */
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const success = await accountService.deleteAccount(req.params.id, userId);

    if (!success) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
