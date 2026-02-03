/**
 * Contact Controller
 * Handles HTTP requests for contact management
 */

import { Response, NextFunction } from 'express';
import { ContactService } from '../services/contactService';
import pool from '../config/database';
import { ContactFilters, PaginationParams } from '../types/contact';
import { AuthRequest } from '../middleware/auth';

const contactService = new ContactService(pool);

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

    res.json(contact);
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
    const contact = await contactService.createContact(req.body, userId);
    res.status(201).json(contact);
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
    const contact = await contactService.updateContact(req.params.id, req.body, userId);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
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
