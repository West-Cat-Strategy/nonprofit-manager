/**
 * Contact Controller
 * Handles HTTP requests for contact management
 */

import { Response, NextFunction } from 'express';
import { ContactService } from '../services/contactService';
import { ContactRoleService } from '../services/contactRoleService';
import pool from '../config/database';
import { ContactFilters, PaginationParams } from '../types/contact';
import { AuthRequest } from '../middleware/auth';
import * as invitationService from '../services/invitationService';
import { syncUserRole } from '../services/userRoleService';

const contactService = new ContactService(pool);
const contactRoleService = new ContactRoleService(pool);

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

  const contactResult = await pool.query(
    'SELECT email, first_name, last_name FROM contacts WHERE id = $1',
    [contactId]
  );
  const contact = contactResult.rows[0];

  if (!contact?.email) {
    throw new Error('Staff roles require a contact email to create an account');
  }

  const existingUser = await pool.query('SELECT id, role FROM users WHERE email = $1', [
    contact.email.toLowerCase(),
  ]);

  if (existingUser.rows.length > 0) {
    const user = existingUser.rows[0];
    if (user.role !== targetRole) {
      await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
        targetRole,
        user.id,
      ]);
    }
    await syncUserRole(user.id, targetRole, pool);
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

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
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
const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getBoolean = (value: unknown): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export const getContacts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: ContactFilters = {
      search: getString(req.query.search),
      account_id: getString(req.query.account_id),
      is_active: getBoolean(req.query.is_active),
    };

    const pagination: PaginationParams = {
      page: getString(req.query.page) ? parseInt(req.query.page as string) : undefined,
      limit: getString(req.query.limit) ? parseInt(req.query.limit as string) : undefined,
      sort_by: getString(req.query.sort_by),
      sort_order: getString(req.query.sort_order) as 'asc' | 'desc' | undefined,
    };

    const result = await contactService.getContacts(filters, pagination);
    res.json(result);
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
    const contact = await contactService.getContactById(req.params.id);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
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
    const userId = req.user!.id;
    const { roles, ...contactData } = req.body;
    const contact = await contactService.updateContact(req.params.id, contactData, userId);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
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
    res.json({ roles });
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
    const userId = req.user!.id;
    const success = await contactService.deleteContact(req.params.id, userId);

    if (!success) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
