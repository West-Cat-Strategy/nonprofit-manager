import { beforeEach, describe, expect, it, vi } from 'vitest';
import portalApi from '../../../services/portalApi';
import { PortalCaseFormsApiClient } from './portalCaseFormsApiClient';

vi.mock('../../../services/portalApi', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('PortalCaseFormsApiClient', () => {
  const client = new PortalCaseFormsApiClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses assignment-scoped portal form endpoints', async () => {
    vi.mocked(portalApi.get)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: 'assignment-1',
              title: 'Portal Intake Form',
              status: 'sent',
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            assignment: {
              id: 'assignment-1',
              case_id: 'case-1',
              contact_id: 'contact-1',
              title: 'Portal Intake Form',
              status: 'sent',
              schema: {
                version: 1,
                title: 'Portal Intake Form',
                sections: [],
              },
              created_at: '2026-04-16T12:00:00.000Z',
              updated_at: '2026-04-16T12:00:00.000Z',
            },
            submissions: [],
          },
        },
      } as never);
    vi.mocked(portalApi.post)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'asset-1',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'assignment-1',
            title: 'Portal Intake Form',
            status: 'draft',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            assignment: {
              id: 'assignment-1',
              case_id: 'case-1',
              contact_id: 'contact-1',
              title: 'Portal Intake Form',
              status: 'submitted',
              schema: {
                version: 1,
                title: 'Portal Intake Form',
                sections: [],
              },
              created_at: '2026-04-16T12:00:00.000Z',
              updated_at: '2026-04-16T12:30:00.000Z',
            },
            submissions: [],
          },
        },
      } as never);

    await client.listForms();
    await client.getForm('assignment-1');
    await client.uploadAsset('assignment-1', {
      question_key: 'consent',
      asset_kind: 'upload',
      file: new File(['hello'], 'consent.pdf', { type: 'application/pdf' }),
    });
    await client.saveDraft('assignment-1', { answers: { consent: true } });
    await client.submit('assignment-1', { answers: { consent: true } });

    expect(portalApi.get).toHaveBeenNthCalledWith(1, '/v2/portal/forms/assignments');
    expect(portalApi.get).toHaveBeenNthCalledWith(2, '/v2/portal/forms/assignments/assignment-1');
    expect(portalApi.post).toHaveBeenNthCalledWith(
      1,
      '/v2/portal/forms/assignments/assignment-1/assets',
      expect.any(FormData),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    expect(portalApi.post).toHaveBeenNthCalledWith(
      2,
      '/v2/portal/forms/assignments/assignment-1/draft',
      { answers: { consent: true } }
    );
    expect(portalApi.post).toHaveBeenNthCalledWith(
      3,
      '/v2/portal/forms/assignments/assignment-1/submit',
      { answers: { consent: true } }
    );
    expect(client.getResponsePacketDownloadUrl('assignment-1')).toBe(
      '/api/v2/portal/forms/assignments/assignment-1/response-packet'
    );
  });

  it('throws a clear contract error when the portal forms payload is not an assignment array', async () => {
    vi.mocked(portalApi.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [],
          pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
        },
      },
    } as never);

    await expect(client.listForms()).rejects.toThrow(
      'Portal forms contract error: expected an array of case-form assignments from /v2/portal/forms/assignments.'
    );
  });
});
