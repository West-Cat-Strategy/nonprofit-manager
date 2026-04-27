/**
 * Case Closure Types
 */

export interface CaseClosureChecklist {
  id: string;
  organization_id: string;
  case_id: string;
  status_id: string;
  final_summary: string;
  open_follow_ups_resolved: boolean;
  portal_visibility_governance: Record<string, unknown>;
  reassignment_referral_notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface CreateCaseClosureChecklistDTO {
  final_summary: string;
  open_follow_ups_resolved: boolean;
  portal_visibility_governance?: Record<string, unknown>;
  reassignment_referral_notes?: string;
}
