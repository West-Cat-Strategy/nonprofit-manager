import type { AuthRequest } from '@middleware/auth';
import { createEventsController } from '../events.controller';
import { requirePermissionSafe, sendForbidden, sendUnauthorized } from '@services/authGuardService';
import { sendError, sendSuccess } from '../../../shared/http/envelope';

jest.mock('@services/authGuardService', () => ({
  requirePermissionSafe: jest.fn(),
  sendForbidden: jest.fn(),
  sendUnauthorized: jest.fn(),
}));

jest.mock('../../../shared/http/envelope', () => ({
  sendError: jest.fn(),
  sendSuccess: jest.fn(),
}));

type MockReq = Partial<AuthRequest> & {
  validatedParams?: Record<string, string>;
  validatedQuery?: Record<string, unknown>;
};

const createEventHttpError = (code: string, statusCode: number, message: string): Error =>
  Object.assign(new Error(message), { code, statusCode });

const baseReq = (): MockReq => ({
  user: { id: 'user-1', role: 'admin' } as AuthRequest['user'],
  organizationId: 'acct-1',
  dataScope: { filter: { accountIds: ['acct-1'] } } as AuthRequest['dataScope'],
  validatedParams: { id: 'event-1' },
  validatedQuery: {},
  body: {},
});

describe('events.controller', () => {
  const catalogUseCase = {
    create: jest.fn(),
    getById: jest.fn(),
  };
  const registrationUseCase = {
    register: jest.fn(),
    update: jest.fn(),
    getCheckInSettings: jest.fn(),
    updateCheckInSettings: jest.fn(),
    rotateCheckInPin: jest.fn(),
    listByContact: jest.fn(),
    getById: jest.fn(),
    checkIn: jest.fn(),
    getByToken: jest.fn(),
    getByTokenGlobal: jest.fn(),
    walkInCheckIn: jest.fn(),
    sendConfirmationEmail: jest.fn(),
  };
  const remindersUseCase = {
    send: jest.fn(),
  };

  const controller = createEventsController(
    catalogUseCase as never,
    registrationUseCase as never,
    remindersUseCase as never
  );

  const next = jest.fn();
  const res = {} as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (requirePermissionSafe as jest.Mock).mockReturnValue({ ok: true });
  });

  it('sends unauthorized when permission guard fails with unauthorized', async () => {
    (requirePermissionSafe as jest.Mock).mockReturnValueOnce({
      ok: false,
      error: { code: 'unauthorized', message: 'Auth required' },
    });

    await controller.getCheckInSettings(baseReq() as AuthRequest, res, next);

    expect(sendUnauthorized).toHaveBeenCalledWith(res, 'Auth required');
    expect(sendForbidden).not.toHaveBeenCalled();
  });

  it('sends forbidden when permission guard fails with non-unauthorized error', async () => {
    (requirePermissionSafe as jest.Mock).mockReturnValueOnce({
      ok: false,
      error: { code: 'forbidden', message: 'Denied' },
    });

    await controller.getCheckInSettings(baseReq() as AuthRequest, res, next);

    expect(sendForbidden).toHaveBeenCalledWith(res, 'Denied');
    expect(sendUnauthorized).not.toHaveBeenCalled();
  });

  it('returns forbidden when event is outside data scope', async () => {
    catalogUseCase.getById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ event_id: 'event-1' });

    await controller.getCheckInSettings(baseReq() as AuthRequest, res, next);

    expect(sendError).toHaveBeenCalledWith(
      res,
      'FORBIDDEN',
      'Event is outside your data scope',
      403
    );
    expect(registrationUseCase.getCheckInSettings).not.toHaveBeenCalled();
  });

  it('returns event not found when event does not exist', async () => {
    catalogUseCase.getById.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await controller.getCheckInSettings(baseReq() as AuthRequest, res, next);

    expect(sendError).toHaveBeenCalledWith(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
  });

  it('returns check-in settings when event exists', async () => {
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.getCheckInSettings.mockResolvedValueOnce({
      event_id: 'event-1',
      public_checkin_enabled: true,
      public_checkin_pin_configured: true,
      public_checkin_pin_rotated_at: new Date().toISOString(),
    });

    await controller.getCheckInSettings(baseReq() as AuthRequest, res, next);

    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ event_id: 'event-1', public_checkin_enabled: true })
    );
  });

  it('returns event not found when check-in settings update returns null', async () => {
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.updateCheckInSettings.mockResolvedValueOnce(null);

    await controller.updateCheckInSettings(
      { ...baseReq(), body: { public_checkin_enabled: true } } as AuthRequest,
      res,
      next
    );

    expect(sendError).toHaveBeenCalledWith(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
  });

  it('passes data scope filter for contact registration listing queries', async () => {
    const req = {
      ...baseReq(),
      validatedParams: {},
      validatedQuery: { contact_id: 'contact-1' },
    } as AuthRequest;
    registrationUseCase.listByContact.mockResolvedValueOnce([
      { registration_id: 'reg-1', event_id: 'event-1' },
    ]);

    await controller.listRegistrations(req, res, next);

    expect(registrationUseCase.listByContact).toHaveBeenCalledWith('contact-1', {
      accountIds: ['acct-1'],
    });
    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.arrayContaining([expect.objectContaining({ registration_id: 'reg-1' })])
    );
  });

  it('passes the resolved organization context when creating an event', async () => {
    const req = {
      ...baseReq(),
      body: {
        event_name: 'Scoped Event',
        event_type: 'meeting',
      },
    } as AuthRequest;
    catalogUseCase.create.mockResolvedValueOnce({ event_id: 'event-1', organization_id: 'acct-1' });

    await controller.createEvent(req, res, next);

    expect(catalogUseCase.create).toHaveBeenCalledWith(req.body, 'user-1', 'acct-1');
    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ event_id: 'event-1', organization_id: 'acct-1' }),
      201
    );
  });

  it('maps duplicate registration errors using structured error codes', async () => {
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.register.mockRejectedValueOnce(
      createEventHttpError(
        'ALREADY_REGISTERED',
        409,
        'Contact is already registered for this occurrence'
      )
    );

    await controller.register(baseReq() as AuthRequest, res, next);

    expect(sendError).toHaveBeenCalledWith(
      res,
      'ALREADY_REGISTERED',
      'Contact is already registered for this occurrence',
      409
    );
  });

  it('maps registration update validation errors using structured error codes', async () => {
    registrationUseCase.getById.mockResolvedValueOnce({
      registration_id: 'reg-1',
      event_id: 'event-1',
    });
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.update.mockRejectedValueOnce(
      createEventHttpError('VALIDATION_ERROR', 400, 'No fields to update')
    );

    await controller.updateRegistration(
      {
        ...baseReq(),
        validatedParams: { id: 'reg-1' },
        validatedQuery: { scope: 'series' },
      } as AuthRequest,
      res,
      next
    );

    expect(registrationUseCase.update).toHaveBeenCalledWith(
      'reg-1',
      {},
      'series',
      expect.objectContaining({
        actorUserId: 'user-1',
        source: 'staff',
      })
    );
    expect(sendError).toHaveBeenCalledWith(res, 'VALIDATION_ERROR', 'No fields to update', 400);
  });

  it('maps rotate pin event-not-found error to 404', async () => {
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.rotateCheckInPin.mockRejectedValueOnce(
      createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found')
    );

    await controller.rotateCheckInPin(baseReq() as AuthRequest, res, next);

    expect(sendError).toHaveBeenCalledWith(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
  });

  it('returns registration-not-found when check-in registration lookup misses', async () => {
    registrationUseCase.getById.mockResolvedValueOnce(null);

    await controller.checkIn(baseReq() as AuthRequest, res, next);

    expect(sendError).toHaveBeenCalledWith(
      res,
      'REGISTRATION_NOT_FOUND',
      'Registration not found',
      404
    );
  });

  it('returns check-in error when manual check-in fails', async () => {
    registrationUseCase.getById.mockResolvedValueOnce({
      registration_id: 'reg-1',
      event_id: 'event-1',
    });
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.checkIn.mockResolvedValueOnce({
      success: false,
      message: 'Check-in is available 180 minutes before start until 240 minutes after end.',
    });

    await controller.checkIn(baseReq() as AuthRequest, res, next);

    expect(sendError).toHaveBeenCalledWith(
      res,
      'CHECKIN_ERROR',
      expect.stringMatching(/Check-in is available/i),
      400
    );
  });

  it('returns checked-in registration when manual check-in succeeds', async () => {
    registrationUseCase.getById.mockResolvedValueOnce({
      registration_id: 'reg-1',
      event_id: 'event-1',
    });
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.checkIn.mockResolvedValueOnce({
      success: true,
      registration: { registration_id: 'reg-1', checked_in: true },
    });

    await controller.checkIn(baseReq() as AuthRequest, res, next);

    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ registration_id: 'reg-1', checked_in: true })
    );
  });

  it('returns registration not found for scan endpoint when token is unknown', async () => {
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.getByToken.mockResolvedValueOnce(null);

    await controller.scanCheckIn(
      { ...baseReq(), body: { token: 'missing' } } as AuthRequest,
      res,
      next
    );

    expect(sendError).toHaveBeenCalledWith(
      res,
      'REGISTRATION_NOT_FOUND',
      'Registration not found',
      404
    );
  });

  it('returns scan result when global scan succeeds', async () => {
    registrationUseCase.getByTokenGlobal.mockResolvedValueOnce({
      registration_id: 'reg-1',
      event_id: 'event-1',
    });
    registrationUseCase.checkIn.mockResolvedValueOnce({
      success: true,
      registration: { registration_id: 'reg-1', check_in_method: 'qr', checked_in: true },
    });

    await controller.scanCheckInGlobal(
      { ...baseReq(), body: { token: 'abc123' } } as AuthRequest,
      res,
      next
    );

    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ registration_id: 'reg-1', checked_in: true })
    );
  });

  it('returns 201 when walk-in check-in creates a registration', async () => {
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.walkInCheckIn.mockResolvedValueOnce({
      status: 'created_and_checked_in',
      contact_id: 'contact-1',
      registration: { registration_id: 'reg-1', checked_in: true },
      created_contact: true,
      created_registration: true,
    });

    await controller.walkInCheckIn(
      {
        ...baseReq(),
        body: { first_name: 'Walk', last_name: 'In', email: 'walkin@example.com' },
      } as AuthRequest,
      res,
      next
    );

    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ status: 'created_and_checked_in' }),
      201
    );
  });

  it('returns 200 when walk-in check-in uses an existing registration', async () => {
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.walkInCheckIn.mockResolvedValueOnce({
      status: 'already_checked_in',
      contact_id: 'contact-1',
      registration: { registration_id: 'reg-1', checked_in: true },
      created_contact: false,
      created_registration: false,
    });

    await controller.walkInCheckIn(
      {
        ...baseReq(),
        body: { first_name: 'Walk', last_name: 'In', email: 'walkin@example.com' },
      } as AuthRequest,
      res,
      next
    );

    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ status: 'already_checked_in' }),
      200
    );
  });

  it.each([
    ['EVENT_NOT_FOUND', 404, 'Event not found'],
    ['CHECKIN_ERROR', 400, 'Event is at full capacity'],
    ['CHECKIN_ERROR', 400, 'Event is not accepting check-ins'],
    [
      'CHECKIN_ERROR',
      400,
      'Check-in is available 180 minutes before start until 240 minutes after end.',
    ],
  ])(
    'maps walk-in error "%s" to %s',
    async (expectedCode: string, expectedStatus: number, message: string) => {
      catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
      registrationUseCase.walkInCheckIn.mockRejectedValueOnce(
        createEventHttpError(expectedCode, expectedStatus, message)
      );

      await controller.walkInCheckIn(
        {
          ...baseReq(),
          body: { first_name: 'Walk', last_name: 'In', email: 'walkin@example.com' },
        } as AuthRequest,
        res,
        next
      );

      expect(sendError).toHaveBeenCalledWith(res, expectedCode, message, expectedStatus);
    }
  );

  it('passes unexpected walk-in errors to next', async () => {
    const boom = new Error('unexpected');
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.walkInCheckIn.mockRejectedValueOnce(boom);

    await controller.walkInCheckIn(
      {
        ...baseReq(),
        body: { first_name: 'Walk', last_name: 'In', email: 'walkin@example.com' },
      } as AuthRequest,
      res,
      next
    );

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('maps confirmation send errors using structured error codes', async () => {
    registrationUseCase.getById.mockResolvedValueOnce({
      registration_id: 'reg-1',
      event_id: 'event-1',
    });
    catalogUseCase.getById.mockResolvedValueOnce({ event_id: 'event-1' });
    registrationUseCase.sendConfirmationEmail.mockRejectedValueOnce(
      createEventHttpError('REGISTRATION_NOT_FOUND', 404, 'Registration not found')
    );

    await controller.sendConfirmationEmail(baseReq() as AuthRequest, res, next);

    expect(sendError).toHaveBeenCalledWith(
      res,
      'REGISTRATION_NOT_FOUND',
      'Registration not found',
      404
    );
  });
});
