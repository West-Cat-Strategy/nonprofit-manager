import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PortalAppointments from '../../PortalAppointments';
import { renderWithProviders } from '../../../test/testUtils';

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();

vi.mock('../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));

vi.mock('../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

describe('PortalAppointments page', () => {
  beforeEach(() => {
    getMock.mockImplementation((url: string) => {
      if (url === '/portal/pointperson/context') {
        return Promise.resolve({
          data: {
            default_case_id: 'case-1',
            selected_case_id: 'case-1',
            cases: [
              {
                case_id: 'case-1',
                case_number: 'CASE-100',
                case_title: 'Career Support',
                is_messageable: true,
                is_default: true,
              },
            ],
          },
        });
      }

      if (url === '/portal/appointments') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/portal/appointments/slots') {
        return Promise.resolve({
          data: {
            selected_case_id: 'case-1',
            selected_pointperson_user_id: 'user-1',
            slots: [
              {
                id: 'slot-1',
                title: 'Morning slot',
                details: 'Bring ID',
                location: 'Main Office',
                start_time: new Date(Date.now() + 3600_000).toISOString(),
                end_time: new Date(Date.now() + 5400_000).toISOString(),
                available_count: 1,
                status: 'open',
                pointperson_first_name: 'Alex',
                pointperson_last_name: 'Rivera',
              },
            ],
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    postMock.mockResolvedValue({ data: { appointment: { id: 'appt-1' } } });
    patchMock.mockResolvedValue({ data: {} });
  });

  it('books a published slot', async () => {
    renderWithProviders(<PortalAppointments />);

    await waitFor(() => {
      expect(screen.getByText(/morning slot/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^book$/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/portal/appointments/slots/slot-1/book', {
        case_id: 'case-1',
      });
    });
  });
});
