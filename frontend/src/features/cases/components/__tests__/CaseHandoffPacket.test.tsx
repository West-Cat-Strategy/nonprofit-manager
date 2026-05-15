import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CaseHandoffModal } from '../CaseHandoffModal';
import { CaseHandoffPacket } from '../CaseHandoffPacket';
import type { CaseHandoffPacket as HandoffData } from '../../../../types/case';

vi.mock('../../../../components/neo-brutalist', () => ({
  BrutalBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  BrutalButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  BrutalCard: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

const handoffPacket: HandoffData = {
  case_details: {
    id: 'case-1',
    case_number: 'CASE-001',
    title: 'Housing Support',
    status_name: 'Open',
    status_type: 'active',
    priority: 'high',
    is_urgent: true,
    description: 'Stable housing support',
    closed_date: null,
    closure_reason: null,
    assigned_staff: {
      first_name: 'Alex',
      last_name: 'Rivera',
      email: 'alex@example.com',
    },
    contact: {
      first_name: 'Casey',
      last_name: 'Client',
      email: 'casey@example.com',
    },
  },
  risks: {
    is_urgent: true,
    is_high_priority: true,
    overdue_milestones_count: 1,
    overdue_follow_ups_count: 1,
    risk_summary: ['Marked as Urgent', 'High Priority', '1 Overdue Milestones'],
  },
  continuity: {
    reassessment: {
      status: 'overdue',
      headline: '1 reassessment overdue',
      detail: 'Complete, reschedule, or cancel overdue reassessments before handoff or closure.',
      overdue_count: 1,
      lapsed_count: 0,
      current: {
        id: 'reassessment-1',
        title: 'Quarterly review',
        status: 'scheduled',
        due_date: '2026-04-19',
        earliest_review_date: '2026-04-01',
        latest_review_date: '2026-04-30',
        completion_summary: null,
        cancellation_reason: null,
        completed_at: null,
      },
      next: null,
      recent: [],
    },
    handoff_readiness: {
      status: 'needs_attention',
      cues: ['1 pending milestone', '1 pending follow-up', '1 overdue reassessment'],
    },
    closure: {
      status: 'open_actions',
      cues: [
        '1 pending milestone before closure',
        '1 pending follow-up before closure',
        '1 overdue reassessment before closure',
      ],
    },
  },
  next_actions: {
    pending_milestones: [
      {
        id: 'milestone-1',
        name: 'Housing review',
        due_date: '2026-04-20T00:00:00.000Z',
      },
    ],
    pending_follow_ups: [
      {
        id: 'follow-up-1',
        title: 'Call landlord',
        due_date: '2026-04-21T00:00:00.000Z',
      },
    ],
  },
  visibility: {
    client_viewable: false,
    portal_visibility_status: 'Internal Only',
  },
  artifacts_summary: {
    services_count: 2,
    forms_count: 1,
    appointments_count: 3,
    notes_count: 4,
    documents_count: 5,
  },
  field_packet: {
    scope: {
      summary: [
        'Portable staff review packet assembled from existing case-detail records',
        'Includes current service, form, appointment, visibility, reassessment, next-action, and assignment context',
        'Does not create an offline sync bundle, service-site routing record, referral transfer, or persisted packet entity',
      ],
      offline_sync_included: false,
      service_site_routing_included: false,
      referral_transfer_included: false,
      persisted_packet_included: false,
    },
    assignment_context: {
      assigned_staff: {
        first_name: 'Alex',
        last_name: 'Rivera',
        email: 'alex@example.com',
      },
      contact: {
        first_name: 'Casey',
        last_name: 'Client',
        email: 'casey@example.com',
      },
      case_status: 'Open',
      priority: 'high',
      portal_visibility_status: 'Internal Only',
    },
    services: [
      {
        id: 'service-1',
        name: 'Housing navigation',
        type: 'housing',
        provider: 'Community Housing Team',
        service_site_snapshot: {
          id: 'site-1',
          name: 'Outreach Hub',
          provider_name: 'Community Housing Team',
          address_line1: '100 Main St',
          address_line2: null,
          city: 'Vancouver',
          state_province: 'BC',
          postal_code: 'V6B 1A1',
          country: 'Canada',
          phone: '555-0100',
          email: null,
          contact_name: 'Intake desk',
          notes: null,
        },
        status: 'scheduled',
        service_date: '2026-04-22',
        outcome: 'Bring lease paperwork',
      },
    ],
    forms: [
      {
        id: 'form-1',
        title: 'Housing eligibility review',
        status: 'sent',
        due_at: '2026-04-23T16:00:00.000Z',
        sent_at: '2026-04-20T16:00:00.000Z',
        submitted_at: null,
        reviewed_at: null,
        recipient_email: 'casey@example.com',
      },
    ],
    appointments: [
      {
        id: 'appointment-1',
        title: 'Housing site visit',
        status: 'confirmed',
        start_time: '2026-04-24T18:00:00.000Z',
        end_time: '2026-04-24T18:30:00.000Z',
        location: 'Main office',
        service_site_snapshot: {
          id: 'appt-site-1',
          name: 'Downtown Clinic',
          provider_name: null,
          address_line1: '200 Care Ave',
          address_line2: null,
          city: 'Vancouver',
          state_province: 'BC',
          postal_code: 'V6C 2B2',
          country: 'Canada',
          phone: '555-0200',
          email: null,
          contact_name: null,
          notes: null,
        },
        request_type: 'slot_booking',
        pointperson: {
          first_name: 'Alex',
          last_name: 'Rivera',
          email: 'alex@example.com',
        },
      },
    ],
  },
  generated_at: '2026-04-28T10:15:00.000Z',
};

describe('CaseHandoffPacket', () => {
  it('renders transfer context, risks, next actions, visibility, and artifact counts', () => {
    render(<CaseHandoffPacket data={handoffPacket} />);

    expect(screen.getByRole('heading', { name: /case handoff packet/i })).toBeInTheDocument();
    expect(screen.getByText('CASE-001: Housing Support')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /continuity/i })).toBeInTheDocument();
    expect(screen.getByText('1 reassessment overdue')).toBeInTheDocument();
    expect(screen.getByText('Needs Handoff Review')).toBeInTheDocument();
    expect(screen.getByText('Closure Actions Open')).toBeInTheDocument();
    expect(screen.getByText('Housing review')).toBeInTheDocument();
    expect(screen.getByText('Call landlord')).toBeInTheDocument();
    expect(screen.getByText('Internal Only')).toBeInTheDocument();
    expect(screen.getByText(/keep this packet internal/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /field packet/i })).toBeInTheDocument();
    expect(screen.getByText('No Offline Sync')).toBeInTheDocument();
    expect(screen.getByText('No Site Routing')).toBeInTheDocument();
    expect(screen.getByText('No Referral Transfer')).toBeInTheDocument();
    expect(screen.getByText('Housing navigation')).toBeInTheDocument();
    expect(screen.getByText('Outreach Hub (Community Housing Team)')).toBeInTheDocument();
    expect(screen.getByText('100 Main St, Vancouver, BC, V6B 1A1')).toBeInTheDocument();
    expect(screen.getByText('Housing eligibility review')).toBeInTheDocument();
    expect(screen.getByText('Housing site visit')).toBeInTheDocument();
    expect(screen.getByText('Downtown Clinic')).toBeInTheDocument();
    expect(screen.getByText('200 Care Ave, Vancouver, BC, V6C 2B2')).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera \| Open \| high \| Internal Only/i)).toBeInTheDocument();
    expect(screen.getByText('Casey Client')).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('Services').length).toBeGreaterThan(0);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('opens as a modal and keeps printing as an explicit user action', () => {
    const onClose = vi.fn();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    render(<CaseHandoffModal isOpen onClose={onClose} data={handoffPacket} />);

    fireEvent.click(screen.getByRole('button', { name: /print packet/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });
});
