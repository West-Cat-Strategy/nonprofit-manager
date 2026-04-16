import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CaseProvenanceSummary from './CaseProvenanceSummary';
import type { CaseProvenance, PortalCaseProvenance } from '../../types/case';

const staffProvenance: CaseProvenance = {
  system: 'imported',
  cluster_id: 'cluster-123',
  primary_label: 'Westcat Intake Cluster',
  record_type: 'case_note',
  source_tables: ['contact_logs', 'case_notes'],
  source_files: ['westcat-export.csv'],
  source_role_breakdown: [
    {
      source_role: 'intake',
      source_tables: ['contact_logs'],
      source_row_count: 2,
      source_row_ids: ['contact_log:1', 'contact_log:2'],
    },
  ],
  participant_ids: ['contact-1', 'contact-2'],
  source_row_ids: ['contact_log:1', 'contact_log:2'],
  source_row_count: 2,
  source_table_count: 2,
  source_file_count: 1,
  source_type_breakdown: ['contact_log', 'case_note'],
  link_confidence: 0.92,
  confidence_label: 'high',
  is_low_confidence: false,
};

const portalProvenance: PortalCaseProvenance = {
  system: 'imported',
  primary_label: 'Client History Summary',
  record_type: 'case_note',
  source_tables: ['contact_logs'],
  source_role_breakdown: [
    {
      source_role: 'intake',
      source_tables: ['contact_logs'],
      source_row_count: 1,
    },
  ],
  source_row_count: 1,
  source_table_count: 1,
  source_file_count: 0,
  source_type_breakdown: ['contact_log'],
  link_confidence: 0.61,
  confidence_label: 'medium',
  is_low_confidence: true,
};

describe('CaseProvenanceSummary', () => {
  it('renders staff provenance details without leaking portal-safe constraints', () => {
    render(<CaseProvenanceSummary provenance={staffProvenance} variant="staff" />);

    expect(screen.getByText('Imported provenance')).toBeInTheDocument();
    expect(screen.getByText('Westcat Intake Cluster')).toBeInTheDocument();
    expect(screen.getByText('cluster-123')).toBeInTheDocument();
    expect(screen.getByText('1 file')).toBeInTheDocument();
    expect(screen.getByText('Linked participants')).toBeInTheDocument();
  });

  it('renders the portal-safe summary without staff-only fields', () => {
    render(<CaseProvenanceSummary provenance={portalProvenance} variant="portal" />);

    expect(screen.getByText('Imported source summary')).toBeInTheDocument();
    expect(screen.getByText('Client History Summary')).toBeInTheDocument();
    expect(screen.queryByText('Cluster')).not.toBeInTheDocument();
    expect(screen.getByText('Review closely')).toBeInTheDocument();
  });

  it('renders empty staff provenance safely in inline mode', () => {
    render(
      <CaseProvenanceSummary
        provenance={{
          ...staffProvenance,
          cluster_id: '',
          source_tables: [],
          source_files: [],
          source_role_breakdown: [],
          participant_ids: [],
          source_row_ids: [],
          source_type_breakdown: [],
          source_row_count: 0,
          source_table_count: 0,
          source_file_count: 0,
          confidence_label: 'unknown',
          is_low_confidence: false,
        }}
        variant="staff"
        density="inline"
      />
    );

    expect(screen.getByText('0 tables')).toBeInTheDocument();
    expect(screen.getByText('0 roles')).toBeInTheDocument();
  });
});
