export interface PortalThreadSummary {
  id: string;
  contact_id: string;
  case_id: string | null;
  portal_user_id: string;
  pointperson_user_id: string | null;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  case_number: string | null;
  case_title: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  pointperson_email: string | null;
  portal_email: string | null;
  unread_count: number;
}

export interface PortalMessageEntry {
  id: string;
  thread_id: string;
  sender_type: 'portal' | 'staff' | 'system';
  sender_portal_user_id: string | null;
  sender_user_id: string | null;
  message_text: string;
  is_internal: boolean;
  metadata: Record<string, unknown> | null;
  client_message_id: string | null;
  created_at: string;
  read_by_portal_at: string | null;
  read_by_staff_at: string | null;
  sender_display_name: string | null;
}

export interface ThreadWithMessages {
  thread: PortalThreadSummary;
  messages: PortalMessageEntry[];
}
