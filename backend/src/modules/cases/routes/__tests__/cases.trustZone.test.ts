import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { Permission } from '@utils/permissions';

const mockHandlers: Record<string, jest.Mock> = {};
const mockHandlerFor = (name: string, status = 200): jest.Mock => {
  mockHandlers[name] ||= jest.fn((_req: Request, res: Response) => {
    if (status === 204) {
      return res.status(status).send();
    }
    return res.status(status).json({ ok: true });
  });
  return mockHandlers[name];
};
const mockControllerProxy = new Proxy(
  {},
  {
    get: (_target, property) => mockHandlerFor(String(property)),
  }
) as Record<string, jest.Mock>;
const mockMiddlewareOrder: string[] = [];

jest.mock('@middleware/domains/auth', () => ({
  authenticate: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('@middleware/requireActiveOrganizationContext', () => ({
  requireActiveOrganizationContext: (
    req: Request & { accountId?: string; organizationId?: string; tenantId?: string },
    _res: Response,
    next: NextFunction
  ) => {
    req.organizationId = '00000000-0000-4000-8000-000000000001';
    req.accountId = req.organizationId;
    req.tenantId = req.organizationId;
    next();
  },
}));

jest.mock('@middleware/permissions', () => ({
  requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => {
    mockMiddlewareOrder.push(`permission:${permission}`);
    if (req.headers['x-deny-permission'] === permission) {
      res.status(403).json({
        success: false,
        error: { code: 'forbidden', message: `Forbidden: Permission '${permission}' not granted` },
      });
      return;
    }
    next();
  },
}));

jest.mock('@middleware/domains/platform', () => ({
  documentUpload: {
    single: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => {
      mockMiddlewareOrder.push('multer');
      next();
    }),
  },
  handleMulterError: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../controllers/catalog.controller', () => ({
  createCaseCatalogController: () => mockControllerProxy,
}));
jest.mock('../../controllers/lifecycle.controller', () => ({
  createCaseLifecycleController: () => mockControllerProxy,
}));
jest.mock('../../controllers/notes.controller', () => ({
  createCaseNotesController: () => mockControllerProxy,
}));
jest.mock('../../controllers/milestones.controller', () => ({
  createCaseMilestonesController: () => mockControllerProxy,
}));
jest.mock('../../controllers/relationships.controller', () => ({
  createCaseRelationshipsController: () => mockControllerProxy,
}));
jest.mock('../../controllers/services.controller', () => ({
  createCaseServicesController: () => mockControllerProxy,
}));
jest.mock('../../controllers/outcomes.controller', () => ({
  createCaseOutcomesController: () => mockControllerProxy,
}));
jest.mock('../../controllers/documents.controller', () => ({
  createCaseDocumentsController: () => mockControllerProxy,
}));
jest.mock('../../controllers/forms.controller', () => ({
  createCaseFormsController: () => mockControllerProxy,
}));
jest.mock('../../controllers/portalConversations.controller', () => ({
  getCasePortalConversations: mockHandlerFor('getCasePortalConversations'),
  replyCasePortalConversation: mockHandlerFor('replyCasePortalConversation', 201),
  resolvePortalConversation: mockHandlerFor('resolvePortalConversation', 201),
}));
jest.mock('../portalEscalations.routes', () => ({ registerCasePortalEscalationRoutes: jest.fn() }));
jest.mock('../queueViews.routes', () => ({ registerCaseQueueViewRoutes: jest.fn() }));
jest.mock('../reassessments.routes', () => ({ registerCaseReassessmentRoutes: jest.fn() }));
jest.mock('@modules/followUps/controllers/followUps.handlers', () => ({
  followUpController: { getCaseFollowUps: mockHandlerFor('getCaseFollowUps') },
}));

import { casesV2Routes } from '../index';

const caseId = '11111111-1111-4111-8111-111111111111';
const assignmentId = '22222222-2222-4222-8222-222222222222';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as Request & { user?: { id: string; email: string; role: string; type: 'app' } }).user = {
      id: '00000000-0000-4000-8000-000000000010',
      email: 'staff@example.com',
      role: 'staff',
      type: 'app',
    };
    next();
  });
  app.use('/api/v2/cases', casesV2Routes);
  return app;
};

describe('case staff trust-zone routes', () => {
  beforeEach(() => {
    mockMiddlewareOrder.length = 0;
    Object.values(mockHandlers).forEach((handler) => handler.mockClear());
  });

  it.each([
    [`/api/v2/cases/${caseId}`, 'getCaseById'],
    [`/api/v2/cases/${caseId}/notes`, 'getCaseNotes'],
    [`/api/v2/cases/${caseId}/documents`, 'getCaseDocuments'],
    [`/api/v2/cases/${caseId}/milestones`, 'getCaseMilestones'],
    [`/api/v2/cases/${caseId}/relationships`, 'getCaseRelationships'],
    [`/api/v2/cases/${caseId}/services`, 'getCaseServices'],
    [`/api/v2/cases/${caseId}/portal/conversations`, 'getCasePortalConversations'],
    [`/api/v2/cases/${caseId}/forms`, 'listAssignments'],
    [`/api/v2/cases/${caseId}/forms/${assignmentId}/response-packet`, 'downloadResponsePacket'],
  ])('requires CASE_VIEW for %s', async (path, handlerName) => {
    const response = await request(buildApp())
      .get(path)
      .set('x-deny-permission', Permission.CASE_VIEW)
      .expect(403);

    expect(response.body.error.message).toContain(Permission.CASE_VIEW);
    expect(mockHandlers[handlerName]).not.toHaveBeenCalled();
  });

  it.each([
    [`/api/v2/cases/${caseId}/documents`, 'uploadCaseDocument'],
    [`/api/v2/cases/${caseId}/forms/${assignmentId}/assets`, 'uploadAsset'],
  ])('checks CASE_EDIT before parsing uploads for %s', async (path, handlerName) => {
    await request(buildApp()).post(path).set('x-deny-permission', Permission.CASE_EDIT).expect(403);

    expect(mockMiddlewareOrder).toEqual([`permission:${Permission.CASE_EDIT}`]);
    expect(mockHandlers[handlerName]).not.toHaveBeenCalled();
  });
});
