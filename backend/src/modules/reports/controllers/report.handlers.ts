/**
 * Report Controller
 * Handles HTTP requests for custom report generation
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth';
import { setTabularDownloadHeaders } from '@modules/shared/export/tabularExport';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import { REPORT_ENTITIES, type ReportDefinition, type ReportEntity } from '@app-types/report';
import {
  reportExportJobService,
  ReportExportJobArtifactGoneError,
  ReportExportJobArtifactNotReadyError,
} from '@services/reportExportJobService';
import {
  DirectReportExportTooLargeError,
  reportService,
} from '@modules/reports/services/reportService';
import { badRequest, conflict, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';

const DIRECT_EXPORT_TOO_LARGE_MESSAGE =
  'Report is too large for direct export. Use /v2/reports/exports to create an export job.';
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

    await reportService.assertDirectExportSupported(definition, { organizationId });
    const result = await reportService.generateReport(definition, { organizationId });
    const file = await reportService.exportReport(result, format as 'csv' | 'xlsx');
    setTabularDownloadHeaders(res, file);
    res.send(file.buffer);
  } catch (error) {
    if (error instanceof DirectReportExportTooLargeError) {
      conflict(res, DIRECT_EXPORT_TOO_LARGE_MESSAGE);
      return;
    }
    next(error);
  }
};

export const createExportJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_EXPORT)) return;

    const { definition, format, savedReportId, scheduledReportId, idempotencyKey } = req.body as {
      definition: ReportDefinition;
      format: 'csv' | 'xlsx';
      savedReportId?: string;
      scheduledReportId?: string;
      idempotencyKey?: string;
    };

    if (!definition || !format) {
      badRequest(res, 'Definition and format are required');
      return;
    }

    const organizationId = getOrgId(req);
    if (!organizationId) {
      unauthorized(res, 'Organization context required');
      return;
    }

    const headerIdempotencyKey =
      req.headers && typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : undefined;
    const effectiveIdempotencyKey =
      headerIdempotencyKey ||
      idempotencyKey ||
      undefined;

    const job = await reportExportJobService.createAndProcessJob({
      organizationId,
      requestedBy: req.user?.id || null,
      savedReportId,
      scheduledReportId,
      definition,
      format,
      idempotencyKey: effectiveIdempotencyKey,
      metadata: {
        source: 'api',
      },
    });

    sendSuccess(res, job, 201);
  } catch (error) {
    next(error);
  }
};

export const listExportJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const organizationId = getOrgId(req);
    if (!organizationId) {
      unauthorized(res, 'Organization context required');
      return;
    }

    const query = (req.validatedQuery ?? req.query) as { limit?: number };
    const jobs = await reportExportJobService.listJobs(
      organizationId,
      typeof query.limit === 'number' ? query.limit : 25
    );
    sendSuccess(res, jobs);
  } catch (error) {
    next(error);
  }
};

export const getExportJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_VIEW)) return;

    const organizationId = getOrgId(req);
    if (!organizationId) {
      unauthorized(res, 'Organization context required');
      return;
    }

    const job = await reportExportJobService.getJob(organizationId, req.params.id);
    if (!job) {
      notFoundMessage(res, 'Report export job not found');
      return;
    }

    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
};

export const downloadExportJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePermission(req, res, Permission.REPORT_EXPORT)) return;

    const organizationId = getOrgId(req);
    if (!organizationId) {
      unauthorized(res, 'Organization context required');
      return;
    }

    const job = await reportExportJobService.getJob(organizationId, req.params.id);
    if (!job) {
      notFoundMessage(res, 'Report export job not found');
      return;
    }

    if (job.status !== 'completed') {
      conflict(res, 'Report export job is not complete');
      return;
    }

    const file = await reportExportJobService.readArtifactFile(job);
    setTabularDownloadHeaders(res, file);
    res.send(file.buffer);
  } catch (error) {
    if (error instanceof ReportExportJobArtifactNotReadyError) {
      conflict(res, error.message);
      return;
    }
    if (error instanceof ReportExportJobArtifactGoneError) {
      sendError(res, 'gone', error.message, 410);
      return;
    }
    next(error);
  }
};

export default {
  generateReport,
  getAvailableFields,
  exportReport,
  createExportJob,
  listExportJobs,
  getExportJob,
  downloadExportJob,
};
