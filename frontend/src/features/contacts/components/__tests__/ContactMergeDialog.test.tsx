import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Contact } from '../../../../types/contact';
import { renderWithProviders } from '../../../../test/testUtils';
import ContactMergeDialog from '../ContactMergeDialog';
import { contactsApiClient } from '../../api/contactsApiClient';
import { vi } from 'vitest';

const makeContact = (overrides: Partial<Contact> & { contact_id: string; first_name: string; last_name: string }): Contact => ({
  contact_id: overrides.contact_id,
  account_id: overrides.account_id ?? null,
  account_name: overrides.account_name,
  first_name: overrides.first_name,
  preferred_name: overrides.preferred_name ?? null,
  last_name: overrides.last_name,
  middle_name: overrides.middle_name ?? null,
  salutation: overrides.salutation ?? null,
  suffix: overrides.suffix ?? null,
  birth_date: overrides.birth_date ?? null,
  gender: overrides.gender ?? null,
  pronouns: overrides.pronouns ?? null,
  phn: overrides.phn ?? null,
  email: overrides.email ?? null,
  phone: overrides.phone ?? null,
  mobile_phone: overrides.mobile_phone ?? null,
  address_line1: overrides.address_line1 ?? null,
  address_line2: overrides.address_line2 ?? null,
  city: overrides.city ?? null,
  state_province: overrides.state_province ?? null,
  postal_code: overrides.postal_code ?? null,
  country: overrides.country ?? null,
  no_fixed_address: overrides.no_fixed_address ?? false,
  job_title: overrides.job_title ?? null,
  department: overrides.department ?? null,
  preferred_contact_method: overrides.preferred_contact_method ?? null,
  do_not_email: overrides.do_not_email ?? false,
  do_not_phone: overrides.do_not_phone ?? false,
  do_not_text: overrides.do_not_text ?? false,
  do_not_voicemail: overrides.do_not_voicemail ?? false,
  notes: overrides.notes ?? null,
  tags: overrides.tags ?? [],
  is_active: overrides.is_active ?? true,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-02T00:00:00.000Z',
  phone_count: overrides.phone_count,
  email_count: overrides.email_count,
  relationship_count: overrides.relationship_count,
  note_count: overrides.note_count,
  document_count: overrides.document_count,
  roles: overrides.roles,
});

describe('ContactMergeDialog', () => {
  const sourceContact = makeContact({
    contact_id: '550e8400-e29b-41d4-a716-446655440000',
    first_name: 'Taylor',
    last_name: 'Source',
    email: 'taylor.source@example.com',
    phone: '555-111-2222',
  });

  const targetContact = makeContact({
    contact_id: '550e8400-e29b-41d4-a716-446655440111',
    first_name: 'Alex',
    last_name: 'Target',
    email: 'alex.target@example.com',
    phone: '555-333-4444',
    is_active: false,
    account_name: 'Community Org',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searches inactive contacts, previews conflicts, and submits the selected merge resolution', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    vi.spyOn(contactsApiClient, 'searchContactsForMerge').mockResolvedValue([targetContact]);
    vi.spyOn(contactsApiClient, 'getContactMergePreview').mockResolvedValue({
      source_contact: { ...sourceContact, roles: ['Client'] },
      target_contact: { ...targetContact, roles: ['Staff'] },
      fields: [
        {
          field: 'first_name',
          label: 'First name',
          source_value: 'Taylor',
          target_value: 'Alex',
          conflict: true,
          auto_merged: false,
        },
        {
          field: 'tags',
          label: 'Tags',
          source_value: ['alpha'],
          target_value: ['beta'],
          conflict: false,
          auto_merged: true,
        },
      ],
      source_summary: { phones: 1, emails: 1, relationships: 0, notes: 0, documents: 0, roles: 1 },
      target_summary: { phones: 2, emails: 1, relationships: 1, notes: 2, documents: 0, roles: 1 },
    });
    const mergeSpy = vi.spyOn(contactsApiClient, 'mergeContact').mockResolvedValue({
      survivor_contact: { ...targetContact, roles: ['Staff'] },
      merge_summary: {
        source_contact_id: sourceContact.contact_id,
        target_contact_id: targetContact.contact_id,
        merged_fields: ['first_name', 'tags'],
        moved_counts: { contact_phone_numbers: 1 },
      },
    });

    renderWithProviders(
      <ContactMergeDialog
        isOpen
        sourceContact={sourceContact}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByPlaceholderText(/search by name, phone, or email/i), 'Target');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByText('Alex Target')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /alex target/i }));

    expect(await screen.findByText(/conflicting fields/i)).toBeInTheDocument();
    expect(screen.getByText(/selected target/i)).toBeInTheDocument();
    expect(screen.getByText('First name')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /source/i }));
    await user.click(screen.getByRole('button', { name: /merge contacts/i }));

    await waitFor(() => expect(mergeSpy).toHaveBeenCalledTimes(1));
    expect(mergeSpy).toHaveBeenCalledWith(sourceContact.contact_id, {
      target_contact_id: targetContact.contact_id,
      resolutions: { first_name: 'source' },
    });
    expect(onSuccess).toHaveBeenCalledWith({
      survivor_contact: { ...targetContact, roles: ['Staff'] },
      merge_summary: {
        source_contact_id: sourceContact.contact_id,
        target_contact_id: targetContact.contact_id,
        merged_fields: ['first_name', 'tags'],
        moved_counts: { contact_phone_numbers: 1 },
      },
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a useful empty state and closes cleanly', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    vi.spyOn(contactsApiClient, 'searchContactsForMerge').mockResolvedValue([]);

    renderWithProviders(
      <ContactMergeDialog
        isOpen
        sourceContact={sourceContact}
        onClose={onClose}
        onSuccess={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText(/search by name, phone, or email/i), 'zz');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByText(/no matching contacts found/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
