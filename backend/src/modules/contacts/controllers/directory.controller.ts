import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { ContactFilters, ContactRole, CreateContactDTO, PaginationParams, UpdateContactDTO } from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import { extractPagination, getBoolean, getString } from '@utils/queryHelpers';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

const hiddenRoleNames = new Set(['Executive Director', 'Committee Member']);
const roleOrder = new Map<string, number>([
  ['Client', 1],
  ['Board Member', 2],
  ['Staff', 3],
  ['Member', 4],
]);

const normalizeRoles = (roles: ContactRole[]): ContactRole[] =>
  roles
    .filter((role) => !hiddenRoleNames.has(role.name))
    .sort((a, b) => {
      const aRank = roleOrder.get(a.name) ?? 100;
      const bRank = roleOrder.get(b.name) ?? 100;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return a.name.localeCompare(b.name);
    });

const getRoleFilter = (value: unknown): 'staff' | 'volunteer' | 'board' | undefined => {
  if (value === 'staff' || value === 'volunteer' || value === 'board') {
    return value;
  }
  return undefined;
};

const getTagsFilter = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return tags.length > 0 ? tags : undefined;
};

export const createContactDirectoryController = (
  useCase: ContactDirectoryUseCase,
  mode: ResponseMode
) => {
  const getContacts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: ContactFilters = {
        search: getString(req.query.search),
        role: getRoleFilter(req.query.role),
        account_id: getString(req.query.account_id),
        is_active: getBoolean(req.query.is_active),
        tags: getTagsFilter(req.query.tags),
      };

      const pagination: PaginationParams = extractPagination(req.query as Record<string, unknown>);
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const result = await useCase.list(filters, pagination, scope);
      sendData(res, mode, result);
    } catch (error) {
      next(error);
    }
  };

  const getContactTags = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const tags = await useCase.listTags(scope);
      sendData(res, mode, mode === 'v2' ? tags : { tags });
    } catch (error) {
      next(error);
    }
  };

  const getContactRoles = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = normalizeRoles(await useCase.listRoles());
      sendData(res, mode, mode === 'v2' ? roles : { roles });
    } catch (error) {
      next(error);
    }
  };

  const bulkUpdateContacts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const contactIds = Array.isArray(req.body.contactIds)
        ? req.body.contactIds.filter((id: unknown): id is string => typeof id === 'string')
        : [];

      if (contactIds.length === 0) {
        sendFailure(res, mode, 'VALIDATION_ERROR', 'contactIds is required', 400);
        return;
      }

      const tags = req.body.tags as
        | {
            add?: string[];
            remove?: string[];
            replace?: string[];
          }
        | undefined;
      const is_active = typeof req.body.is_active === 'boolean' ? req.body.is_active : undefined;

      const updated = await useCase.bulkUpdate(contactIds, { is_active, tags }, userId);
      sendData(res, mode, { updated, contact_ids: contactIds });
    } catch (error) {
      next(error);
    }
  };

  const getContactById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const contact = await useCase.getById(req.params.id, scope);

      if (!contact) {
        sendFailure(res, mode, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, mode, contact);
    } catch (error) {
      next(error);
    }
  };

  const createContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const contact = await useCase.create(req.body as CreateContactDTO, userId);
      sendData(res, mode, contact, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const contact = await useCase.update(req.params.id, req.body as UpdateContactDTO, userId, scope);

      if (!contact) {
        sendFailure(res, mode, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, mode, contact);
    } catch (error) {
      next(error);
    }
  };

  const deleteContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const deleted = await useCase.delete(req.params.id, userId, scope);

      if (!deleted) {
        sendFailure(res, mode, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    getContacts,
    getContactTags,
    getContactRoles,
    bulkUpdateContacts,
    getContactById,
    createContact,
    updateContact,
    deleteContact,
  };
};
