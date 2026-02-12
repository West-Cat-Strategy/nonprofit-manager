import {
  generateFooterHtml,
  generateGoogleAnalyticsScript,
  generateNavigationHtml,
} from '../../../services/site-generator';

describe('layoutRenderer', () => {
  it('generates Google Analytics script with escaped id', () => {
    const script = generateGoogleAnalyticsScript('G-AB<C>');
    expect(script).toContain('googletagmanager.com/gtag/js?id=G-AB&lt;C&gt;');
    expect(script).toContain("gtag('config', 'G-AB&lt;C&gt;')");
  });

  it('renders navigation with dropdowns and link targets', () => {
    const html = generateNavigationHtml({
      templateId: 't1',
      templateName: 'Template',
      theme: {} as never,
      pages: [],
      navigation: {
        style: 'horizontal',
        sticky: true,
        transparent: false,
        items: [
          { id: '1', label: 'Home', url: '/' },
          {
            id: '2',
            label: 'More',
            url: '/more',
            children: [{ id: '2-1', label: 'Blog', url: '/blog', openInNewTab: true }],
          },
        ],
      },
      footer: { columns: [], copyright: 'c' },
      seoDefaults: { title: 's', description: 'd' },
      publishedAt: 'now',
      version: '1',
    });

    expect(html).toContain('site-nav nav--sticky');
    expect(html).toContain('nav-item--dropdown');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  });

  it('renders footer with social, newsletter and escaped content', () => {
    const html = generateFooterHtml({
      templateId: 't1',
      templateName: 'Template',
      theme: {} as never,
      pages: [],
      navigation: { style: 'horizontal', sticky: false, transparent: false, items: [] },
      footer: {
        columns: [{ id: 'c1', title: 'About <Us>', links: [{ id: 'l1', label: 'Docs', url: '/docs' }] }],
        copyright: 'Copyright "Org"',
        socialLinks: [{ platform: 'twitter', url: 'https://x.com/example' }],
        showNewsletter: true,
      },
      seoDefaults: { title: 's', description: 'd' },
      publishedAt: 'now',
      version: '1',
    });

    expect(html).toContain('About &lt;Us&gt;');
    expect(html).toContain('https://x.com/example');
    expect(html).toContain('footer-newsletter');
    expect(html).toContain('Copyright &quot;Org&quot;');
  });
});
