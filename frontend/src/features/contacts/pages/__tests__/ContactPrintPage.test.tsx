import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import ContactPrintPage from '../ContactPrintPage';
import type { ContactPrintData } from '../../api/contactPrintData';

const { fetchContactPrintDataMock } = vi.hoisted(() => ({
  fetchContactPrintDataMock: vi.fn(),
}));

vi.mock('../../api/contactPrintData', () => ({
  fetchContactPrintData: fetchContactPrintDataMock,
}));

const buildContactPrintData = (overrides: Partial<ContactPrintData> = {}): ContactPrintData => ({
  contact: {
    contact_id: '550e8400-e29b-41d4-a716-446655440000',
    account_id: '11111111-1111-4111-8111-111111111111',
    account_name: 'Example Account',
    first_name: 'Taylor',
    preferred_name: 'Taylor',
    last_name: 'Contact',
    middle_name: null,
    salutation: 'Mx.',
    suffix: null,
    birth_date: '1990-04-01',
    gender: 'Non-binary',
    pronouns: 'they/them',
    phn: '1234567890',
    email: 'taylor@example.org',
    phone: '555-0100',
    mobile_phone: '555-0101',
    address_line1: '123 Main St',
    address_line2: 'Unit 4',
    city: 'Vancouver',
    state_province: 'BC',
    postal_code: 'V5K 0A1',
    country: 'Canada',
    no_fixed_address: false,
    job_title: 'Program Coordinator',
    department: 'Programs',
    preferred_contact_method: 'email',
    do_not_email: false,
    do_not_phone: false,
    do_not_text: false,
    do_not_voicemail: false,
    notes: 'Core note',
    tags: ['priority', 'intake'],
    is_active: true,
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-02-01T12:00:00.000Z',
    phone_count: 1,
    email_count: 1,
    relationship_count: 1,
    note_count: 1,
    document_count: 1,
    roles: ['Client'],
    ...overrides.contact,
  },
  phones: [
    {
      id: 'phone-1',
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      phone_number: '555-0100',
      label: 'mobile',
      is_primary: true,
      created_at: '2026-01-01T12:00:00.000Z',
      updated_at: '2026-01-02T12:00:00.000Z',
    },
  ],
  emails: [
    {
      id: 'email-1',
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      email_address: 'taylor@example.org',
      label: 'work',
      is_primary: true,
      created_at: '2026-01-01T12:00:00.000Z',
      updated_at: '2026-01-02T12:00:00.000Z',
    },
  ],
  relationships: [
    {
      id: 'relationship-1',
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      related_contact_id: '22222222-2222-4222-8222-222222222222',
      relationship_type: 'support_person',
      relationship_label: 'Navigator',
      is_bidirectional: false,
      inverse_relationship_type: null,
      notes: 'Primary support contact',
      is_active: true,
      created_at: '2026-01-01T12:00:00.000Z',
      updated_at: '2026-01-02T12:00:00.000Z',
      related_contact_first_name: 'Alex',
      related_contact_last_name: 'Support',
    },
  ],
  notes: [
    {
      id: 'note-1',
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      case_id: null,
      note_type: 'meeting',
      subject: 'Follow-up meeting',
      content: 'Discussed next steps.',
      is_internal: false,
      is_important: true,
      is_pinned: false,
      is_alert: false,
      is_portal_visible: false,
      portal_visible_at: null,
      portal_visible_by: null,
      attachments: null,
      created_at: '2026-01-03T12:00:00.000Z',
      updated_at: '2026-01-03T12:00:00.000Z',
      created_by: '33333333-3333-4333-8333-333333333333',
      created_by_first_name: 'Casey',
      created_by_last_name: 'Worker',
    },
  ],
  documents: [
    {
      id: 'document-1',
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      case_id: null,
      file_name: 'intake-form.pdf',
      original_name: 'Intake Form.pdf',
      file_path: '/documents/intake-form.pdf',
      file_size: 15360,
      mime_type: 'application/pdf',
      document_type: 'consent_form',
      title: 'Intake form',
      description: 'Signed intake form.',
      is_portal_visible: false,
      portal_visible_at: null,
      portal_visible_by: null,
      is_active: true,
      created_at: '2026-01-03T12:00:00.000Z',
      created_by: '33333333-3333-4333-8333-333333333333',
      updated_at: '2026-01-04T12:00:00.000Z',
      created_by_first_name: 'Casey',
      created_by_last_name: 'Worker',
    },
  ],
  communications: [
    {
      id: 'comm-1',
      channel: 'email',
      source_type: 'appointment_reminder',
      delivery_status: 'sent',
      recipient: 'taylor@example.org',
      error_message: null,
      message_preview: 'Reminder for tomorrow.',
      trigger_type: 'automated',
      sent_at: '2026-01-05T12:00:00.000Z',
      appointment_id: null,
      case_id: null,
      event_id: null,
      registration_id: null,
      source_label: 'Appointment reminder',
      source_subtitle: 'Upcoming appointment',
      action: {
        type: 'none',
        label: 'None',
      },
    },
  ],
  followUps: [
    {
      id: 'follow-up-1',
      entity_type: 'contact',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Call back',
      description: 'Check in on intake progress.',
      scheduled_date: '2026-01-10',
      scheduled_time: '09:30',
      frequency: 'once',
      method: 'phone',
      status: 'scheduled',
      completed_date: null,
      completed_notes: null,
      assigned_to: '44444444-4444-4444-8444-444444444444',
      assigned_to_name: 'Jordan Helper',
      reminder_minutes_before: 60,
      created_by: '33333333-3333-4333-8333-333333333333',
      created_at: '2026-01-05T12:00:00.000Z',
      updated_at: '2026-01-05T12:00:00.000Z',
    },
  ],
  cases: [
    {
      id: 'case-1',
      case_number: 'C-1001',
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      account_id: null,
      case_type_id: 'case-type-1',
      case_type_ids: null,
      case_type_names: ['Housing'],
      status_id: 'status-1',
      priority: 'high',
      title: 'Housing support',
      description: 'Help with housing referral.',
      source: 'referral',
      referral_source: null,
      intake_date: '2026-01-01',
      opened_date: '2026-01-01',
      closed_date: null,
      due_date: null,
      assigned_to: null,
      assigned_team: null,
      outcome: null,
      case_outcome_values: null,
      outcome_notes: null,
      closure_reason: null,
      intake_data: null,
      custom_data: null,
      is_urgent: false,
      client_viewable: true,
      requires_followup: true,
      followup_date: null,
      tags: ['print'],
      created_at: '2026-01-01T12:00:00.000Z',
      updated_at: '2026-01-02T12:00:00.000Z',
      created_by: null,
      modified_by: null,
      case_type_name: 'Housing',
      status_name: 'Open',
      status_type: 'active',
    },
  ],
  activity: [
    {
      id: 'activity-1',
      type: 'contact_note_added',
      title: 'Note added',
      description: 'A note was added to the record.',
      timestamp: '2026-01-03T12:00:00.000Z',
      user_name: 'Casey Worker',
      entity_type: 'contact',
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
    },
  ],
  payments: [
    {
      donation_id: 'donation-1',
      donation_number: 'D-1001',
      account_id: null,
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 50,
      currency: 'CAD',
      donation_date: '2026-01-06',
      payment_method: 'credit_card',
      payment_status: 'completed',
      transaction_id: null,
      campaign_name: 'Winter Drive',
      designation: 'General Fund',
      is_recurring: false,
      recurring_frequency: null,
      notes: 'Thank you gift',
      receipt_sent: true,
      receipt_sent_date: '2026-01-06',
      created_at: '2026-01-06T12:00:00.000Z',
      updated_at: '2026-01-06T12:00:00.000Z',
      created_by: '33333333-3333-4333-8333-333333333333',
      modified_by: '33333333-3333-4333-8333-333333333333',
      contact_name: 'Taylor Contact',
    },
  ],
  ...overrides,
});

