import type { PublishedContent, PublishedPage, PublishedTheme } from '../../../types/publishing';
import { renderPageHtml } from '../../../services/site-generator';

const theme: PublishedTheme = {
  colors: {
    primary: '#2563eb', secondary: '#0f766e', accent: '#f59e0b', background: '#fff', surface: '#f8fafc',
    text: '#111827', textMuted: '#6b7280', border: '#e5e7eb', error: '#dc2626', success: '#16a34a', warning: '#d97706',
  },
  typography: {
    fontFamily: 'Inter, sans-serif', headingFontFamily: 'Merriweather, serif', baseFontSize: '16px', lineHeight: '1.5',
    headingLineHeight: '1.25', fontWeightNormal: 400, fontWeightMedium: 500, fontWeightBold: 700,
  },
  borderRadius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.15)' },
};

describe('pageRenderer.renderPageHtml', () => {
  it('builds a complete page document with nav/main/footer and analytics blocks', () => {
    const page: PublishedPage = {
      id: 'p1',
      slug: 'home',
      name: 'Home',
      isHomepage: true,
      seo: { title: 'Home Title' },
      sections: [{ id: 's1', name: 'Hero', components: [{ id: 'c1', type: 'heading', content: 'Welcome' }] }],
    };

    const content: PublishedContent = {
      templateId: 'tpl_123',
      templateName: 'Template',
      theme,
      pages: [page],
      navigation: { style: 'horizontal', sticky: true, transparent: false, items: [{ id: 'n1', label: 'Home', url: '/' }] },
      footer: { columns: [], copyright: 'Copyright' },
      seoDefaults: { title: 'Default', description: 'Default desc', googleAnalyticsId: 'G-TEST' },
      publishedAt: '2026-02-12T00:00:00Z',
      version: '1',
    };

    const html = renderPageHtml(page, content, 'body { color: red; }');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<nav class="site-nav');
    expect(html).toContain('<main>');
    expect(html).toContain('<footer class="site-footer"');
    expect(html).toContain('gtag/js?id=G-TEST');
    expect(html).toContain("/api/sites/' + siteId + '/track");
    expect(html).toContain('tpl_123');
    expect(html).toContain('body { color: red; }');
    expect(html).toContain('Welcome');
  });
});
