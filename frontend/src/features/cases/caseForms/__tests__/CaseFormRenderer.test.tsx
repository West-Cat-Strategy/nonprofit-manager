import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CaseFormRenderer from '../CaseFormRenderer';

describe('CaseFormRenderer', () => {
  it('associates dynamic controls with visible labels and helper text', () => {
    render(
      <CaseFormRenderer
        variant="public"
        schema={{
          version: 1,
          title: 'Secure Intake Form',
          sections: [
            {
              id: 'section-contact',
              title: 'Contact details',
              questions: [
                {
                  id: 'question-first-name',
                  key: 'first_name',
                  type: 'text',
                  label: 'First name',
                  helper_text: 'Use the name shown on your ID.',
                },
                {
                  id: 'question-summary',
                  key: 'summary',
                  type: 'textarea',
                  label: 'Summary',
                },
                {
                  id: 'question-contact-method',
                  key: 'contact_method',
                  type: 'select',
                  label: 'Preferred contact method',
                  options: [
                    { label: 'Email', value: 'email' },
                    { label: 'Phone', value: 'phone' },
                  ],
                },
                {
                  id: 'question-documents',
                  key: 'documents',
                  type: 'file',
                  label: 'Supporting documents',
                  helper_text: 'Upload PDFs only.',
                  upload_config: {
                    accept: ['application/pdf'],
                  },
                },
                {
                  id: 'question-consent',
                  key: 'consent',
                  type: 'checkbox',
                  label: 'Consent to share updates',
                  placeholder: 'I agree',
                },
              ],
            },
          ],
        }}
        answers={{}}
        onAnswerChange={vi.fn()}
      />
    );

    const firstNameInput = screen.getByLabelText(/first name/i);
    expect(firstNameInput).toHaveAttribute('aria-describedby');
    expect(screen.getByText(/use the name shown on your id/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred contact method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/supporting documents/i)).toHaveAttribute('type', 'file');
    expect(screen.getByRole('checkbox', { name: /consent to share updates/i })).toBeInTheDocument();
  });
});
