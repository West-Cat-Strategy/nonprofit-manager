import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import * as caseService from '../services/caseService';
import type { CreateCaseDTO, UpdateCaseDTO, CaseFilter, CreateCaseNoteDTO, UpdateCaseStatusDTO } from '../types/case';
import { logger } from '../config/logger';
import { PAGINATION } from '../config/constants';

export const createCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateCaseDTO;
    const userId = req.user?.id;
    const newCase = await caseService.createCase(data, userId);
    res.status(201).json(newCase);
  } catch (error) {
    logger.error('Error creating case:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
};

export const getCases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = req.query as CaseFilter;
    const { cases, total } = await caseService.getCases(filter);
    res.json({ cases, total, pagination: { page: parseInt(String(filter.page || 1)), limit: parseInt(String(filter.limit || PAGINATION.DEFAULT_LIMIT)) } });
  } catch (error) {
    logger.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
};

export const getCaseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const caseData = await caseService.getCaseById(id);
    if (!caseData) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }
    res.json(caseData);
  } catch (error) {
    logger.error('Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
};

export const updateCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as UpdateCaseDTO;
    const userId = req.user?.id;
    const updated = await caseService.updateCase(id, data, userId);
    res.json(updated);
  } catch (error) {
    logger.error('Error updating case:', error);
    res.status(500).json({ error: 'Failed to update case' });
  }
};

export const updateCaseStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as UpdateCaseStatusDTO;
    const userId = req.user?.id;
    const updated = await caseService.updateCaseStatus(id, data, userId);
    res.json(updated);
  } catch (error) {
    logger.error('Error updating case status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

export const getCaseNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notes = await caseService.getCaseNotes(id);
    res.json({ notes });
  } catch (error) {
    logger.error('Error fetching case notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const createCaseNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateCaseNoteDTO;
    const userId = req.user?.id;
    const note = await caseService.createCaseNote(data, userId);
    res.status(201).json(note);
  } catch (error) {
    logger.error('Error creating case note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

export const getCaseSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await caseService.getCaseSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching case summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

export const getCaseTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const types = await caseService.getCaseTypes();
    res.json({ types });
  } catch (error) {
    logger.error('Error fetching case types:', error);
    res.status(500).json({ error: 'Failed to fetch types' });
  }
};

export const getCaseStatuses = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statuses = await caseService.getCaseStatuses();
    res.json({ statuses });
  } catch (error) {
    logger.error('Error fetching case statuses:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
};

export const deleteCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await caseService.deleteCase(id);
    res.json({ success: true, message: 'Case deleted' });
  } catch (error) {
    logger.error('Error deleting case:', error);
    res.status(500).json({ error: 'Failed to delete case' });
  }
};
