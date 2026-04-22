import type { EmailBuilderContent } from '../../../types/mailchimp';

export const createDefaultEmailBuilderContent = (): EmailBuilderContent => ({
  accentColor: '#0f766e',
  footerText: 'You are receiving this message because you opted in to updates.',
  blocks: [
    {
      id: 'heading-default',
      type: 'heading',
      content: 'Campaign headline',
      level: 1,
    },
    {
      id: 'paragraph-default',
      type: 'paragraph',
      content:
        'Use this guided builder for a staff-friendly message draft, then preview the exact HTML before saving it to Mailchimp.',
    },
    {
      id: 'button-default',
      type: 'button',
      label: 'Primary action',
      url: 'https://example.org',
    },
  ],
});
