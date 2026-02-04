/**
 * Account Controller
 * Handles HTTP requests for account management
 */

import { Response, NextFunction } from 'express';
import { AccountService } from '../services/accountService';
import pool from '../config/database';
import { AccountCategory, AccountFilters, AccountType, PaginationParams } from '../types/account';
import { AuthRequest } from '../middleware/auth';
import { getString, getBoolean } from '../utils/queryHelpers';
import { notFound } from '../utils/responseHelpers';
import type { DataScopeFilter } from '../types/dataScope';

const accountService = new AccountService(pool);

/**
 * GET /api/accounts
 * Get all accounts with filtering and pagination
 */
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

    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const result = await accountService.getAccounts(filters, pagination, scope);
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
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const result = scope
      ? await accountService.getAccountByIdWithScope(req.params.id, scope)
      : await accountService.getAccountById(req.params.id);

    if (!result) {
      notFound(res, 'Account');
      return;
    }

    res.json(result);
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
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (scope?.accountIds && !scope.accountIds.includes(req.params.id)) {
      notFound(res, 'Account');
      return;
    }

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
      notFound(res, 'Account');
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
      notFound(res, 'Account');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
