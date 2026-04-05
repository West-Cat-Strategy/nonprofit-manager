import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import type * as ReactReduxModule from 'react-redux';
import type * as ReactRouterDomModule from 'react-router-dom';
import TemplateGallery from '../../../features/builder/pages/TemplateGalleryPage';

const navigateMock = vi.fn();
const dispatchMock = vi.fn();
type MockTemplate = {
  id: string;
  name: string;
  description?: string;
  category: string;
  status?: string;
  isSystemTemplate?: boolean;
  pageCount: number;
  tags: string[];
};

let templateState = {
  templates: [] as MockTemplate[],
  systemTemplates: [] as MockTemplate[],
  searchParams: {},
  pagination: { total: 0, page: 1, totalPages: 1 },
  isLoading: false,
  error: null as string | null,
};

type DispatchOutcome<T> =
  | { status: 'fulfilled'; type: string; payload: T }
  | { status: 'rejected'; type: string; payload: string };

const buildDispatchResult = <T,>(outcome: DispatchOutcome<T>) => {
  const action =
    outcome.status === 'fulfilled'
      ? { type: outcome.type, payload: outcome.payload }
      : { type: outcome.type, payload: outcome.payload, error: { message: outcome.payload } };
  const promise = Promise.resolve(action);
  return Object.assign(promise, {
    unwrap: () =>
      outcome.status === 'fulfilled'
        ? Promise.resolve(outcome.payload)
        : Promise.reject(outcome.payload),
  });
};

let createTemplateOutcome: DispatchOutcome<{ id: string }>;
let duplicateTemplateOutcome: DispatchOutcome<{ id: string }>;
let createWebsiteSiteOutcome: DispatchOutcome<{ id: string }>;
let publishWebsiteSiteOutcome: DispatchOutcome<{ siteId: string; target: 'live'; url: string; version: string }>;

const templateSliceMocks = vi.hoisted(() => {
  const createTemplate = Object.assign(
    (payload: unknown) => ({ type: 'templates/create', payload, __createTemplate: true }),
    {
      fulfilled: {
        match: (action: { type?: string }) => action?.type === 'templates/create/fulfilled',
      },
    }
  );

  return {
    createTemplate,
    searchTemplates: vi.fn(() => ({ type: 'templates/search' })),
    fetchSystemTemplates: vi.fn(() => ({ type: 'templates/fetchSystem' })),
    deleteTemplate: vi.fn(() => ({ type: 'templates/delete' })),
    duplicateTemplate: Object.assign(
      (payload: unknown) => ({ type: 'templates/duplicate', payload, __duplicateTemplate: true }),
      {
        fulfilled: {
          match: (action: { type?: string }) =>
            action?.type === 'templates/duplicate/fulfilled',
        },
      }
    ),
    setSearchParams: vi.fn(() => ({ type: 'templates/setSearchParams' })),
    clearError: vi.fn(() => ({ type: 'templates/clearError' })),
  };
});

