/**
 * Contact Relationships Controller
 * Handles HTTP requests for contact relationships
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { contactRelationshipService } from '@services';
import { conflict, notFoundMessage } from '@utils/responseHelpers';

/**
 * GET /api/contacts/:contactId/relationships
 * Get all relationships for a contact
 */
export const getContactRelationships = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const relationships = await contactRelationshipService.getContactRelationships(contactId);
    res.json(relationships);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/relationships/:relationshipId
 * Get a single relationship by ID
 */
export const getContactRelationshipById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { relationshipId } = req.params;
    const relationship = await contactRelationshipService.getContactRelationshipById(relationshipId);

    if (!relationship) {
      notFoundMessage(res, 'Relationship not found');
      return;
    }

    res.json(relationship);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contacts/:contactId/relationships
 * Create a new relationship
 */
export const createContactRelationship = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;
    const relationship = await contactRelationshipService.createContactRelationship(contactId, req.body, userId);
    res.status(201).json(relationship);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      conflict(res, error.message);
      return;
    }
    if (error.message.includes('not found')) {
      notFoundMessage(res, error.message);
      return;
    }
    next(error);
  }
};

/**
 * PUT /api/contacts/relationships/:relationshipId
 * Update a relationship
 */
export const updateContactRelationship = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { relationshipId } = req.params;
    const userId = req.user!.id;
    const relationship = await contactRelationshipService.updateContactRelationship(relationshipId, req.body, userId);

    if (!relationship) {
      notFoundMessage(res, 'Relationship not found');
      return;
    }

    res.json(relationship);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/contacts/relationships/:relationshipId
 * Soft delete a relationship
 */
export const deleteContactRelationship = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { relationshipId } = req.params;
    const success = await contactRelationshipService.deleteContactRelationship(relationshipId);

    if (!success) {
      notFoundMessage(res, 'Relationship not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
