export interface CaseServiceSiteSnapshot {
  id: string | null;
  name: string | null;
  provider_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  notes: string | null;
}

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
    closed_date: string | null;
    closure_reason: string | null;
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
  field_packet: {
    scope: {
      summary: string[];
      offline_sync_included: false;
      service_site_routing_included: false;
      referral_transfer_included: false;
      persisted_packet_included: false;
    };
    assignment_context: {
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
      case_status: string;
      priority: string;
      portal_visibility_status: string;
    };
    services: Array<{
      id: string;
      name: string;
      type: string | null;
      provider: string | null;
      service_site_snapshot: CaseServiceSiteSnapshot | null;
      status: string | null;
      service_date: string | null;
      outcome: string | null;
    }>;
    forms: Array<{
      id: string;
      title: string;
      status: string;
      due_at: string | null;
      sent_at: string | null;
      submitted_at: string | null;
      reviewed_at: string | null;
      recipient_email: string | null;
    }>;
    appointments: Array<{
      id: string;
      title: string;
      status: string;
      start_time: string;
      end_time: string | null;
      location: string | null;
      service_site_snapshot: CaseServiceSiteSnapshot | null;
      request_type: string | null;
      pointperson: {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
    }>;
  };
  generated_at: string;
}
