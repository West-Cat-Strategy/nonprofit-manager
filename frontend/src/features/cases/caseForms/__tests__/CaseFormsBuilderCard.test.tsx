import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

function BuilderHarness({
  initialLogicDrafts = {},
  initialSchema = baseSchema,
}: {
  initialLogicDrafts?: Record<string, string>;
  initialSchema?: CaseFormSchema;
}) {
  const [schema, setSchema] = useState<CaseFormSchema>(initialSchema);
  const [logicDrafts, setLogicDrafts] = useState<Record<string, string>>(initialLogicDrafts);

  return (
    <CaseFormsBuilderCard
      detail={detail}
      editorDescription=""
      editorDueAt=""
      editorRecipientEmail=""
      editorRecipientPhone=""
      editorSchema={schema}
      editorTitle="Intake form"
      logicDrafts={logicDrafts}
      saving={false}
      sendExpiryDays="7"
      structureAutosaveStatus="idle"
      onSaveStructure={vi.fn()}
      onSaveAsTemplate={vi.fn()}
      onSchemaChange={setSchema}
      setEditorDescription={vi.fn()}
      setEditorDueAt={vi.fn()}
      setEditorRecipientEmail={vi.fn()}
      setEditorRecipientPhone={vi.fn()}
      setEditorTitle={vi.fn()}
      setLogicDrafts={setLogicDrafts}
      setSendExpiryDays={vi.fn()}
    />
  );
}

describe('CaseFormsBuilderCard', () => {
  it('relabels and seeds single-checkbox placeholder text', () => {
    render(<BuilderHarness />);

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'checkbox' },
    });

    expect(screen.getByText('Checkbox Text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('I agree')).toBeInTheDocument();
  });

  it('shows authoring diagnostic counts and messages without blocking the builder', () => {
    const schemaWithDiagnostics: CaseFormSchema = {
      version: 1,
      title: 'Intake form',
      sections: [
        {
          id: 'section-1',
          title: 'Section 1',
          questions: [
            {
              id: 'question-1',
              key: 'duplicate_key',
              type: 'text',
              label: 'First duplicate',
              placeholder: '',
            },
            {
              id: 'question-2',
              key: 'duplicate_key',
              type: 'select',
              label: 'Second duplicate',
              options: [],
            },
            {
              id: 'question-3',
              key: 'upload_file',
              type: 'file',
              label: 'Upload file',
              upload_config: {
                accept: ['not-a-mime-type'],
              },
            },
          ],
        },
      ],
    };

    render(
      <BuilderHarness
        initialSchema={schemaWithDiagnostics}
        initialLogicDrafts={{
          'question-1': '[{"question_key":"missing_key","operator":"equals","value":"yes"}]',
        }}
      />
    );

    expect(screen.getByText('5 warnings found before save.')).toBeInTheDocument();
    expect(
      screen.getByText(/First duplicate: question key "duplicate_key" is used more than once/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Second duplicate: add at least one option with a label and value/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Upload file: "not-a-mime-type" is not a valid MIME type/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save structure/i })).toBeEnabled();
  });

  it('builds conditional visibility rules with question and operator pickers', () => {
    const schemaWithTwoQuestions: CaseFormSchema = {
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
            {
              id: 'question-2',
              key: 'question_2',
              type: 'text',
              label: 'Question 2',
              placeholder: '',
            },
          ],
        },
      ],
    };

    render(<BuilderHarness initialSchema={schemaWithTwoQuestions} />);

    fireEvent.click(screen.getAllByRole('button', { name: '+ Rule' })[0]);

    expect(screen.getByLabelText('Condition question for Question 1')).toHaveValue('question_2');

    fireEvent.change(screen.getByLabelText('Condition operator for Question 1'), {
      target: { value: 'answered' },
    });

    expect(screen.getByLabelText('Condition value for Question 1')).toBeDisabled();
    expect(screen.getByText('No authoring warnings found.')).toBeInTheDocument();
  });

  it('clears mapping diagnostics through target pickers', () => {
    const schemaWithMappingWarnings: CaseFormSchema = {
      version: 1,
      title: 'Intake form',
      sections: [
        {
          id: 'section-1',
          title: 'Section 1',
          questions: [
            {
              id: 'question-1',
              key: 'applicant_email',
              type: 'email',
              label: 'Applicant email',
              placeholder: '',
              mapping_target: {
                entity: 'contact',
                field: '',
              },
            },
            {
              id: 'question-2',
              key: 'case_need',
              type: 'text',
              label: 'Case need',
              placeholder: '',
              mapping_target: {
                entity: 'case',
                container: 'intake_data',
                key: '',
              },
            },
          ],
        },
      ],
    };

    render(<BuilderHarness initialSchema={schemaWithMappingWarnings} />);

    expect(screen.getByText('2 warnings found before save.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Contact field for Applicant email'), {
      target: { value: 'email' },
    });
    fireEvent.change(screen.getByLabelText('Case field for Case need'), {
      target: { value: 'intake_data:primary_need' },
    });

    expect(screen.getByText('No authoring warnings found.')).toBeInTheDocument();
  });
});
