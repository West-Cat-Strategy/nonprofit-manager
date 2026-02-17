/**
 * Saved Report Types
 * Frontend type definitions for saved report management
 */

import type { ReportDefinition, ReportEntity } from './report';

export interface ShareSettings {
  can_edit: boolean;
  expires_at?: string;
}

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  entity: ReportEntity;
  report_definition: ReportDefinition;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  shared_with_users?: string[];
  shared_with_roles?: string[];
  public_token?: string;
  share_settings?: ShareSettings;
}

export interface CreateSavedReportRequest {
  name: string;
  description?: string;
  entity: ReportEntity;
  report_definition: ReportDefinition;
  is_public?: boolean;
}

export interface UpdateSavedReportRequest {
  name?: string;
  description?: string;
  report_definition?: ReportDefinition;
  is_public?: boolean;
}
