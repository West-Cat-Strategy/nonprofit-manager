/**
 * Contact Notes Controller
 * Handles HTTP requests for contact notes
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as contactNoteService from '../services/contactNoteService';
import { notFoundMessage } from '../utils/responseHelpers';

/**
 * GET /api/contacts/:contactId/notes
 * Get all notes for a contact
 */
export const getContactNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const notes = await contactNoteService.getContactNotes(contactId);
    res.json(notes);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/notes/:noteId
 * Get a single note by ID
 */
export const getContactNoteById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { noteId } = req.params;
    const note = await contactNoteService.getContactNoteById(noteId);

    if (!note) {
      notFoundMessage(res, 'Note not found');
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contacts/:contactId/notes
 * Create a new note for a contact
 */
export const createContactNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;
    const note = await contactNoteService.createContactNote(contactId, req.body, userId);
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/contacts/notes/:noteId
 * Update a note
 */
export const updateContactNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { noteId } = req.params;
    const note = await contactNoteService.updateContactNote(noteId, req.body);

    if (!note) {
      notFoundMessage(res, 'Note not found');
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/contacts/notes/:noteId
 * Delete a note
 */
export const deleteContactNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { noteId } = req.params;
    const success = await contactNoteService.deleteContactNote(noteId);

    if (!success) {
      notFoundMessage(res, 'Note not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};