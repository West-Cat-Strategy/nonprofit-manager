import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppDispatch } from '../../../../store';
import type {
  PageSection,
  Template,
  TemplatePage,
} from '../../../../types/websiteBuilder';
import type { BuilderSiteContext } from '../../lib/siteAwareEditor';

const mocked = vi.hoisted(() => ({
  createTemplateVersion: vi.fn(),
  fetchWebsiteDeployment: vi.fn(),
  fetchWebsiteOverview: vi.fn(),
  fetchWebsiteVersions: vi.fn(),
  publishWebsiteSite: vi.fn(),
  updateTemplatePage: vi.fn(),
  useAutoSave: vi.fn(),
}));

vi.mock('../../../../hooks/useAutoSave', () => ({
  useAutoSave: mocked.useAutoSave,
}));

vi.mock('../../state', () => ({
  createTemplateVersion: mocked.createTemplateVersion,
  updateTemplatePage: mocked.updateTemplatePage,
}));

vi.mock('../../../websites/state', () => ({
  fetchWebsiteDeployment: mocked.fetchWebsiteDeployment,
  fetchWebsiteOverview: mocked.fetchWebsiteOverview,
  fetchWebsiteVersions: mocked.fetchWebsiteVersions,
  publishWebsiteSite: mocked.publishWebsiteSite,
}));

import { usePagePersistenceActions } from '../usePagePersistenceActions';

const createSection = (
  id: string,
  components: Array<Record<string, unknown>>
): PageSection =>
  ({
    id,
    name: `Section ${id}`,
    components,
  }) as PageSection;

const createPage = (overrides: Partial<TemplatePage> = {}): TemplatePage =>
  ({
    id: 'page-home',
    name: 'Home',
    slug: 'home',
    isHomepage: true,
    pageType: 'static',
    routePattern: '/',
    seo: {
      title: 'Home',
      description: 'Home page',
    },
    sections: [],
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    ...overrides,
  }) as TemplatePage;

const createTemplate = (overrides: Partial<Template> = {}): Template =>
  ({
    id: 'template-1',
    name: 'Advocacy',
    description: 'Campaign landing page',
    category: 'landing-page',
    tags: ['campaign'],
    status: 'draft',
    isSystemTemplate: false,
    theme: {
      colors: {
        primary: '#123456',
        secondary: '#654321',
        accent: '#ff9900',
        background: '#ffffff',
        surface: '#f7f7f7',
        text: '#111111',
        textSecondary: '#444444',
        border: '#dddddd',
        success: '#0f9d58',
        warning: '#f4b400',
        error: '#db4437',
      },
      typography: {
        fontFamily: 'Atkinson Hyperlegible',
        headingFontFamily: 'Atkinson Hyperlegible',
        baseFontSize: '16px',
        scale: 1.2,
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        xxl: '3rem',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.08)',
        md: '0 4px 12px rgba(0, 0, 0, 0.12)',
        lg: '0 12px 24px rgba(0, 0, 0, 0.16)',
      },
    },
    globalSettings: {
      language: 'en',
      header: {
        navigation: [],
      },
      footer: {
        columns: [],
      },
    },
    pages: [createPage()],
    metadata: {
      version: '1.0.0',
      thumbnailImage: 'thumb.png',
    },
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    ...overrides,
  }) as Template;

const createSiteContext = (
  overrides: Partial<BuilderSiteContext> = {}
): BuilderSiteContext => ({
  siteId: 'site-9',
  siteName: 'Neighborhood Mutual Aid',
  siteStatus: 'published',
  blocked: false,
  primaryUrl: 'https://example.org',
  previewUrl: 'https://preview.example.org',
  templateId: 'template-1',
  managedForms: {
    total: 1,
    live: 0,
  },
  followUp: {
    workspace: 'publishing',
    href: '/websites/site-9/publishing',
    label: 'Review publishing',
  },
  ...overrides,
});

const createDispatchableAction = <TPayload, TResult>(
  type: string,
  payload: TPayload,
  result: TResult | Promise<TResult> = undefined as TResult
) => ({
  type,
  payload,
  unwrap: vi.fn().mockImplementation(() => result),
});

