export interface Committee {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  committee_id: string | null;
  meeting_type: 'board' | 'agm' | 'committee';
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  presiding_contact_id: string | null;
  secretary_contact_id: string | null;
  minutes_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingAgendaItem {
  id: string;
  meeting_id: string;
  position: number;
  title: string;
  description: string | null;
  item_type: 'discussion' | 'motion' | 'report' | 'other';
  duration_minutes: number | null;
  presenter_contact_id: string | null;
  status: 'planned' | 'discussed' | 'deferred';
  created_at: string;
  updated_at: string;
}

export interface MeetingMotion {
  id: string;
  meeting_id: string;
  agenda_item_id: string | null;
  parent_motion_id: string | null;
  text: string;
  moved_by_contact_id: string | null;
  seconded_by_contact_id: string | null;
  status: 'pending' | 'passed' | 'failed' | 'amended' | 'withdrawn';
  votes_for: number | null;
  votes_against: number | null;
  votes_abstain: number | null;
  result_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingActionItem {
  id: string;
  meeting_id: string;
  motion_id: string | null;
  subject: string;
  description: string | null;
  assigned_contact_id: string | null;
  due_date: string | null;
  status: 'open' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface MeetingDetail {
  meeting: Meeting;
  committee: Committee | null;
  agenda_items: MeetingAgendaItem[];
  motions: MeetingMotion[];
  action_items: MeetingActionItem[];
}

