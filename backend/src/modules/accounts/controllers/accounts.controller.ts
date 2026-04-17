import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type {
  AccountCategory,
  AccountFilters,
  AccountType,
  PaginationParams,
} from '@app-types/account';
import type { DataScopeFilter } from '@app-types/dataScope';
import { setTabularDownloadHeaders } from '@modules/shared/export/tabularExport';
import { parseMultipartJsonField } from '@modules/shared/import/peopleImportParser';
import { extractPagination, getBoolean, getString } from '@utils/queryHelpers';
import { AccountCatalogUseCase } from '../usecases/accountCatalog.usecase';
import { AccountImportExportUseCase } from '../usecases/accountImportExport.usecase';
import { AccountLifecycleUseCase } from '../usecases/accountLifecycle.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';

export const createAccountsController = (
  catalogUseCase: AccountCatalogUseCase,
  lifecycleUseCase: AccountLifecycleUseCase,
  importExportUseCase: AccountImportExportUseCase
) => {
  const getAccounts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? req.query) as Record<string, unknown>;
      const filters: AccountFilters = {
        search: getString(query.search),
        account_type: getString(query.account_type) as AccountType | undefined,
        category: getString(query.category) as AccountCategory | undefined,
        is_active: getBoolean(query.is_active),
      };

      const pagination: PaginationParams = extractPagination(query);
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const result = await catalogUseCase.list(filters, pagination, scope);
      sendData(res, result);
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
        sendFailure(res, 'not_found', 'Account not found', 404);
        return;
      }

      sendData(res, account);
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
        sendFailure(res, 'not_found', 'Account not found', 404);
        return;
      }

      const contacts = await catalogUseCase.listContacts(req.params.id);
      sendData(res, contacts);
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
        sendFailure(res, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const account = await lifecycleUseCase.create(req.body, userId);
      sendData(res, account, 201);
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
        sendFailure(res, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const scopedAccount = await catalogUseCase.getByIdWithScope(req.params.id, scope);
      if (!scopedAccount) {
        sendFailure(res, 'not_found', 'Account not found', 404);
        return;
      }

      const account = await lifecycleUseCase.update(req.params.id, req.body, userId);
      if (!account) {
        sendFailure(res, 'not_found', 'Account not found', 404);
        return;
      }

      sendData(res, account);
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
        sendFailure(res, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const scopedAccount = await catalogUseCase.getByIdWithScope(req.params.id, scope);
      if (!scopedAccount) {
        sendFailure(res, 'not_found', 'Account not found', 404);
        return;
      }

      const deleted = await lifecycleUseCase.delete(req.params.id, userId);
      if (!deleted) {
        sendFailure(res, 'not_found', 'Account not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const exportAccounts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const file = await importExportUseCase.exportAccounts(req.body, scope);
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  const downloadImportTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? req.query) as { format?: 'csv' | 'xlsx' };
      const file = await importExportUseCase.getImportTemplate(query.format || 'csv');
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  const previewImport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        sendFailure(res, 'validation_error', 'Import file is required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const mapping = parseMultipartJsonField<Record<string, unknown>>(req.body.mapping);
      const preview = await importExportUseCase.previewImport(req.file, mapping, scope);
      sendData(res, preview);
    } catch (error) {
      next(error);
    }
  };

  const commitImport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      if (!req.file) {
        sendFailure(res, 'validation_error', 'Import file is required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const mapping = parseMultipartJsonField<Record<string, unknown>>(req.body.mapping);
      const result = await importExportUseCase.commitImport(req.file, mapping, userId, scope);
      sendData(res, result);
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
    exportAccounts,
    downloadImportTemplate,
    previewImport,
    commitImport,
  };
};
