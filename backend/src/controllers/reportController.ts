/**
 * Report Controller
 * Handles HTTP requests for custom report generation
 */

import { Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import type { ReportDefinition, ReportEntity } from '../types/report';

const reportService = new ReportService(pool);

/**
 * POST /api/reports/generate
 * Generate a custom report based on definition
 */
export const generateReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const definition: ReportDefinition = req.body;

    // Validate definition
    if (!definition.entity) {
      res.status(400).json({ error: 'Entity is required' });
      return;
    }

    if (!definition.fields || definition.fields.length === 0) {
      res.status(400).json({ error: 'At least one field must be selected' });
      return;
    }

    const result = await reportService.generateReport(definition);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/fields/:entity
 * Get available fields for an entity type
 */
export const getAvailableFields = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity = req.params.entity as ReportEntity;

    const validEntities = ['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'];
    if (!validEntities.includes(entity)) {
      res.status(400).json({ error: 'Invalid entity type' });
      return;
    }

    const fields = await reportService.getAvailableFields(entity);
    res.json(fields);
  } catch (error) {
    next(error);
  }
};

export default {
  generateReport,
  getAvailableFields,
};
