import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as ReactRouterDom from 'react-router-dom';
import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ReportTemplatesPage from '../ReportTemplatesPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { controllerCallsRef, controllerStateRef, fetchTemplatesMock, navigateMock } = vi.hoisted(() => ({
  controllerCallsRef: { current: [] } as ReportTemplatesControllerCallsRef,
  controllerStateRef: { current: null } as ReportTemplatesControllerStateRef,
  fetchTemplatesMock: vi.fn(),
  navigateMock: vi.fn(),
}));

const template = {
  id: 'tpl-1',
  name: 'Opportunity Pipeline Core KPI',
  description: 'Pipeline KPI template',
  category: 'fundraising' as const,
  tags: ['opportunities', 'kpi'],
  entity: 'opportunities',
  template_definition: {
    name: 'Opportunity Pipeline Core KPI',
    entity: 'opportunities',
    fields: ['stage_name'],
  },
  is_system: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

type ReportTemplatesControllerState = {
  availableTags: string[];
  error: string | null;
  fetchTemplates: () => void;
  filteredTemplates: typeof template[];
  loading: boolean;
};

type ReportTemplatesControllerStateRef = {
  current: ReportTemplatesControllerState | null;
};

type ReportTemplatesControllerCallsRef = {
  current: Array<{ category: string; tag: string }>;
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../hooks/useReportTemplatesController', () => ({
  default: (filters: { category: string; tag: string }) => {
    controllerCallsRef.current.push(filters);
    return controllerStateRef.current;
  },
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ReportTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerCallsRef.current = [];
    controllerStateRef.current = {
      availableTags: ['board-pack', 'fundraising-cadence'],
      error: null,
      fetchTemplates: fetchTemplatesMock,
      filteredTemplates: [template],
      loading: false,
    };
  });

  it('renders templates and navigates to builder with the template query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportTemplatesPage />);

    expect(screen.getByRole('heading', { name: /report templates/i })).toBeInTheDocument();
    expect(screen.getByText(/pipeline kpi template/i)).toBeInTheDocument();
    expect(controllerCallsRef.current.at(-1)).toEqual({ category: '', tag: '' });

    await user.click(screen.getByRole('button', { name: /use template/i }));
    expect(navigateMock).toHaveBeenCalledWith('/reports/builder?template=tpl-1');
  });

  it('reads category and tag filters from the query string', () => {
    renderWithProviders(<ReportTemplatesPage />, {
      route: '/reports/templates?category=fundraising&tag=fundraising-cadence',
    });

    expect(controllerCallsRef.current.at(-1)).toEqual({
      category: 'fundraising',
      tag: 'fundraising-cadence',
    });
    expect(
      screen.getByText(/showing fundraising templates tagged #fundraising-cadence/i)
    ).toBeInTheDocument();
  });

  it('clears the active tag filter through the query-param controls', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ReportTemplatesPage />, {
      route: '/reports/templates?tag=board-pack',
    });

    await user.click(screen.getByRole('button', { name: /clear tag filter/i }));

    await waitFor(() => {
      expect(controllerCallsRef.current.at(-1)).toEqual({
        category: '',
        tag: '',
      });
    });
  });

  it('delegates retry when the controller exposes an error', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.error = 'Unable to load report templates right now.';
    controllerStateRef.current.filteredTemplates = [];

    renderWithProviders(<ReportTemplatesPage />);

    await user.click(screen.getByRole('button', { name: /retry loading templates/i }));
    expect(fetchTemplatesMock).toHaveBeenCalled();
  });
});
