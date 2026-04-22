import {
  renderMailchimpCampaignPreview,
  resolveMailchimpCampaignContent,
} from '@services/template/emailCampaignRenderer';

describe('emailCampaignRenderer', () => {
  it('renders builder blocks into preview html and plain text', () => {
    const preview = renderMailchimpCampaignPreview({
      listId: 'list-1',
      title: 'Spring appeal',
      subject: 'Spring Appeal',
      previewText: 'Support this month’s work',
      fromName: 'Community Org',
      replyTo: 'hello@example.org',
      builderContent: {
        accentColor: '#1d4ed8',
        footerText: 'You received this email because you support Community Org.',
        blocks: [
          { id: 'heading-1', type: 'heading', content: 'Spring Appeal', level: 1 },
          {
            id: 'paragraph-1',
            type: 'paragraph',
            content: 'Help us expand food access this season.',
          },
          {
            id: 'button-1',
            type: 'button',
            label: 'Donate now',
            url: 'https://example.org/donate',
          },
        ],
      },
    });

    expect(preview.html).toContain('Spring Appeal');
    expect(preview.html).toContain('Donate now');
    expect(preview.html).toContain('#1d4ed8');
    expect(preview.plainText).toContain('Help us expand food access this season.');
    expect(preview.warnings).toEqual([]);
  });

  it('sanitizes raw html content and derives plain text when needed', () => {
    const resolved = resolveMailchimpCampaignContent({
      listId: 'list-1',
      title: 'Unsafe html',
      subject: 'Unsafe html',
      fromName: 'Community Org',
      replyTo: 'hello@example.org',
      htmlContent:
        '<h1>Heading</h1><script>alert(1)</script><p>Body copy</p><form><input /></form>',
    });

    expect(resolved.html).toContain('Heading');
    expect(resolved.html).toContain('Body copy');
    expect(resolved.html).not.toContain('<script');
    expect(resolved.html).not.toContain('<form');
    expect(resolved.plainText).toContain('Heading');
    expect(resolved.plainText).toContain('Body copy');
  });

  it('drops unsafe builder urls and reports warnings', () => {
    const preview = renderMailchimpCampaignPreview({
      listId: 'list-1',
      title: 'Unsafe link',
      subject: 'Unsafe link',
      fromName: 'Community Org',
      replyTo: 'hello@example.org',
      builderContent: {
        blocks: [
          {
            id: 'button-1',
            type: 'button',
            label: 'Open',
            url: 'javascript:alert(1)',
          },
          {
            id: 'image-1',
            type: 'image',
            src: 'data:text/html;base64,abc',
            alt: 'Bad image',
          },
        ],
      },
    });

    expect(preview.html).not.toContain('javascript:alert');
    expect(preview.html).not.toContain('data:text/html');
    expect(preview.warnings).toHaveLength(2);
  });
});
