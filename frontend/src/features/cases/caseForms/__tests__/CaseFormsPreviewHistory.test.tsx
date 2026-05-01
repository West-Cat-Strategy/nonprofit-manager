import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseFormsPreviewHistory } from '../CaseFormsPreviewHistory';
import type { CaseFormAssignmentDetail, CaseFormSchema } from '../../../../types/caseForms';

const schema: CaseFormSchema = {
  version: 1,
  title: 'Intake form',
  sections: [],
};

const makeDetail = (overrides: Partial<CaseFormAssignmentDetail> = {}): CaseFormAssignmentDetail => ({
  assignment: {
    id: 'assignment-1',
    case_id: 'case-1',
    contact_id: 'contact-1',
    title: 'Intake form',
    status: 'submitted',
    schema,
    created_at: '2026-04-01T12:00:00.000Z',
    updated_at: '2026-04-01T12:00:00.000Z',
  },
  submissions: [],
  ...overrides,
});

const renderPreviewHistory = (detail: CaseFormAssignmentDetail) =>
  render(
    <CaseFormsPreviewHistory
      assets={[]}
      detail={detail}
      draftAnswers={{}}
      editorDescription=""
      editorSchema={schema}
      editorTitle="Intake form"
      onAnswerChange={vi.fn()}
      onUploadAsset={vi.fn()}
    />
  );

describe('CaseFormsPreviewHistory', () => {
  it('renders staff evidence events when the staff detail response includes them', () => {
    renderPreviewHistory(
      makeDetail({
        evidence_events: [
          {
            id: 'event-1',
            assignment_id: 'assignment-1',
            case_id: 'case-1',
            contact_id: 'contact-1',
            event_type: 'submission_recorded',
            actor_type: 'portal',
            actor_user_id: null,
            actor_portal_user_id: 'portal-user-1',
            submission_id: 'submission-1',
            metadata: {
              submission_id: 'submission-1',
              submission_number: 1,
              mapped_field_count: 2,
              selected_asset_count: 0,
            },
            created_at: '2026-04-16T12:30:00.000Z',
          },
          {
            id: 'event-2',
            assignment_id: 'assignment-1',
            case_id: 'case-1',
            contact_id: 'contact-1',
            event_type: 'reviewed',
            actor_type: 'staff',
            actor_user_id: 'staff-1',
            actor_portal_user_id: null,
            submission_id: null,
            metadata: {
              decision: 'reviewed',
              notes_character_count: 23,
            },
            created_at: '2026-04-16T13:30:00.000Z',
          },
        ],
      })
    );

    expect(screen.getByText('Evidence Events')).toBeInTheDocument();
    expect(screen.getByText('Submission recorded')).toBeInTheDocument();
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
    expect(screen.getByText(/2 mapped fields/)).toBeInTheDocument();
    expect(screen.getByText(/Decision: reviewed/)).toBeInTheDocument();
  });

  it('does not render the evidence timeline when the response omits it', () => {
    renderPreviewHistory(makeDetail());

    expect(screen.queryByText('Evidence Events')).not.toBeInTheDocument();
  });
});
