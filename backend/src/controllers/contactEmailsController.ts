/**
 * Contact Emails Controller
 * Handles HTTP requests for contact email addresses
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { contactEmailService } from '@services/domains/engagement';
import { conflict, notFoundMessage } from '@utils/responseHelpers';

/**
 * GET /api/contacts/:contactId/emails
 * Get all email addresses for a contact
 */
export const getContactEmails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const emails = await contactEmailService.getContactEmails(contactId);
    res.json(emails);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/emails/:emailId
 * Get a single email address by ID
 */
export const getContactEmailById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailId } = req.params;
    const email = await contactEmailService.getContactEmailById(emailId);

    if (!email) {
      notFoundMessage(res, 'Email address not found');
      return;
    }

    res.json(email);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contacts/:contactId/emails
 * Create a new email address for a contact
 */
export const createContactEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;
    const email = await contactEmailService.createContactEmail(contactId, req.body, userId);
    res.status(201).json(email);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      conflict(res, error.message);
      return;
    }
    next(error);
  }
};

/**
 * PUT /api/contacts/emails/:emailId
 * Update an email address
 */
export const updateContactEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailId } = req.params;
    const userId = req.user!.id;
    const email = await contactEmailService.updateContactEmail(emailId, req.body, userId);

    if (!email) {
      notFoundMessage(res, 'Email address not found');
      return;
    }

    res.json(email);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      conflict(res, error.message);
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/contacts/emails/:emailId
 * Delete an email address
 */
export const deleteContactEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailId } = req.params;
    const success = await contactEmailService.deleteContactEmail(emailId);

    if (!success) {
      notFoundMessage(res, 'Email address not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
