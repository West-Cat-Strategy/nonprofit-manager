import type {
  CaseOutcomeEntrySource,
  CaseOutcomeWorkflowStage,
  CaseSourceEntityType,
  NoteType,
} from './case';
import type { InteractionOutcomeImpact } from './outcomes';

/**
 * Case Note
 */
export interface CaseNote {
  id: string;
  case_id: string;
  note_type: NoteType;
  subject?: string | null;
  category?: string | null;
  content: string;
  is_internal: boolean;
  visible_to_client: boolean;
  is_important: boolean;
  previous_status_id?: string | null;
  new_status_id?: string | null;
  attachments?: unknown[] | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  first_name?: string;
  last_name?: string;
  outcome_impacts?: InteractionOutcomeImpact[];
}

export interface CaseOutcomeEvent {
  id: string;
  case_id: string;
  account_id?: string | null;
  outcome_type?: string | null;
  outcome_definition_id?: string | null;
  outcome_definition_key?: string | null;
  outcome_definition_name?: string | null;
  source_interaction_id?: string | null;
  entry_source?: CaseOutcomeEntrySource | null;
  workflow_stage?: CaseOutcomeWorkflowStage | null;
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  outcome_date: string;
  notes?: string | null;
  visible_to_client: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface CaseTopicDefinition {
  id: string;
  account_id?: string | null;
  name: string;
  normalized_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseTopicEvent {
  id: string;
  case_id: string;
  account_id?: string | null;
  topic_definition_id: string;
  topic_name?: string;
  discussed_at: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface CaseDocument {
  id: string;
  case_id: string;
  account_id?: string | null;
  document_name: string;
  file_name?: string | null;
  original_filename?: string | null;
  document_type?: string | null;
  description?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  visible_to_client: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  uploaded_at?: string;
  uploaded_by?: string | null;
  updated_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export type CaseTimelineEventType =
  | 'note'
  | 'outcome'
  | 'topic'
  | 'document'
  | 'appointment'
  | 'conversation'
  | 'follow_up'
  | 'attendance';

export interface CaseTimelineEvent {
  id: string;
  type: CaseTimelineEventType;
  case_id: string;
  created_at: string;
  visible_to_client: boolean;
  title: string;
  content?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface CaseTimelinePage {
  items: CaseTimelineEvent[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}