const websiteSliceMocks = vi.hoisted(() => {
  const createWebsiteSite = Object.assign(
    (payload: unknown) => ({ type: 'websites/createSite', payload, __createWebsiteSite: true }),
    {
      fulfilled: {
        match: (action: { type?: string }) => action?.type === 'websites/createSite/fulfilled',
      },
    }
  );

  const publishWebsiteSite = Object.assign(
    (payload: unknown) => ({ type: 'websites/publishSite', payload, __publishWebsiteSite: true }),
    {
      fulfilled: {
        match: (action: { type?: string }) => action?.type === 'websites/publishSite/fulfilled',
      },
    }
  );

  return {
    createWebsiteSite,
    publishWebsiteSite,
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactReduxModule>();
  return {
    ...actual,
    useDispatch: () => dispatchMock,
    useSelector: (selector: (state: unknown) => unknown) =>
      selector({ templates: templateState }),
  };
});

vi.mock('../../../features/builder/state', () => ({
  createTemplate: templateSliceMocks.createTemplate,
  searchTemplates: templateSliceMocks.searchTemplates,
  fetchSystemTemplates: templateSliceMocks.fetchSystemTemplates,
  deleteTemplate: templateSliceMocks.deleteTemplate,
  duplicateTemplate: templateSliceMocks.duplicateTemplate,
  setSearchParams: templateSliceMocks.setSearchParams,
  clearError: templateSliceMocks.clearError,
}));

vi.mock('../../../features/websites/state', () => ({
  createWebsiteSite: websiteSliceMocks.createWebsiteSite,
  publishWebsiteSite: websiteSliceMocks.publishWebsiteSite,
}));

describe('TemplateGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    templateState = {
      templates: [],
      systemTemplates: [],
      searchParams: {},
      pagination: { total: 0, page: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    };
    createTemplateOutcome = {
      status: 'fulfilled',
      type: 'templates/create/fulfilled',
      payload: { id: 'template-123' },
    };
    duplicateTemplateOutcome = {
      status: 'fulfilled',
      type: 'templates/duplicate/fulfilled',
      payload: { id: 'template-456' },
    };
    createWebsiteSiteOutcome = {
      status: 'fulfilled',
      type: 'websites/createSite/fulfilled',
      payload: { id: 'site-123' },
    };
    publishWebsiteSiteOutcome = {
      status: 'fulfilled',
      type: 'websites/publishSite/fulfilled',
      payload: {
        siteId: 'site-123',
        target: 'live',
        url: 'https://community-support.example',
        version: 'v1',
      },
    };

    dispatchMock.mockImplementation((action: {
      __createTemplate?: boolean;
      __duplicateTemplate?: boolean;
      __createWebsiteSite?: boolean;
      __publishWebsiteSite?: boolean;
    }) => {
      if (action?.__createTemplate) {
        return buildDispatchResult(createTemplateOutcome);
      }
      if (action?.__duplicateTemplate) {
        return buildDispatchResult(duplicateTemplateOutcome);
      }
      if (action?.__createWebsiteSite) {
        return buildDispatchResult(createWebsiteSiteOutcome);
      }
      if (action?.__publishWebsiteSite) {
        return buildDispatchResult(publishWebsiteSiteOutcome);
      }
      return Promise.resolve(action);
    });
  });

  it('creates a blank template and navigates to the editor when starting from scratch', async () => {
    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: 'New Website' }));
    fireEvent.click(screen.getByRole('button', { name: /Start from Scratch/i }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'templates/create',
          payload: expect.objectContaining({
            name: 'Untitled Website',
            category: 'multi-page',
          }),
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/website-builder/template-123');
    });
  });

  it('opens the create site modal from the builder header', () => {
    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: 'New Site' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create and Publish Site' })).toBeInTheDocument();
  });

  it('keeps create-and-publish disabled until site name and template are selected', async () => {
    templateState = {
      ...templateState,
      systemTemplates: [
        {
          id: 'template-starter-1',
          name: 'Starter Template',
          description: 'Template for starting a site',
          category: 'multi-page',
          isSystemTemplate: true,
          pageCount: 3,
          tags: [],
        },
      ],
    };

    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: 'New Site' }));

    const dialog = screen.getByRole('dialog');
    const createSiteButton = within(dialog).getByRole('button', {
      name: 'Create and Publish Site',
    });

    expect(createSiteButton).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Site name'), {
      target: { value: 'Community Support Hub' },
    });
    expect(createSiteButton).toBeDisabled();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Select template Starter Template' })
    );
    expect(createSiteButton).toBeEnabled();
  });

  it('opens template previews with noopener and noreferrer', async () => {
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);
    templateState = {
      ...templateState,
      systemTemplates: [
        {
          id: 'template-preview-1',
          name: 'Preview Template',
          description: 'Template for previewing',
          category: 'landing-page',
          isSystemTemplate: false,
          pageCount: 1,
          tags: [],
        },
      ],
    };

    render(<TemplateGallery />);

    await waitFor(() => {
      expect(screen.getByTitle('Preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Preview'));

    expect(openMock).toHaveBeenCalledWith(
      '/website-builder/template-preview-1/preview',
      '_blank',
      'noopener,noreferrer'
    );

    openMock.mockRestore();
  });

  it('duplicates starter templates with a generated copy name and opens the editor', async () => {
    templateState = {
      ...templateState,
      systemTemplates: [
        {
          id: 'template-starter-1',
          name: 'Starter Template',
          description: 'Template for starting a site',
          category: 'multi-page',
          isSystemTemplate: true,
          pageCount: 3,
          tags: [],
        },
      ],
    };

    render(<TemplateGallery />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Use Template' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Use Template' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'templates/duplicate',
          payload: expect.objectContaining({
            id: 'template-starter-1',
            name: 'Starter Template (Copy)',
          }),
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/website-builder/template-456');
    });
  });

  it('creates and publishes a site from an owned template, then opens the site builder', async () => {
    templateState = {
      ...templateState,
      templates: [
        {
          id: 'template-owned-1',
          name: 'Community Template',
          description: 'Owned template',
          category: 'multi-page',
          status: 'draft',
          isSystemTemplate: false,
          pageCount: 4,
          tags: [],
        },
      ],
      pagination: { total: 1, page: 1, totalPages: 1 },
    };

    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: /My Templates/i }));
    fireEvent.click(screen.getByRole('button', { name: 'New Site' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Site name'), {
      target: { value: 'Community Support Hub' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Select template Community Template' })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create and Publish Site' })
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/createSite',
          payload: {
            templateId: 'template-owned-1',
            name: 'Community Support Hub',
            siteKind: 'organization',
          },
        })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/publishSite',
          payload: {
            siteId: 'site-123',
            templateId: 'template-owned-1',
            target: 'live',
          },
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/websites/site-123/builder');
    });

    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'templates/duplicate' })
    );
  });

  it('duplicates starter templates before creating and publishing a site', async () => {
    templateState = {
      ...templateState,
      systemTemplates: [
        {
          id: 'template-starter-1',
          name: 'Starter Template',
          description: 'Starter template for sites',
          category: 'multi-page',
          isSystemTemplate: true,
          pageCount: 3,
          tags: [],
        },
      ],
    };

    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: 'New Site' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Site name'), {
      target: { value: 'Community Support Hub' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Select template Starter Template' })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create and Publish Site' })
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'templates/duplicate',
          payload: {
            id: 'template-starter-1',
            name: 'Community Support Hub Website Template',
          },
        })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/createSite',
          payload: {
            templateId: 'template-456',
            name: 'Community Support Hub',
            siteKind: 'organization',
          },
        })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/publishSite',
          payload: {
            siteId: 'site-123',
            templateId: 'template-456',
            target: 'live',
          },
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/websites/site-123/builder');
    });
  });

  it('shows duplicate-stage errors in the create site modal and does not navigate', async () => {
    duplicateTemplateOutcome = {
      status: 'rejected',
      type: 'templates/duplicate/rejected',
      payload: 'Duplicate failed',
    };
    templateState = {
      ...templateState,
      systemTemplates: [
        {
          id: 'template-starter-1',
          name: 'Starter Template',
          description: 'Starter template for sites',
          category: 'multi-page',
          isSystemTemplate: true,
          pageCount: 3,
          tags: [],
        },
      ],
    };

    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: 'New Site' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Site name'), {
      target: { value: 'Community Support Hub' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Select template Starter Template' })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create and Publish Site' })
    );

    await waitFor(() => {
      expect(
        within(dialog).getByText('Could not prepare the starter template. Duplicate failed')
      ).toBeInTheDocument();
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows create-site errors in the create site modal and does not navigate', async () => {
    createWebsiteSiteOutcome = {
      status: 'rejected',
      type: 'websites/createSite/rejected',
      payload: 'Create site failed',
    };
    templateState = {
      ...templateState,
      templates: [
        {
          id: 'template-owned-1',
          name: 'Community Template',
          description: 'Owned template',
          category: 'multi-page',
          status: 'draft',
          isSystemTemplate: false,
          pageCount: 4,
          tags: [],
        },
      ],
      pagination: { total: 1, page: 1, totalPages: 1 },
    };

    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: /My Templates/i }));
    fireEvent.click(screen.getByRole('button', { name: 'New Site' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Site name'), {
      target: { value: 'Community Support Hub' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Select template Community Template' })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create and Publish Site' })
    );

    await waitFor(() => {
      expect(
        within(dialog).getByText('Could not create the site. Create site failed')
      ).toBeInTheDocument();
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows publish-stage errors in the create site modal and does not navigate', async () => {
    publishWebsiteSiteOutcome = {
      status: 'rejected',
      type: 'websites/publishSite/rejected',
      payload: 'Publish failed',
    };
    templateState = {
      ...templateState,
      templates: [
        {
          id: 'template-owned-1',
          name: 'Community Template',
          description: 'Owned template',
          category: 'multi-page',
          status: 'draft',
          isSystemTemplate: false,
          pageCount: 4,
          tags: [],
        },
      ],
      pagination: { total: 1, page: 1, totalPages: 1 },
    };

    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: /My Templates/i }));
    fireEvent.click(screen.getByRole('button', { name: 'New Site' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Site name'), {
      target: { value: 'Community Support Hub' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Select template Community Template' })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create and Publish Site' })
    );

    await waitFor(() => {
      expect(
        within(dialog).getByText(
          'The site was created, but publishing live failed. Publish failed'
        )
      ).toBeInTheDocument();
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
