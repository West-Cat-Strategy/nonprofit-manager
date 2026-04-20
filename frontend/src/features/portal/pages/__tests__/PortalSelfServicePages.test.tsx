import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createTestStore, renderWithProviders } from '../../../../test/testUtils';
import PortalProfilePage from '../PortalProfilePage';
import PortalPeoplePage from '../PortalPeoplePage';

const portalGetMock = vi.fn();
const portalPatchMock = vi.fn();
const portalPostMock = vi.fn();
const portalDeleteMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('../../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => portalGetMock(...args),
    patch: (...args: unknown[]) => portalPatchMock(...args),
    post: (...args: unknown[]) => portalPostMock(...args),
    delete: (...args: unknown[]) => portalDeleteMock(...args),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

describe('Portal self-service pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('loads and saves the portal profile form', async () => {
    const user = userEvent.setup();
    const store = createTestStore({
      portalAuth: {
        token: null,
        user: {
          id: 'portal-user-1',
          email: 'portal@example.com',
          contactId: 'contact-1',
        },
        loading: false,
        error: null,
        signupStatus: 'idle',
      },
    });
    portalGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          contact_id: 'contact-1',
          first_name: 'Portal',
          last_name: 'Client',
          email: 'portal@example.com',
          phone: '555-111-2222',
          mobile_phone: null,
          phn: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state_province: null,
          postal_code: null,
          country: null,
          preferred_contact_method: null,
          pronouns: null,
          gender: null,
          profile_picture: null,
        },
      },
    });
    portalPatchMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          contact_id: 'contact-1',
          first_name: 'Updated',
          last_name: 'Client',
          email: 'updated.portal@example.com',
          phone: '555-111-2222',
          mobile_phone: null,
          phn: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state_province: null,
          postal_code: null,
          country: null,
          preferred_contact_method: null,
          pronouns: null,
          gender: null,
          profile_picture: null,
        },
      },
    });

    renderWithProviders(<PortalProfilePage />, { store });

    const firstNameInput = await screen.findByDisplayValue('Portal');
    const lastNameInput = screen.getByDisplayValue('Client');
    const emailInput = screen.getByDisplayValue('portal@example.com');

    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Updated');
    await user.clear(lastNameInput);
    await user.type(lastNameInput, 'Person');
    await user.clear(emailInput);
    await user.type(emailInput, 'updated.portal@example.com');

    expect((firstNameInput as HTMLInputElement).value).toBe('Updated');
    expect((lastNameInput as HTMLInputElement).value).toBe('Person');
    expect((emailInput as HTMLInputElement).value).toBe('updated.portal@example.com');

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(portalPatchMock).toHaveBeenCalled();
      expect(portalPatchMock).toHaveBeenCalledWith(
        '/v2/portal/profile',
        expect.objectContaining({
          first_name: 'Updated',
          last_name: 'Person',
          email: 'updated.portal@example.com',
        })
      );
      expect(showSuccessMock).toHaveBeenCalledWith('Profile updated successfully.');
    });

    await waitFor(() => {
      expect(store.getState().portalAuth.user).toEqual({
        id: 'portal-user-1',
        email: 'updated.portal@example.com',
        contactId: 'contact-1',
      });
    });

    const storedSnapshot = window.sessionStorage.getItem('portal_bootstrap_snapshot');
    expect(storedSnapshot).not.toBeNull();
    const parsedSnapshot = JSON.parse(storedSnapshot as string);
    expect(parsedSnapshot).toMatchObject({
      status: 'authenticated',
      user: {
        id: 'portal-user-1',
        email: 'updated.portal@example.com',
        contactId: 'contact-1',
      },
    });
    expect(typeof parsedSnapshot.fetchedAt).toBe('number');
  });

  it('loads related people and creates a new one', async () => {
    portalGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'relationship-1',
            relationship_type: 'contact_person',
            relationship_label: 'Support worker',
            notes: 'Call when needed',
            related_contact_first_name: 'Alex',
            related_contact_last_name: 'Rivera',
            related_contact_email: 'alex@example.com',
            related_contact_phone: '555-000-1234',
          },
        ],
      },
    });
    portalPostMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 'relationship-2',
          relationship_type: 'contact_person',
          relationship_label: 'Sibling',
          notes: null,
          related_contact_first_name: 'Sam',
          related_contact_last_name: 'Taylor',
          related_contact_email: 'sam@example.com',
          related_contact_phone: null,
        },
      },
    });

    renderWithProviders(<PortalPeoplePage />);

    expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Taylor' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'sam@example.com' } });
    fireEvent.change(screen.getByLabelText('Custom relationship label'), {
      target: { value: 'Sibling' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    await waitFor(() => {
      expect(portalPostMock).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Person added.');
    });

    expect(await screen.findByText('Sam Taylor')).toBeInTheDocument();
  });
});
