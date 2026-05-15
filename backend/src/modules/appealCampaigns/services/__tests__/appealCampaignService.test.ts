import type { Pool } from 'pg';
import { AppealCampaignService } from '../appealCampaignService';

describe('AppealCampaignService', () => {
  const query = jest.fn();
  const pool = { query } as unknown as Pool;
  const service = new AppealCampaignService(pool);

  beforeEach(() => {
    query.mockReset();
  });

  it('creates a typed appeal campaign with provider compatibility links', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'appeal-1',
            organization_id: 'org-1',
            code: 'spring-appeal',
            name: 'Spring Appeal',
            description: null,
            kind: 'appeal',
            status: 'active',
            start_date: '2026-05-01',
            end_date: null,
            compatibility_labels: ['Spring 2026'],
            metadata: {},
            created_by: 'user-1',
            modified_by: 'user-1',
            created_at: '2026-05-14T00:00:00.000Z',
            updated_at: '2026-05-14T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'appeal-1',
            organization_id: 'org-1',
            code: 'spring-appeal',
            name: 'Spring Appeal',
            description: null,
            kind: 'appeal',
            status: 'active',
            start_date: '2026-05-01',
            end_date: null,
            compatibility_labels: ['Spring 2026'],
            metadata: {},
            created_by: 'user-1',
            modified_by: 'user-1',
            created_at: '2026-05-14T00:00:00.000Z',
            updated_at: '2026-05-14T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'link-1',
            appeal_campaign_id: 'appeal-1',
            organization_id: 'org-1',
            provider: 'mailchimp',
            provider_campaign_id: 'mc-1',
            provider_audience_id: 'aud-1',
            label: 'Spring Appeal',
            metadata: { importedFrom: 'test' },
            created_by: 'user-1',
            created_at: '2026-05-14T00:00:00.000Z',
            updated_at: '2026-05-14T00:00:00.000Z',
          },
        ],
      });

    const result = await service.createCampaign('org-1', 'user-1', {
      name: 'Spring Appeal',
      compatibilityLabels: ['Spring 2026', 'Spring 2026'],
      providerLinks: [
        {
          provider: 'mailchimp',
          providerCampaignId: 'mc-1',
          providerAudienceId: 'aud-1',
          label: 'Spring Appeal',
          metadata: { importedFrom: 'test' },
        },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'appeal-1',
        code: 'spring-appeal',
        compatibilityLabels: ['Spring 2026'],
        providerLinks: [
          expect.objectContaining({
            appealCampaignId: 'appeal-1',
            provider: 'mailchimp',
            providerCampaignId: 'mc-1',
          }),
        ],
      })
    );
    expect(query.mock.calls[0]?.[0]).toContain('INSERT INTO appeal_campaigns');
    expect(query.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['org-1', 'spring-appeal', 'Spring Appeal'])
    );
    expect(query.mock.calls[1]?.[0]).toContain('FROM appeal_campaigns');
    expect(query.mock.calls[2]?.[0]).toContain('INSERT INTO appeal_campaign_provider_links');
  });

  it('resolves provider ids back to the typed campaign record', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'appeal-1',
          organization_id: 'org-1',
          code: 'spring-appeal',
          name: 'Spring Appeal',
          description: null,
          kind: 'appeal',
          status: 'active',
          start_date: null,
          end_date: null,
          compatibility_labels: [],
          metadata: {},
          created_by: null,
          modified_by: null,
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
      ],
    });

    const result = await service.resolveProviderCampaign('org-1', 'mautic', 'email-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'appeal-1',
        organizationId: 'org-1',
        code: 'spring-appeal',
      })
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining('appeal_campaign_provider_links'), [
      'org-1',
      'mautic',
      'email-1',
    ]);
  });
});
