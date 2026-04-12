/**
 * Contact Controller
 * Handles HTTP requests for contact management
 */

import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import { ContactFilters, PaginationParams } from '@app-types/contact';
import { AuthRequest } from '@middleware/auth';
import { notFound, badRequest } from '@utils/responseHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';
import { parseContactListFilters, parseContactPagination } from '@modules/contacts/shared/contactQuery';
import { ensureStaffUserAccount } from '@services/contactStaffProvisioningService';

const contactService = services.contact;
const contactRoleService = services.contactRole;

/**
 * GET /api/contacts
 * Get all contacts with filtering and pagination
 */
export const getContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: ContactFilters = parseContactListFilters(req.query as Record<string, unknown>);
    const pagination: PaginationParams = parseContactPagination(req.query as Record<string, unknown>);

    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const result = await contactService.getContacts(filters, pagination, scope, req.user?.role);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contacts/bulk
 * Bulk update contacts (tags and/or active status)
 */
export const bulkUpdateContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactIds = Array.isArray(req.body.contactIds)
      ? req.body.contactIds.filter((id: unknown) => typeof id === 'string')
      : [];

    if (contactIds.length === 0) {
      badRequest(res, 'contactIds is required');
      return;
    }

    const tags = req.body.tags as
      | { add?: string[]; remove?: string[]; replace?: string[] }
      | undefined;

    const is_active =
      typeof req.body.is_active === 'boolean' ? req.body.is_active : undefined;

    const updated = await contactService.bulkUpdateContacts(
      contactIds,
      { is_active, tags },
      req.user!.id
    );

    res.json({ updated, contact_ids: contactIds });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/tags
 * Get distinct tags used on contacts
 */
export const getContactTags = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const tags = await contactService.getContactTags(scope);
    res.json({ tags });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
export const getContactById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const contact = scope
      ? await contactService.getContactByIdWithScope(req.params.id, scope, req.user?.role)
      : await contactService.getContactById(req.params.id, req.user?.role);

    if (!contact) {
      notFound(res, 'Contact');
      return;
    }

    const roles = await contactRoleService.getRolesForContact(req.params.id);
    res.json({ ...contact, roles: roles.map((role) => role.name) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contacts
 * Create new contact
 */
export const createContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { roles = [], ...contactData } = req.body;
    const contact = await contactService.createContact(contactData, userId, req.user?.role);

    let assignedRoles: string[] = [];
    let staffInvitation: { inviteUrl?: string; role?: string } | null = null;
    if (Array.isArray(roles)) {
      const roleRecords = await contactRoleService.setRolesForContact(
        contact.contact_id,
        roles,
        userId
      );
      assignedRoles = roleRecords.map((role) => role.name);
      if (assignedRoles.length > 0) {
        staffInvitation = await ensureStaffUserAccount(contact.contact_id, assignedRoles, userId);
      }
    }

    res.status(201).json({ ...contact, roles: assignedRoles, staffInvitation });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/contacts/:id
 * Update contact
 */
export const updateContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (scope) {
      const scopedContact = await contactService.getContactByIdWithScope(
        req.params.id,
        scope,
        req.user?.role
      );
      if (!scopedContact) {
        notFound(res, 'Contact');
        return;
      }
    }

    const userId = req.user!.id;
    const { roles, ...contactData } = req.body;
    const contact = await contactService.updateContact(req.params.id, contactData, userId, req.user?.role);

    if (!contact) {
      notFound(res, 'Contact');
      return;
    }

    let assignedRoles: string[] | undefined;
    let staffInvitation: { inviteUrl?: string; role?: string } | null = null;
    if (Array.isArray(roles)) {
      const roleRecords = await contactRoleService.setRolesForContact(
        req.params.id,
        roles,
        userId
      );
      assignedRoles = roleRecords.map((role) => role.name);
      if (assignedRoles.length > 0) {
        staffInvitation = await ensureStaffUserAccount(req.params.id, assignedRoles, userId);
      }
    } else {
      const roleRecords = await contactRoleService.getRolesForContact(req.params.id);
      assignedRoles = roleRecords.map((role) => role.name);
    }

    res.json({ ...contact, roles: assignedRoles, staffInvitation });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/roles
 * Get available contact roles
 */
export const getContactRoles = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roles = await contactRoleService.getAllRoles();
    const hiddenRoleNames = new Set(['Executive Director', 'Committee Member']);
    const roleOrder = new Map<string, number>([
      ['Client', 1],
      ['Board Member', 2],
      ['Staff', 3],
      ['Member', 4],
    ]);
    const visibleRoles = roles
      .filter((role) => !hiddenRoleNames.has(role.name))
      .sort((a, b) => {
        const aRank = roleOrder.get(a.name) ?? 100;
        const bRank = roleOrder.get(b.name) ?? 100;
        if (aRank !== bRank) return aRank - bRank;
        return a.name.localeCompare(b.name);
      });
    res.json({ roles: visibleRoles });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
export const deleteContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (scope) {
      const scopedContact = await contactService.getContactByIdWithScope(req.params.id, scope);
      if (!scopedContact) {
        notFound(res, 'Contact');
        return;
      }
    }

    const userId = req.user!.id;
    const success = await contactService.deleteContact(req.params.id, userId);

    if (!success) {
      notFound(res, 'Contact');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