describe('usePagePersistenceActions', () => {
  const historySections = [
    createSection('section-home', [
      {
        id: 'component-a',
        type: 'text',
        content: 'Ready to publish',
        align: 'left',
      },
    ]),
  ];

  let dispatch: ReturnType<typeof vi.fn>;
  let saveNowSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    dispatch = vi.fn((action: unknown) => action);
    saveNowSpy = vi.fn();

    mocked.useAutoSave.mockImplementation(
      ({
        data,
        onSave,
      }: {
        data: PageSection[];
        onSave: (sections: PageSection[]) => Promise<void>;
      }) => {
        saveNowSpy.mockImplementation(() => onSave(data));

        return {
          isSaving: false,
          lastSaved: new Date('2026-04-22T00:00:00.000Z'),
          hasUnsavedChanges: true,
          saveNow: saveNowSpy,
          markAsSaved: vi.fn(),
        };
      }
    );

    mocked.updateTemplatePage.mockImplementation((payload: unknown) =>
      createDispatchableAction('templates/updateTemplatePage', payload)
    );
    mocked.createTemplateVersion.mockImplementation((payload: unknown) =>
      createDispatchableAction('templates/createTemplateVersion', payload)
    );
    mocked.publishWebsiteSite.mockImplementation((payload: unknown) =>
      createDispatchableAction('websites/publishWebsiteSite', payload, {
        url: 'https://example.org',
      })
    );
    mocked.fetchWebsiteDeployment.mockImplementation((siteId: string) => ({
      type: 'websites/fetchDeployment',
      payload: siteId,
    }));
    mocked.fetchWebsiteOverview.mockImplementation((payload: unknown) => ({
      type: 'websites/fetchOverview',
      payload,
    }));
    mocked.fetchWebsiteVersions.mockImplementation((payload: unknown) => ({
      type: 'websites/fetchVersions',
      payload,
    }));
  });

  it('normalizes page updates through the extracted persistence helper', async () => {
    const { result } = renderHook(() =>
      usePagePersistenceActions({
        autoSaveEnabled: true,
        currentPage: createPage(),
        currentTemplate: createTemplate(),
        dispatch: dispatch as unknown as AppDispatch,
        historySections,
        resolvedTemplateId: 'template-1',
        siteContext: null,
      })
    );

    await act(async () => {
      await result.current.handleUpdatePage({
        name: '  Mission landing  ',
        slug: '  Mission & Impact  ',
      });
    });

    expect(mocked.updateTemplatePage).toHaveBeenCalledWith({
      templateId: 'template-1',
      pageId: 'page-home',
      data: {
        name: 'Mission landing',
        slug: 'mission-impact',
        pageType: 'static',
        collection: undefined,
        routePattern: '/',
      },
    });
  });

  it('saves the latest sections before creating a manual version', async () => {
    const { result } = renderHook(() =>
      usePagePersistenceActions({
        autoSaveEnabled: true,
        currentPage: createPage(),
        currentTemplate: createTemplate(),
        dispatch: dispatch as unknown as AppDispatch,
        historySections,
        resolvedTemplateId: 'template-1',
        siteContext: null,
      })
    );

    await act(async () => {
      await result.current.handleSaveVersion();
    });

    expect(saveNowSpy).toHaveBeenCalledTimes(1);
    expect(mocked.updateTemplatePage).toHaveBeenCalledWith({
      templateId: 'template-1',
      pageId: 'page-home',
      data: {
        sections: historySections,
      },
    });
    expect(mocked.createTemplateVersion).toHaveBeenCalledWith({
      templateId: 'template-1',
      changes: 'Manual save',
    });
    expect(mocked.updateTemplatePage.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.createTemplateVersion.mock.invocationCallOrder[0]
    );
  });

  it('publishes through the site context and refreshes website metadata', async () => {
    const { result } = renderHook(() =>
      usePagePersistenceActions({
        autoSaveEnabled: true,
        currentPage: createPage(),
        currentTemplate: createTemplate(),
        dispatch: dispatch as unknown as AppDispatch,
        historySections,
        resolvedTemplateId: 'template-1',
        siteContext: createSiteContext(),
      })
    );

    await act(async () => {
      await result.current.handlePublishPage({
        name: '  Homepage  ',
      });
    });

    expect(saveNowSpy).toHaveBeenCalledTimes(1);
    expect(mocked.updateTemplatePage).toHaveBeenNthCalledWith(1, {
      templateId: 'template-1',
      pageId: 'page-home',
      data: {
        sections: historySections,
      },
    });
    expect(mocked.updateTemplatePage).toHaveBeenNthCalledWith(2, {
      templateId: 'template-1',
      pageId: 'page-home',
      data: {
        name: 'Homepage',
        pageType: 'static',
        collection: undefined,
      },
    });
    expect(mocked.publishWebsiteSite).toHaveBeenCalledWith({
      siteId: 'site-9',
      templateId: 'template-1',
      target: 'live',
    });
    expect(mocked.fetchWebsiteDeployment).toHaveBeenCalledWith('site-9');
    expect(mocked.fetchWebsiteOverview).toHaveBeenCalledWith({
      siteId: 'site-9',
      period: 30,
    });
    expect(mocked.fetchWebsiteVersions).toHaveBeenCalledWith({
      siteId: 'site-9',
      limit: 10,
    });
    await waitFor(() =>
      expect(result.current.publishNotice).toEqual({
        tone: 'success',
        message: 'Published live at https://example.org.',
      })
    );
    expect(result.current.isPublishing).toBe(false);
  });

  it('keeps the publish error visible and skips refreshes when publishing fails', async () => {
    mocked.publishWebsiteSite.mockImplementationOnce((payload: unknown) =>
      createDispatchableAction(
        'websites/publishWebsiteSite',
        payload,
        Promise.reject(new Error('Publish failed'))
      )
    );

    const { result } = renderHook(() =>
      usePagePersistenceActions({
        autoSaveEnabled: true,
        currentPage: createPage(),
        currentTemplate: createTemplate(),
        dispatch: dispatch as unknown as AppDispatch,
        historySections,
        resolvedTemplateId: 'template-1',
        siteContext: createSiteContext(),
      })
    );

    await act(async () => {
      await result.current.handlePublishPage({
        name: '  Homepage  ',
      });
    });

    await waitFor(() =>
      expect(result.current.publishNotice).toEqual({
        tone: 'error',
        message: 'Publish failed',
      })
    );
    expect(mocked.fetchWebsiteDeployment).not.toHaveBeenCalled();
    expect(mocked.fetchWebsiteOverview).not.toHaveBeenCalled();
    expect(mocked.fetchWebsiteVersions).not.toHaveBeenCalled();
    expect(result.current.isPublishing).toBe(false);
  });
});
