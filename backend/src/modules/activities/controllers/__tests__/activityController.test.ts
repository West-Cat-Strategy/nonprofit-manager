import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { getEntityActivities, getRecentActivities } from '../activityController';

type MockActivityService = {
  getRecentActivities: jest.Mock;
  getActivitiesForEntity: jest.Mock;
};

jest.mock('../../services/activityService', () => ({
  activityService: {
    getRecentActivities: jest.fn(),
    getActivitiesForEntity: jest.fn(),
  },
}));

jest.mock('@modules/shared/http/envelope', () => ({
  sendSuccess: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockActivityService = jest.requireMock('../../services/activityService')
  .activityService as MockActivityService;
const mockSendSuccess = sendSuccess as jest.MockedFunction<typeof sendSuccess>;

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response);

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    organizationId: 'org-1',
    params: {
      entityType: 'contact',
      entityId: 'contact-1',
    },
    query: {},
    validatedQuery: {},
    ...overrides,
  } as AuthRequest);

describe('activityController', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    res = createResponse();
    next = jest.fn();
  });

  it('forwards the active organization id when loading recent activities', async () => {
    const activities = [{ id: 'activity-1' }];
    mockActivityService.getRecentActivities.mockResolvedValueOnce(activities);

    await getRecentActivities(
      createRequest({
        validatedQuery: {
          limit: '25',
        },
      }),
      res,
      next
    );

    expect(mockActivityService.getRecentActivities).toHaveBeenCalledWith(25, 'org-1');
    expect(mockSendSuccess).toHaveBeenCalledWith(res, {
      activities,
      total: 1,
    });
  });

  it('forwards the active organization id when loading entity activities', async () => {
    const activities = [{ id: 'activity-2' }];
    mockActivityService.getActivitiesForEntity.mockResolvedValueOnce(activities);

    await getEntityActivities(
      createRequest({
        params: {
          entityType: 'contact',
          entityId: 'contact-42',
        },
      }),
      res,
      next
    );

    expect(mockActivityService.getActivitiesForEntity).toHaveBeenCalledWith(
      'contact',
      'contact-42',
      'org-1'
    );
    expect(mockSendSuccess).toHaveBeenCalledWith(res, {
      activities,
      total: 1,
    });
  });
});
