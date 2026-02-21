import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PortalMessages from '../../PortalMessages';
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

describe('PortalMessages page', () => {
  beforeEach(() => {
    getMock.mockImplementation((url: string) => {
      if (url === '/v2/portal/pointperson/context') {
        return Promise.resolve({
          data: {
            default_case_id: 'case-1',
            selected_case_id: 'case-1',
            cases: [
              {
                case_id: 'case-1',
                case_number: 'CASE-001',
                case_title: 'Housing Support',
                assigned_to: 'user-1',
                pointperson_first_name: 'Alex',
                pointperson_last_name: 'Rivera',
                is_messageable: true,
                is_default: true,
              },
            ],
          },
        });
      }

      if (url === '/v2/portal/messages/threads') {
        return Promise.resolve({ data: { threads: [] } });
      }

      if (url.startsWith('/v2/portal/messages/threads/')) {
        return Promise.resolve({
          data: {
            thread: {
              id: 'thread-1',
              subject: 'Need help',
              status: 'open',
              case_number: 'CASE-001',
              case_title: 'Housing Support',
              pointperson_first_name: 'Alex',
              pointperson_last_name: 'Rivera',
              unread_count: 0,
              last_message_at: new Date().toISOString(),
              last_message_preview: 'Need help',
            },
            messages: [],
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    postMock.mockResolvedValue({
      data: {
        thread: {
          id: 'thread-1',
          subject: 'Need help',
          status: 'open',
          case_number: 'CASE-001',
          case_title: 'Housing Support',
          pointperson_first_name: 'Alex',
          pointperson_last_name: 'Rivera',
          unread_count: 0,
          last_message_at: new Date().toISOString(),
          last_message_preview: 'Need help',
        },
        messages: [],
      },
    });
    patchMock.mockResolvedValue({ data: {} });
  });

  it('creates a new thread for the selected case', async () => {
    renderWithProviders(<PortalMessages />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /messages/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/quick summary/i), {
      target: { value: 'Need help' },
    });
    fireEvent.change(screen.getByPlaceholderText(/type your message/i), {
      target: { value: 'Can we meet this week?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/v2/portal/messages/threads', {
        case_id: 'case-1',
        subject: 'Need help',
        message: 'Can we meet this week?',
      });
    });
  });
});