function renderPrintRoute(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/contacts/:id/print" element={<ContactPrintPage />} />
    </Routes>,
    { route }
  );
}

describe('ContactPrintPage', () => {
  beforeEach(() => {
    fetchContactPrintDataMock.mockReset();
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an invalid route state for non-UUID contact ids', () => {
    renderPrintRoute('/contacts/not-a-uuid/print');

    expect(screen.getByRole('heading', { name: /invalid contact link/i })).toBeInTheDocument();
    expect(fetchContactPrintDataMock).not.toHaveBeenCalled();
  });

  it('renders the contact export and auto-opens the print dialog', async () => {
    fetchContactPrintDataMock.mockResolvedValue({
      data: buildContactPrintData(),
      sectionErrors: {},
    });

    renderPrintRoute('/contacts/550e8400-e29b-41d4-a716-446655440000/print');

    expect(await screen.findByRole('heading', { name: 'Mx. Taylor Contact' })).toBeInTheDocument();
    expect(screen.getAllByText('Example Account').length).toBeGreaterThan(0);
    expect(screen.getByText('Phone Numbers')).toBeInTheDocument();
    expect(screen.getAllByText('555-0100').length).toBeGreaterThan(0);
    expect(screen.getByText('Follow-up meeting')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.print).toHaveBeenCalled();
    });
  });

  it('renders empty-state messages when related collections are empty', async () => {
    fetchContactPrintDataMock.mockResolvedValue({
      data: buildContactPrintData({
        phones: [],
        emails: [],
        relationships: [],
        notes: [],
        documents: [],
        communications: [],
        followUps: [],
        cases: [],
        activity: [],
        payments: [],
      }),
      sectionErrors: {},
    });

    renderPrintRoute('/contacts/550e8400-e29b-41d4-a716-446655440000/print');

    expect(await screen.findByRole('heading', { name: 'Mx. Taylor Contact' })).toBeInTheDocument();
    expect(screen.getByText('No phone numbers are on file.')).toBeInTheDocument();
    expect(screen.getByText('No notes are on file.')).toBeInTheDocument();
    expect(screen.getByText('No payments are on file.')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.print).toHaveBeenCalled();
    });
  });
});
