/**
 * Report Controller
 * Handles HTTP requests for custom report generation
 */

import { Response, NextFunction } from 'express';
import { services } from '@container/services';
import { AuthRequest } from '@middleware/auth';
import { REPORT_ENTITIES, type ReportDefinition, type ReportEntity } from '@app-types/report';
import { badRequest, unauthorized } from '@utils/responseHelpers';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';

const reportService = services.report;
const getOrgId = (req: AuthRequest): string | null =>
  req.organizationId || req.accountId || req.tenantId || null;

const ensurePermission = (
  req: AuthRequest,
  res: Response,
  permission: Permission
): boolean => {
  const guard = requirePermissionSafe(req, permission);
  if (!guard.ok) {
    if (guard.error.code === 'unauthorized') {
      sendUnauthorized(res, guard.error.message);
    } else {
      sendForbidden(res, guard.error.message || 'Forbidden');
    }
    return false;
  }
  return true;
};

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
    if (!ensurePermission(req, res, Permission.REPORT_CREATE)) return;

    const definition: ReportDefinition = req.body;

    // Validate definition
    if (!definition.entity) {
      badRequest(res, 'Entity is required');
      return;
    }

    const hasFields = Array.isArray(definition.fields) && definition.fields.length > 0;
    const hasAggregations =
      Array.isArray(definition.aggregations) && definition.aggregations.length > 0;

    if (!hasFields && !hasAggregations) {
      badRequest(res, 'At least one field or aggregation must be selected');
      return;
    }

    const organizationId = getOrgId(req);
    if (!organizationId) {
      unauthorized(res, 'Organization context required');
      return;
    }

    const result = await reportService.generateReport(definition, { organizationId });
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
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const entity = req.params.entity as ReportEntity;

    if (!REPORT_ENTITIES.includes(entity)) {
      badRequest(res, 'Invalid entity type');
      return;
    }

    const fields = await reportService.getAvailableFields(entity);
    res.json(fields);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reports/export
 * Generate and export a report
 */
export const exportReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_EXPORT)) return;

    const { definition, format } = req.body;

    if (!definition || !format) {
      badRequest(res, 'Definition and format are required');
      return;
    }

    if (!['csv', 'xlsx'].includes(format)) {
      badRequest(res, 'Invalid format. Supported formats: csv, xlsx');
      return;
    }

    const organizationId = getOrgId(req);
    if (!organizationId) {
      unauthorized(res, 'Organization context required');
      return;
    }

    const result = await reportService.generateReport(definition, { organizationId });
    const buffer = await reportService.exportReport(result, format as 'csv' | 'xlsx');

    const fileName = `${definition.entity}_report_${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export default {
  generateReport,
  getAvailableFields,
  exportReport,
};
