import { Pool, PoolClient } from 'pg';
import { EventCatalogService } from '../eventCatalogService';
import { EventOccurrenceService } from '../eventOccurrenceService';

jest.mock('@modules/webhooks/services/webhookService', () => ({
  triggerWebhooks: jest.fn().mockResolvedValue(undefined),
}));

const webhookServiceModule = jest.requireMock('@modules/webhooks/services/webhookService') as {
  triggerWebhooks: jest.Mock;
};

describe('EventCatalogService webhook producers', () => {
  const release = jest.fn();
  const clientQuery = jest.fn();
  const connect = jest.fn();
  const pool = { connect } as unknown as Pool;

  let syncOccurrencesSpy: jest.SpyInstance;
  let getEventByIdSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clientQuery.mockReset();
    connect.mockReset();
    release.mockReset();

    connect.mockResolvedValue({
      query: clientQuery,
      release,
    } as unknown as PoolClient);

    syncOccurrencesSpy = jest
      .spyOn(EventOccurrenceService.prototype, 'syncOccurrencesForEvent')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    syncOccurrencesSpy.mockRestore();
    getEventByIdSpy?.mockRestore();
  });

  it('queues event.created webhooks for the created event organization', async () => {
    const createdEvent = {
      event_id: 'event-1',
      event_name: 'Volunteer Orientation',
      organization_id: 'org-1',
    };
    const service = new EventCatalogService(pool);
    getEventByIdSpy = jest.spyOn(service, 'getEventById').mockResolvedValue(createdEvent as never);

    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ event_id: 'event-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.createEvent(
      {
        event_name: 'Volunteer Orientation',
        event_type: 'volunteer',
        start_date: '2026-05-20T17:00:00.000Z',
        end_date: '2026-05-20T18:00:00.000Z',
      },
      'user-1',
      'org-1'
    );

    expect(result).toBe(createdEvent);
    expect(syncOccurrencesSpy).toHaveBeenCalledWith('event-1', expect.any(Object));
    expect(getEventByIdSpy).toHaveBeenCalledWith('event-1', { accountIds: ['org-1'] });
    expect(webhookServiceModule.triggerWebhooks).toHaveBeenCalledWith({
      organizationId: 'org-1',
      eventType: 'event.created',
      data: createdEvent,
    });
    expect(release).toHaveBeenCalledTimes(1);
  });
});
