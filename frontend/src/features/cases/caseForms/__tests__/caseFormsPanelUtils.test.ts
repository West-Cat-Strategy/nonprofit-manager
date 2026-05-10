import { describe, expect, it } from 'vitest';
import type { CaseFormSchema } from '../../../../types/caseForms';
import { collectCaseFormAuthoringDiagnostics } from '../caseFormsPanelUtils';

describe('collectCaseFormAuthoringDiagnostics', () => {
  it('reports local builder diagnostics for risky authoring states', () => {
    const schema: CaseFormSchema = {
      version: 1,
      title: 'Intake form',
      sections: [
        {
          id: 'section-1',
          title: 'Section 1',
          questions: [
            {
              id: 'blank-key',
              key: ' ',
              type: 'text',
              label: 'Blank key',
            },
            {
              id: 'duplicate-1',
              key: 'duplicate',
              type: 'text',
              label: 'Duplicate one',
            },
            {
              id: 'duplicate-2',
              key: 'duplicate',
              type: 'radio',
              label: 'Duplicate two',
              options: [],
              mapping_target: {
                entity: 'contact',
                field: '',
              },
            },
            {
              id: 'case-mapping',
              key: 'case_mapping',
              type: 'text',
              label: 'Case mapping',
              mapping_target: {
                entity: 'case',
                container: 'intake_data',
                key: '',
              },
            },
            {
              id: 'upload',
              key: 'upload',
              type: 'file',
              label: 'Upload',
              upload_config: {
                accept: ['image/png', 'pdf'],
              },
            },
            {
              id: 'missing-reference',
              key: 'visible_question',
              type: 'text',
              label: 'Conditional question',
              visible_when: [
                {
                  question_key: 'does_not_exist',
                  operator: 'equals',
                  value: 'yes',
                },
              ],
            },
          ],
        },
      ],
    };

    const messages = collectCaseFormAuthoringDiagnostics(schema, {
      upload: '{not valid json',
    }).map((diagnostic) => diagnostic.message);

    expect(messages).toEqual(
      expect.arrayContaining([
        'Blank key: add a question key before saving.',
        'Duplicate one: question key "duplicate" is used more than once.',
        'Duplicate two: question key "duplicate" is used more than once.',
        'Duplicate two: add at least one option with a label and value.',
        'Duplicate two: choose a contact field or remove the mapping.',
        'Case mapping: add a case JSON key or remove the mapping.',
        'Upload: "pdf" is not a valid MIME type.',
        'Upload: fix conditional visibility JSON.',
        'Conditional question: conditional rule references missing question key "does_not_exist".',
      ])
    );
  });

  it('allows single-checkbox questions without options while still warning for multi-checkbox questions', () => {
    const schema: CaseFormSchema = {
      version: 1,
      title: 'Consent form',
      sections: [
        {
          id: 'section-1',
          title: 'Section 1',
          questions: [
            {
              id: 'single-checkbox',
              key: 'consent',
              type: 'checkbox',
              label: 'Consent',
              placeholder: 'I agree',
            },
            {
              id: 'multi-checkbox',
              key: 'support_needs',
              type: 'checkbox',
              label: 'Support needs',
              multiple: true,
              options: [],
            },
          ],
        },
      ],
    };

    const messages = collectCaseFormAuthoringDiagnostics(schema).map(
      (diagnostic) => diagnostic.message
    );

    expect(messages).not.toContain('Consent: add at least one option with a label and value.');
    expect(messages).toContain('Support needs: add at least one option with a label and value.');
  });
});
