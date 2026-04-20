import { beforeEach, describe, expect, it, vi } from 'vitest';
import publicApi from '../../../services/publicApi';
import { publicCaseFormsApiClient } from './publicCaseFormsApiClient';

vi.mock('../../../services/publicApi', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('publicCaseFormsApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses token-scoped public form endpoints through the header-free public client', async () => {
    vi.mocked(publicApi.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          assignment: {
            id: 'assignment-1',
            case_id: 'case-1',
            contact_id: 'contact-1',
            title: 'Secure Intake Form',
            status: 'sent',
            schema: {
              version: 1,
              title: 'Secure Intake Form',
              sections: [],
            },
            created_at: '2026-04-16T12:00:00.000Z',
            updated_at: '2026-04-16T12:00:00.000Z',
          },
          submissions: [],
        },
      },
    } as never);

    vi.mocked(publicApi.post)
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
            title: 'Secure Intake Form',
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
              title: 'Secure Intake Form',
              status: 'submitted',
              schema: {
                version: 1,
                title: 'Secure Intake Form',
                sections: [],
              },
              created_at: '2026-04-16T12:00:00.000Z',
              updated_at: '2026-04-16T12:30:00.000Z',
            },
            submissions: [],
          },
        },
      } as never);

    await publicCaseFormsApiClient.getForm('token-1');
    await publicCaseFormsApiClient.uploadAsset('token-1', {
      question_key: 'consent',
      asset_kind: 'upload',
      file: new File(['hello'], 'consent.pdf', { type: 'application/pdf' }),
    });
    await publicCaseFormsApiClient.saveDraft('token-1', { answers: { consent: true } });
    await publicCaseFormsApiClient.submit('token-1', { answers: { consent: true } });

    expect(publicApi.get).toHaveBeenNthCalledWith(1, '/v2/public/case-forms/token-1');
    expect(publicApi.post).toHaveBeenNthCalledWith(
      1,
      '/v2/public/case-forms/token-1/assets',
      expect.any(FormData),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    expect(publicApi.post).toHaveBeenNthCalledWith(2, '/v2/public/case-forms/token-1/draft', {
      answers: { consent: true },
    });
    expect(publicApi.post).toHaveBeenNthCalledWith(3, '/v2/public/case-forms/token-1/submit', {
      answers: { consent: true },
    });
    expect(publicCaseFormsApiClient.getResponsePacketDownloadUrl('token-1')).toBe(
      '/api/v2/public/case-forms/token-1/response-packet'
    );
  });
});
