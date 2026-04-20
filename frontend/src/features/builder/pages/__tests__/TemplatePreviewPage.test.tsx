import type * as ReactRedux from 'react-redux';
import type * as ReactRouterDom from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TemplatePreviewPage from '../TemplatePreviewPage';
import { renderWithProviders } from '../../../../test/testUtils';

const {
  fetchMock,
  mockNavigate,
  mockSearchParams,
  mockState,
  mockTemplateParams,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  mockNavigate: vi.fn(),
  mockSearchParams: vi.fn(),
  mockState: {
    auth: {
      isAuthenticated: true,
    },
  },
  mockTemplateParams: vi.fn(() => ({ templateId: 'template-123' })),
}));

vi.mock('react-redux', async () => {
  const actual = await vi.importActual<typeof ReactRedux>('react-redux');
  return {
    ...actual,
    useSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockTemplateParams(),
    useSearchParams: () => mockSearchParams(),
  };
});

const buildPreviewHtml = (): string => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Template Preview</title>
    </head>
    <body>
      <main>Preview body</main>
      <!-- Site Analytics -->
      <script>
        (function() {
          var visitorId = localStorage.getItem('npm_visitor_id');
          var sessionId = sessionStorage.getItem('npm_session_id');
          window.__previewAnalytics = { visitorId: visitorId, sessionId: sessionId };
        })();
      </script>
      <script>
        window.__previewNavigationReady = true;
      </script>
    </body>
  </html>
`;

describe('TemplatePreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);

    mockState.auth.isAuthenticated = true;
    mockTemplateParams.mockReturnValue({ templateId: 'template-123' });
    mockSearchParams.mockReturnValue([new URLSearchParams('page=impact'), vi.fn()]);

    window.localStorage.clear();
    window.localStorage.setItem('organizationId', 'org-123');

    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(buildPreviewHtml()),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the preview from the v2 template preview endpoint with the organization header intact', async () => {
    renderWithProviders(<TemplatePreviewPage />, {
      route: '/builder/templates/template-123/preview?page=impact',
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v2\/templates\/template-123\/preview\?page=impact$/),
        expect.objectContaining({
          credentials: 'include',
          headers: {
            'X-Organization-Id': 'org-123',
          },
        })
      );
    });
  });

  it('strips the storage-dependent analytics block before writing the sandboxed iframe document', async () => {
    renderWithProviders(<TemplatePreviewPage />, {
      route: '/builder/templates/template-123/preview?page=impact',
    });

    const iframe = await screen.findByTitle('Template Preview');

    await waitFor(() => {
      expect(iframe.getAttribute('srcdoc')).toContain('Preview body');
    });

    const srcDoc = iframe.getAttribute('srcdoc') || '';

    expect(srcDoc).not.toContain('Site Analytics');
    expect(srcDoc).not.toContain('npm_visitor_id');
    expect(srcDoc).not.toContain('npm_session_id');
    expect(srcDoc).toContain('window.__previewNavigationReady = true;');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
  });
});
