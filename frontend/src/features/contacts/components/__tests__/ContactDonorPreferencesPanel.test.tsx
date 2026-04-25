import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactDonorPreferencesPanel from '../ContactDonorPreferencesPanel';
import { renderWithProviders } from '../../../../test/testUtils';
import { contactsApiClient } from '../../api/contactsApiClient';
import type { DonorProfile } from '../../../../types/contact';

vi.mock('../../api/contactsApiClient', () => ({
  contactsApiClient: {
    getDonorProfile: vi.fn(),
    updateDonorProfile: vi.fn(),
  },
}));

const makeProfile = (overrides: Partial<DonorProfile> = {}): DonorProfile => ({
  id: 'profile-1',
  contact_id: 'contact-1',
  account_id: 'account-1',
  receipt_frequency: 'annual',
  receipt_each_gift: true,
  email_gift_statement: true,
  anonymous_donor: false,
  no_solicitations: false,
  notes: null,
  created_at: '2026-04-25T00:00:00.000Z',
  updated_at: '2026-04-25T00:00:00.000Z',
  created_by: 'user-1',
  updated_by: 'user-1',
  ...overrides,
});

describe('ContactDonorPreferencesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contactsApiClient.getDonorProfile).mockResolvedValue(makeProfile());
    vi.mocked(contactsApiClient.updateDonorProfile).mockImplementation(async (_contactId, payload) =>
      makeProfile({
        ...payload,
        notes: payload.notes ?? null,
      })
    );
  });

  it('loads the donor profile and shows the active receipt default', async () => {
    renderWithProviders(<ContactDonorPreferencesPanel contactId="contact-1" />);

    expect(await screen.findByText('Email annual receipts')).toBeInTheDocument();
    expect(screen.getByLabelText(/email gift statements/i)).toBeChecked();
    expect(screen.getByLabelText(/receipt each gift/i)).toBeDisabled();
  });

  it('saves compact donor preference updates', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactDonorPreferencesPanel contactId="contact-1" />);

    await screen.findByText('Email annual receipts');
    await user.selectOptions(screen.getByLabelText(/receipt frequency/i), 'per_gift');
    await user.click(screen.getByLabelText(/no solicitations/i));
    await user.type(screen.getByLabelText(/notes/i), 'Prefers consolidated updates');
    await user.click(screen.getByRole('button', { name: /save donor preferences/i }));

    expect(contactsApiClient.updateDonorProfile).toHaveBeenCalledWith('contact-1', {
      receipt_frequency: 'per_gift',
      receipt_each_gift: true,
      email_gift_statement: true,
      anonymous_donor: false,
      no_solicitations: true,
      notes: 'Prefers consolidated updates',
    });
    expect(await screen.findByText(/donor preferences saved/i)).toBeInTheDocument();
  });
});
