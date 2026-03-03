import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type {
  AccountCategory,
  AccountFilters,
  AccountType,
  PaginationParams,
} from '@app-types/account';
import type { DataScopeFilter } from '@app-types/dataScope';
import { extractPagination, getBoolean, getString } from '@utils/queryHelpers';
import { AccountCatalogUseCase } from '../usecases/accountCatalog.usecase';
import { AccountLifecycleUseCase } from '../usecases/accountLifecycle.usecase';
import { type ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createAccountsController = (
  catalogUseCase: AccountCatalogUseCase,
  lifecycleUseCase: AccountLifecycleUseCase,
  mode: ResponseMode
) => {
  const getAccounts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = ((req as any).validatedQuery ?? req.query) as Record<string, unknown>;
      const filters: AccountFilters = {
        search: getString(query.search),
        account_type: getString(query.account_type) as AccountType | undefined,
        category: getString(query.category) as AccountCategory | undefined,
        is_active: getBoolean(query.is_active),
      };

      const pagination: PaginationParams = extractPagination(query);
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const result = await catalogUseCase.list(filters, pagination, scope);
      sendData(res, mode, result);
    } catch (error) {
      next(error);
    }
  };

  const getAccountById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const account = await catalogUseCase.getByIdWithScope(req.params.id, scope);

      if (!account) {
        sendFailure(res, mode, 'not_found', 'Account not found', 404);
        return;
      }

      sendData(res, mode, account);
    } catch (error) {
      next(error);
    }
  };

  const getAccountContacts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      if (scope?.accountIds && !scope.accountIds.includes(req.params.id)) {
        sendFailure(res, mode, 'not_found', 'Account not found', 404);
        return;
      }

      const contacts = await catalogUseCase.listContacts(req.params.id);
      sendData(res, mode, contacts);
    } catch (error) {
      next(error);
    }
  };

  const createAccount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const account = await lifecycleUseCase.create(req.body, userId);
      sendData(res, mode, account, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateAccount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const scopedAccount = await catalogUseCase.getByIdWithScope(req.params.id, scope);
      if (!scopedAccount) {
        sendFailure(res, mode, 'not_found', 'Account not found', 404);
        return;
      }

      const account = await lifecycleUseCase.update(req.params.id, req.body, userId);
      if (!account) {
        sendFailure(res, mode, 'not_found', 'Account not found', 404);
        return;
      }

      sendData(res, mode, account);
    } catch (error) {
      next(error);
    }
  };

  const deleteAccount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const scopedAccount = await catalogUseCase.getByIdWithScope(req.params.id, scope);
      if (!scopedAccount) {
        sendFailure(res, mode, 'not_found', 'Account not found', 404);
        return;
      }

      const deleted = await lifecycleUseCase.delete(req.params.id, userId);
      if (!deleted) {
        sendFailure(res, mode, 'not_found', 'Account not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getAccounts,
    getAccountById,
    getAccountContacts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
};
