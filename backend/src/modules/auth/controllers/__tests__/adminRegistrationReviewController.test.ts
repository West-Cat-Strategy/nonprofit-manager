import type { NextFunction, Request, Response } from 'express';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import {
  confirmAdminRegistrationReviewHandler,
  previewAdminRegistrationReviewHandler,
} from '../adminRegistrationReviewController';
import {
  AdminRegistrationReviewError,
  confirmAdminRegistrationReview,
  previewAdminRegistrationReview,
} from '@modules/admin/usecases/adminRegistrationReviewUseCase';

jest.mock('@modules/shared/http/envelope', () => ({
  __esModule: true,
  sendSuccess: jest.fn(),
  sendError: jest.fn(),
}));

jest.mock('@modules/admin/usecases/adminRegistrationReviewUseCase', () => ({
  __esModule: true,
  AdminRegistrationReviewError: class AdminRegistrationReviewError extends Error {
    code: string;
    status: number;

    constructor(message: string, code: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  previewAdminRegistrationReview: jest.fn(),
  confirmAdminRegistrationReview: jest.fn(),
}));

describe('adminRegistrationReviewController', () => {
  const sendSuccessMock = sendSuccess as jest.MockedFunction<typeof sendSuccess>;
  const sendErrorMock = sendError as jest.MockedFunction<typeof sendError>;
  const previewAdminRegistrationReviewMock =
    previewAdminRegistrationReview as jest.MockedFunction<typeof previewAdminRegistrationReview>;
  const confirmAdminRegistrationReviewMock =
    confirmAdminRegistrationReview as jest.MockedFunction<typeof confirmAdminRegistrationReview>;

  const createResponse = (): Response => ({}) as Response;
  const createNext = (): NextFunction => jest.fn();
  const createRequest = (token = 'review-token'): Request<{ token: string }> =>
    ({
      params: { token },
    } as Request<{ token: string }>);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the preview payload on success', async () => {
    const req = createRequest();
    const res = createResponse();
    const next = createNext();
    const preview = {
      action: 'approve',
      canConfirm: true,
    };
    previewAdminRegistrationReviewMock.mockResolvedValue(
      preview as Awaited<ReturnType<typeof previewAdminRegistrationReview>>
    );

    await previewAdminRegistrationReviewHandler(req, res, next);

    expect(sendSuccessMock).toHaveBeenCalledWith(res, preview);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns the confirm payload on success', async () => {
    const req = createRequest();
    const res = createResponse();
    const next = createNext();
    const result = {
      status: 'completed',
      action: 'approve',
      message: 'Registration approved successfully.',
      review: {
        canConfirm: false,
      },
    };
    confirmAdminRegistrationReviewMock.mockResolvedValue(
      result as Awaited<ReturnType<typeof confirmAdminRegistrationReview>>
    );

    await confirmAdminRegistrationReviewHandler(req, res, next);

    expect(sendSuccessMock).toHaveBeenCalledWith(res, result);
    expect(next).not.toHaveBeenCalled();
  });

  it('maps usecase review errors into error envelopes', async () => {
    const req = createRequest();
    const res = createResponse();
    const next = createNext();
    previewAdminRegistrationReviewMock.mockRejectedValue(
      new AdminRegistrationReviewError('This review link has expired.', 'expired_review_token', 410)
    );

    await previewAdminRegistrationReviewHandler(req, res, next);

    expect(sendErrorMock).toHaveBeenCalledWith(
      res,
      'expired_review_token',
      'This review link has expired.',
      410
    );
    expect(next).not.toHaveBeenCalled();
  });
});
