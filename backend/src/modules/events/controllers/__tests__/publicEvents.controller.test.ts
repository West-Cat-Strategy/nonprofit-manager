import { createPublicEventsController } from '../publicEvents.controller';
import { sendError, sendSuccess } from '../../../shared/http/envelope';

jest.mock('../../../shared/http/envelope', () => ({
  sendError: jest.fn(),
  sendSuccess: jest.fn(),
}));

describe('publicEvents.controller', () => {
  const catalogUseCase = {
    listPublicByOwner: jest.fn(),
  };

  const registrationUseCase = {
    getPublicCheckInInfo: jest.fn(),
    submitPublicCheckIn: jest.fn(),
  };

  const siteResolver = {
    getPublicSiteById: jest.fn(),
    getPublicSiteByIdForPreview: jest.fn(),
    getSiteBySubdomain: jest.fn(),
    getSiteBySubdomainForPreview: jest.fn(),
    getSiteByDomain: jest.fn(),
    getSiteByDomainForPreview: jest.fn(),
    recordAnalyticsEvent: jest.fn(),
  };

  const controller = createPublicEventsController({
    catalogUseCase: catalogUseCase as never,
    registrationUseCase: registrationUseCase as never,
    siteResolver: siteResolver as never,
  });

  const res = {} as never;
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists public events by host-resolved site', async () => {
    siteResolver.getSiteBySubdomainForPreview.mockResolvedValueOnce({
      id: 'site-1',
      userId: 'owner-1',
      name: 'Public Site',
      subdomain: 'alpha',
      customDomain: null,
      status: 'published',
    });
    catalogUseCase.listPublicByOwner.mockResolvedValueOnce({
      items: [{ event_id: 'event-1', event_name: 'Community Dinner' }],
      page: { limit: 12, offset: 0, total: 1, has_more: false },
    });

    await controller.listPublicEvents(
      {
        subdomains: ['alpha'],
        hostname: 'alpha.localhost',
        validatedQuery: { limit: 12, offset: 0 },
      } as never,
      res,
      next
    );

    expect(catalogUseCase.listPublicByOwner).toHaveBeenCalledWith('owner-1', {
      include_past: undefined,
      limit: 12,
      offset: 0,
      search: undefined,
      event_type: undefined,
      sort_by: undefined,
      sort_order: undefined,
    });
    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ event_id: 'event-1' })]),
        site: expect.objectContaining({ id: 'site-1', subdomain: 'alpha' }),
      })
    );
  });

  it('lists public events by explicit site key', async () => {
    siteResolver.getSiteBySubdomainForPreview.mockResolvedValueOnce(null);
    siteResolver.getSiteByDomainForPreview.mockResolvedValueOnce({
      id: 'site-2',
      userId: 'owner-2',
      name: 'Domain Site',
      subdomain: null,
      customDomain: 'events.example.org',
      status: 'published',
    });
    catalogUseCase.listPublicByOwner.mockResolvedValueOnce({
      items: [],
      page: { limit: 10, offset: 0, total: 0, has_more: false },
    });

    await controller.listPublicEventsBySiteKey(
      {
        validatedParams: { siteKey: 'events.example.org' },
        validatedQuery: { limit: 10, offset: 0 },
      } as never,
      res,
      next
    );

    expect(siteResolver.getSiteBySubdomainForPreview).toHaveBeenCalledWith('events.example.org');
    expect(siteResolver.getSiteByDomainForPreview).toHaveBeenCalledWith('events.example.org');
    expect(catalogUseCase.listPublicByOwner).toHaveBeenCalledWith('owner-2', {
      include_past: undefined,
      limit: 10,
      offset: 0,
      search: undefined,
      event_type: undefined,
      sort_by: undefined,
      sort_order: undefined,
    });
    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        site: expect.objectContaining({ customDomain: 'events.example.org' }),
      })
    );
  });

  it('returns site-not-found when no published site can be resolved', async () => {
    siteResolver.getSiteBySubdomainForPreview.mockResolvedValueOnce(null);
    siteResolver.getSiteByDomainForPreview.mockResolvedValueOnce(null);

    await controller.listPublicEvents(
      {
        subdomains: ['missing-site'],
        hostname: 'missing-site.localhost',
        validatedQuery: {},
      } as never,
      res,
      next
    );

    expect(sendError).toHaveBeenCalledWith(
      res,
      'SITE_NOT_FOUND',
      'Published site not found',
      404
    );
  });

  it('returns event-not-found when public check-in info is unavailable', async () => {
    registrationUseCase.getPublicCheckInInfo.mockResolvedValueOnce(null);

    await controller.getCheckInInfo({ params: { id: 'event-1' } } as never, res, next);

    expect(sendError).toHaveBeenCalledWith(
      res,
      'EVENT_NOT_FOUND',
      'Event check-in is unavailable',
      404
    );
  });

  it('returns public check-in info when available', async () => {
    registrationUseCase.getPublicCheckInInfo.mockResolvedValueOnce({
      event_id: 'event-1',
      event_name: 'Public Event',
      public_checkin_enabled: true,
      public_checkin_pin_required: true,
      checkin_open: true,
    });

    await controller.getCheckInInfo({ params: { id: 'event-1' } } as never, res, next);

    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ event_id: 'event-1', checkin_open: true })
    );
  });

  it('returns 201 when submitCheckIn creates a new registration', async () => {
    registrationUseCase.submitPublicCheckIn.mockResolvedValueOnce({
      status: 'checked_in',
      contact_id: 'contact-1',
      registration: { registration_id: 'reg-1' },
      created_contact: true,
      created_registration: true,
    });

    await controller.submitCheckIn(
      {
        params: { id: 'event-1' },
        body: { first_name: 'Public', last_name: 'Attendee', pin: '123456' },
      } as never,
      res,
      next
    );

    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ status: 'checked_in' }),
      201
    );
  });

  it('returns 200 when submitCheckIn is idempotent for an existing registration', async () => {
    registrationUseCase.submitPublicCheckIn.mockResolvedValueOnce({
      status: 'already_checked_in',
      contact_id: 'contact-1',
      registration: { registration_id: 'reg-1' },
      created_contact: false,
      created_registration: false,
    });

    await controller.submitCheckIn(
      {
        params: { id: 'event-1' },
        body: { first_name: 'Public', last_name: 'Attendee', pin: '123456' },
      } as never,
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
    ['Event not found', 'EVENT_NOT_FOUND', 'Event check-in is unavailable', 404],
    ['Public check-in is not enabled for this event', 'EVENT_NOT_FOUND', 'Event check-in is unavailable', 404],
    ['Invalid event check-in PIN', 'INVALID_PIN', 'Invalid event check-in PIN', 403],
    ['Event check-in PIN is not configured', 'PIN_NOT_CONFIGURED', 'Event check-in PIN is not configured', 400],
    ['Event is at full capacity', 'EVENT_FULL', 'Event is at full capacity', 400],
    [
      'Check-in is available 180 minutes before start until 240 minutes after end.',
      'CHECKIN_CLOSED',
      'Check-in is available 180 minutes before start until 240 minutes after end.',
      400,
    ],
    ['Event is not accepting check-ins', 'CHECKIN_CLOSED', 'Event is not accepting check-ins', 400],
  ])(
    'maps check-in error "%s" to %s',
    async (
      message: string,
      expectedCode: string,
      expectedMessage: string,
      expectedStatus: number
    ) => {
      registrationUseCase.submitPublicCheckIn.mockRejectedValueOnce(new Error(message));

      await controller.submitCheckIn(
        {
          params: { id: 'event-1' },
          body: { first_name: 'Public', last_name: 'Attendee', pin: '123456' },
        } as never,
        res,
        next
      );

      expect(sendError).toHaveBeenCalledWith(
        res,
        expectedCode,
        expectedMessage,
        expectedStatus
      );
    }
  );

  it('forwards unknown submitCheckIn errors to next', async () => {
    const unknownError = new Error('unexpected');
    registrationUseCase.submitPublicCheckIn.mockRejectedValueOnce(unknownError);

    await controller.submitCheckIn(
      {
        params: { id: 'event-1' },
        body: { first_name: 'Public', last_name: 'Attendee', pin: '123456' },
      } as never,
      res,
      next
    );

    expect(next).toHaveBeenCalledWith(unknownError);
  });
});
