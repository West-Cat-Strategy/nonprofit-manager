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
  generated_at: '2026-04-28T10:15:00.000Z',
};

describe('CaseHandoffPacket', () => {
  it('renders transfer context, risks, next actions, visibility, and artifact counts', () => {
    render(<CaseHandoffPacket data={handoffPacket} />);

    expect(screen.getByRole('heading', { name: /case handoff packet/i })).toBeInTheDocument();
    expect(screen.getByText('CASE-001: Housing Support')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Housing review')).toBeInTheDocument();
    expect(screen.getByText('Call landlord')).toBeInTheDocument();
    expect(screen.getByText('Internal Only')).toBeInTheDocument();
    expect(screen.getByText(/keep this packet internal/i)).toBeInTheDocument();
    expect(screen.getByText('Casey Client')).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
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
