import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as ReactRouterDom from 'react-router-dom';
import { vi } from 'vitest';
import ReportTemplates from '../../analytics/ReportTemplates';
import { renderWithProviders } from '../../../test/testUtils';

const navigateMock = vi.fn();
const getMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../services/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

vi.mock('../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ReportTemplates page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({
      data: [
        {
          id: 'tpl-1',
          name: 'Opportunity Pipeline Core KPI',
          description: 'Pipeline KPI template',
          category: 'fundraising',
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
        },
      ],
    });
  });

  it('renders templates and navigates to builder with template query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /report templates/i })).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledWith('/reports/templates', { params: {} });

    await user.click(screen.getByRole('button', { name: /use template/i }));

    expect(navigateMock).toHaveBeenCalledWith('/reports/builder?template=tpl-1');
  });
});
