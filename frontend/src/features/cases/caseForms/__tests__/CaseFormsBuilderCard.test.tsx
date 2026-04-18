import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CaseFormsBuilderCard } from '../CaseFormsBuilderCard';
import type { CaseFormAssignmentDetail, CaseFormSchema } from '../../../../types/caseForms';

const baseSchema: CaseFormSchema = {
  version: 1,
  title: 'Intake form',
  sections: [
    {
      id: 'section-1',
      title: 'Section 1',
      questions: [
        {
          id: 'question-1',
          key: 'question_1',
          type: 'text',
          label: 'Question 1',
          placeholder: '',
        },
      ],
    },
  ],
};

const detail: CaseFormAssignmentDetail = {
  assignment: {
    id: 'assignment-1',
    case_id: 'case-1',
    contact_id: 'contact-1',
    title: 'Intake form',
    status: 'draft',
    schema: baseSchema,
    created_at: '2026-04-01T12:00:00.000Z',
    updated_at: '2026-04-01T12:00:00.000Z',
  },
  submissions: [],
};

function BuilderHarness() {
  const [schema, setSchema] = useState<CaseFormSchema>(baseSchema);

  return (
    <CaseFormsBuilderCard
      detail={detail}
      editorDescription=""
      editorDueAt=""
      editorRecipientEmail=""
      editorSchema={schema}
      editorTitle="Intake form"
      logicDrafts={{}}
      saving={false}
      sendExpiryDays="7"
      onSaveStructure={vi.fn()}
      onSchemaChange={setSchema}
      setEditorDescription={vi.fn()}
      setEditorDueAt={vi.fn()}
      setEditorRecipientEmail={vi.fn()}
      setEditorTitle={vi.fn()}
      setLogicDrafts={vi.fn()}
      setSendExpiryDays={vi.fn()}
    />
  );
}

describe('CaseFormsBuilderCard', () => {
  it('relabels and seeds single-checkbox placeholder text', async () => {
    const user = userEvent.setup();

    render(<BuilderHarness />);

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'checkbox');

    expect(screen.getByText('Checkbox Text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('I agree')).toBeInTheDocument();
  });
});
