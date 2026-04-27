export interface CaseHandoffPacket {
  case_details: {
    id: string;
    case_number: string;
    title: string;
    status_name: string;
    status_type: string;
    priority: string;
    is_urgent: boolean;
    description: string | null;
    assigned_staff: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    contact: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
  };
  risks: {
    is_urgent: boolean;
    is_high_priority: boolean;
    overdue_milestones_count: number;
    overdue_follow_ups_count: number;
    risk_summary: string[];
  };
  next_actions: {
    pending_milestones: Array<{
      id: string;
      name: string;
      due_date: string | null;
    }>;
    pending_follow_ups: Array<{
      id: string;
      title: string;
      due_date: string | null;
    }>;
  };
  visibility: {
    client_viewable: boolean;
    portal_visibility_status: string;
  };
  artifacts_summary: {
    services_count: number;
    forms_count: number;
    appointments_count: number;
    notes_count: number;
    documents_count: number;
  };
  generated_at: string;
}
