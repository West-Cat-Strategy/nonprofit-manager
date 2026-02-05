/**
 * Contact Phones Controller
 * Handles HTTP requests for contact phone numbers
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as contactPhoneService from '../services/contactPhoneService';
import { badRequest, notFoundMessage } from '../utils/responseHelpers';

/**
 * GET /api/contacts/:contactId/phones
 * Get all phone numbers for a contact
 */
export const getContactPhones = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const phones = await contactPhoneService.getContactPhones(contactId);
    res.json(phones);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/phones/:phoneId
 * Get a single phone number by ID
 */
export const getContactPhoneById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneId } = req.params;
    const phone = await contactPhoneService.getContactPhoneById(phoneId);

    if (!phone) {
      notFoundMessage(res, 'Phone number not found');
      return;
    }

    res.json(phone);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contacts/:contactId/phones
 * Create a new phone number for a contact
 */
export const createContactPhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;
    const phone = await contactPhoneService.createContactPhone(contactId, req.body, userId);
    res.status(201).json(phone);
  } catch (error: any) {
    if (error.message === 'This phone number already exists for this contact') {
      badRequest(res, error.message);
      return;
    }
    next(error);
  }
};

/**
 * PUT /api/contacts/phones/:phoneId
 * Update a phone number
 */
export const updateContactPhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneId } = req.params;
    const userId = req.user!.id;
    const phone = await contactPhoneService.updateContactPhone(phoneId, req.body, userId);

    if (!phone) {
      notFoundMessage(res, 'Phone number not found');
      return;
    }

    res.json(phone);
  } catch (error: any) {
    if (error.message === 'This phone number already exists for this contact') {
      badRequest(res, error.message);
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/contacts/phones/:phoneId
 * Delete a phone number
 */
export const deleteContactPhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneId } = req.params;
    const success = await contactPhoneService.deleteContactPhone(phoneId);

    if (!success) {
      notFoundMessage(res, 'Phone number not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};