import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type {
  ContactFilters,
  ContactMergeRequest,
  ContactRole,
  CreateContactDTO,
  PaginationParams,
  UpdateContactDTO,
} from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import { setTabularDownloadHeaders } from '@modules/shared/export/tabularExport';
import { parseMultipartJsonField } from '@modules/shared/import/peopleImportParser';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ContactImportExportUseCase } from '../usecases/contactImportExport.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';
import { parseContactListFilters, parseContactPagination } from '../shared/contactQuery';

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

export const createContactDirectoryController = (
  useCase: ContactDirectoryUseCase,
  importExportUseCase: ContactImportExportUseCase
) => {
  const getContacts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? req.query) as Record<string, unknown>;
      const filters: ContactFilters = parseContactListFilters(query);
      const pagination: PaginationParams = parseContactPagination(query);
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const result = await useCase.list(filters, pagination, scope, req.user?.role);
      sendData(res, result);
    } catch (error) {
      next(error);
    }
  };

  const lookupContacts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? req.query) as {
        q: string;
        limit?: number;
        is_active?: boolean;
      };
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const items = await useCase.lookup(
        {
          q: query.q,
          limit: query.limit,
          is_active: query.is_active ?? true,
        },
        scope
      );
      sendData(res, { items });
    } catch (error) {
      next(error);
    }
  };

  const getContactTags = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const tags = await useCase.listTags(scope);
      sendData(res, tags);
    } catch (error) {
      next(error);
    }
  };

  const getContactRoles = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = normalizeRoles(await useCase.listRoles());
      sendData(res, roles);
    } catch (error) {
      next(error);
    }
  };

  const bulkUpdateContacts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const contactIds = Array.isArray(req.body.contactIds)
        ? req.body.contactIds.filter((id: unknown): id is string => typeof id === 'string')
        : [];

      if (contactIds.length === 0) {
        sendFailure(res, 'VALIDATION_ERROR', 'contactIds is required', 400);
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
      sendData(res, { updated, contact_ids: contactIds });
    } catch (error) {
      next(error);
    }
  };

  const getContactById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const contact = await useCase.getById(req.params.id, scope, req.user?.role);

      if (!contact) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, contact);
    } catch (error) {
      next(error);
    }
  };

  const createContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const contact = await useCase.create(req.body as CreateContactDTO, userId, req.user?.role);
      sendData(res, contact, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const contact = await useCase.update(
        req.params.id,
        req.body as UpdateContactDTO,
        userId,
        scope,
        req.user?.role
      );

      if (!contact) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, contact);
    } catch (error) {
      next(error);
    }
  };

  const deleteContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const deleted = await useCase.delete(req.params.id, userId, scope);

      if (!deleted) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const getContactMergePreview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const query = req.validatedQuery as { target_contact_id: string };
      const preview = await useCase.getMergePreview(req.params.id, query.target_contact_id, scope, req.user?.role);

      if (!preview) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, preview);
    } catch (error) {
      next(error);
    }
  };

  const mergeContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const payload = req.body as ContactMergeRequest;
      const merged = await useCase.merge(req.params.id, payload, userId, scope, req.user?.role);

      if (!merged) {
        sendFailure(res, 'NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendData(res, merged);
    } catch (error) {
      next(error);
    }
  };

  const exportContacts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        sendFailure(res, 'BAD_REQUEST', 'Organization context required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const file = await importExportUseCase.exportContacts(
        req.body,
        organizationId,
        scope,
        req.user?.role
      );
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  const downloadImportTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? req.query) as { format?: 'csv' | 'xlsx' };
      const file = await importExportUseCase.getImportTemplate(query.format || 'csv');
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  const previewImport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        sendFailure(res, 'BAD_REQUEST', 'Organization context required', 400);
        return;
      }

      if (!req.file) {
        sendFailure(res, 'VALIDATION_ERROR', 'Import file is required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const mapping = parseMultipartJsonField<Record<string, unknown>>(req.body.mapping);
      const preview = await importExportUseCase.previewImport(req.file, mapping, organizationId, scope);
      sendData(res, preview);
    } catch (error) {
      next(error);
    }
  };

  const commitImport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.organizationId;
      const userId = req.user?.id;

      if (!organizationId) {
        sendFailure(res, 'BAD_REQUEST', 'Organization context required', 400);
        return;
      }

      if (!userId) {
        sendFailure(res, 'AUTH_ERROR', 'Authentication required', 401);
        return;
      }

      if (!req.file) {
        sendFailure(res, 'VALIDATION_ERROR', 'Import file is required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const mapping = parseMultipartJsonField<Record<string, unknown>>(req.body.mapping);
      const result = await importExportUseCase.commitImport(
        req.file,
        mapping,
        userId,
        organizationId,
        scope
      );
      sendData(res, result);
    } catch (error) {
      next(error);
    }
  };

  return {
    getContacts,
    lookupContacts,
    getContactTags,
    getContactRoles,
    bulkUpdateContacts,
    getContactById,
    createContact,
    updateContact,
    deleteContact,
    getContactMergePreview,
    mergeContact,
    exportContacts,
    downloadImportTemplate,
    previewImport,
    commitImport,
  };
};
