import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ContactRelationships from '../ContactRelationships';
import { renderWithProviders } from '../../test/testUtils';

const dispatchMock = vi.fn();

const mockState = {
  contacts: {
    relationships: [],
    relationshipsLoading: false,
    contacts: [],
    currentContact: null,
  },
};

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

describe('ContactRelationships', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('opens the create-contact flow in a safe new tab', async () => {
    const user = userEvent.setup();
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderWithProviders(<ContactRelationships contactId="contact-1" />, {
      route: '/contacts/contact-1',
    });

    await user.click(screen.getByRole('button', { name: /\+ add associated contact/i }));
    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /\+ create "Jane Doe" as new person/i }));

    expect(openMock).toHaveBeenCalledWith(
      '/contacts/new?first_name=Jane&last_name=Doe&return_to=contact-1',
      '_blank',
      'noopener,noreferrer'
    );

    openMock.mockRestore();
  });
});
