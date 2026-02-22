/**
 * Contact Controller
 * Handles HTTP requests for contact management
 */

import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import { ContactFilters, PaginationParams } from '@app-types/contact';
import { AuthRequest } from '@middleware/auth';
import { invitationService, syncUserRole } from '@services/domains/integration';
import { extractPagination, getString, getBoolean } from '@utils/queryHelpers';
import { notFound, badRequest } from '@utils/responseHelpers';
import type { DataScopeFilter } from '@app-types/dataScope';

const contactService = services.contact;
const contactRoleService = services.contactRole;

const STAFF_ROLE_MAP: Record<string, string> = {
  'Executive Director': 'admin',
  Staff: 'staff',
};

const getStaffRoleForContact = (roles: string[]): string | null => {
  if (roles.includes('Executive Director')) return STAFF_ROLE_MAP['Executive Director'];
  if (roles.includes('Staff')) return STAFF_ROLE_MAP['Staff'];
  return null;
};

const ensureStaffUserAccount = async (
  contactId: string,
  roles: string[],
  createdBy: string
): Promise<{ inviteUrl?: string; role?: string } | null> => {
  const targetRole = getStaffRoleForContact(roles);
  if (!targetRole) return null;

  const contactResult = await services.pool.query(
    'SELECT email, first_name, last_name FROM contacts WHERE id = $1',
    [contactId]
  );
  const contact = contactResult.rows[0];

  if (!contact?.email) {
    throw new Error('Staff roles require a contact email to create an account');
  }

  const existingUser = await services.pool.query('SELECT id, role FROM users WHERE email = $1', [
    contact.email.toLowerCase(),
  ]);

  if (existingUser.rows.length > 0) {
    const user = existingUser.rows[0];
    if (user.role !== targetRole) {
      await services.pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
        targetRole,
        user.id,
      ]);
    }
    await syncUserRole(user.id, targetRole, services.pool);
    return { role: targetRole };
  }

  try {
    const invitation = await invitationService.createInvitation(
      {
        email: contact.email,
        role: targetRole,
        message: `Auto-invite created from contact role assignment for ${contact.first_name} ${contact.last_name}`,
      },
      createdBy
    );

    const baseUrl = process.env.FRONTEND_URL || 'HTTP://localhost:5173';
    const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;
    return { inviteUrl, role: targetRole };
  } catch (error: any) {
    if (error?.message?.includes('pending invitation')) {
      return { role: targetRole };
    }
    throw error;
  }
};

/**
 * GET /api/contacts
 * Get all contacts with filtering and pagination
 */
const getRoleFilter = (
  value: unknown
): 'staff' | 'volunteer' | 'board' | undefined => {
  if (value === 'staff' || value === 'volunteer' || value === 'board') return value;
  return undefined;
};

const getTagsFilter = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string') return undefined;
  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
};

export const getContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: ContactFilters = {
      search: getString(req.query.search),
      role: getRoleFilter(req.query.role),
      account_id: getString(req.query.account_id),
      is_active: getBoolean(req.query.is_active),
      tags: getTagsFilter(req.query.tags),
    };

    const pagination: PaginationParams = extractPagination(req.query);

    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const result = await contactService.getContacts(filters, pagination, scope);
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
      ? await contactService.getContactByIdWithScope(req.params.id, scope)
      : await contactService.getContactById(req.params.id);

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
    const contact = await contactService.createContact(contactData, userId);

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
      const scopedContact = await contactService.getContactByIdWithScope(req.params.id, scope);
      if (!scopedContact) {
        notFound(res, 'Contact');
        return;
      }
    }

    const userId = req.user!.id;
    const { roles, ...contactData } = req.body;
    const contact = await contactService.updateContact(req.params.id, contactData, userId);

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
