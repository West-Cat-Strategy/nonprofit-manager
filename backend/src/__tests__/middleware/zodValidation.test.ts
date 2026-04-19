import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendError } from '@modules/shared/http/envelope';
import { validateInputs } from '@middleware/zodValidation';

jest.mock('@modules/shared/http/envelope', () => ({
  __esModule: true,
  sendError: jest.fn(),
}));

const mockSendError = sendError as jest.MockedFunction<typeof sendError>;

type MutableRequest = Request & {
  validatedQuery?: unknown;
  validatedParams?: unknown;
};

const createRequest = (overrides: Partial<MutableRequest> = {}): MutableRequest =>
  ({
    body: {},
    query: {},
    params: {},
    correlationId: 'corr-1',
    ...overrides,
  } as MutableRequest);

const createResponse = (): Response => ({}) as Response;
const createNext = (): NextFunction => jest.fn();

describe('zodValidation middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes body values and attaches validated query and params before continuing', () => {
    const req = createRequest({
      body: { name: '  Example Name  ' },
      query: { limit: '5' },
      params: { id: '42' },
    });
    const res = createResponse();
    const next = createNext();

    validateInputs(
      z.object({
        name: z.string().trim().min(1),
      }),
      z.object({
        limit: z.coerce.number().int().min(1),
      }),
      z.object({
        id: z.coerce.number().int().positive(),
      })
    )(req, res, next);

    expect(req.body).toEqual({ name: 'Example Name' });
    expect(req.validatedQuery).toEqual({ limit: 5 });
    expect(req.validatedParams).toEqual({ id: 42 });
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockSendError).not.toHaveBeenCalled();
  });

  it('returns a canonical validation envelope with grouped issues from each request source', () => {
    const req = createRequest({
      body: { name: 'A', extra: true },
      query: { limit: '0' },
      params: { id: 'not-a-number' },
    });
    const res = createResponse();
    const next = createNext();

    validateInputs(
      z
        .object({
          name: z.string().trim().min(2),
        })
        .strict(),
      z.object({
        limit: z.coerce.number().int().min(1),
      }),
      z.object({
        id: z.coerce.number().int().positive(),
      })
    )(req, res, next);

    expect(mockSendError).toHaveBeenCalledWith(
      res,
      'validation_error',
      'Validation failed',
      400,
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            source: 'body',
            path: 'name',
          }),
          expect.objectContaining({
            source: 'query',
            path: 'limit',
          }),
          expect.objectContaining({
            source: 'params',
            path: 'id',
          }),
        ]),
        validation: expect.objectContaining({
          body: expect.objectContaining({
            name: expect.any(Array),
            _: expect.any(Array),
          }),
          query: expect.objectContaining({
            limit: expect.any(Array),
          }),
          params: expect.objectContaining({
            id: expect.any(Array),
          }),
        }),
      }),
      'corr-1'
    );
    expect(next).not.toHaveBeenCalled();
  });
});
