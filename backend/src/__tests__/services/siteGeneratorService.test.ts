import type { PublishedContent, PublishedPage, PublishedTheme } from '../../types/publishing';

jest.mock('../../services/site-generator', () => ({
  generateThemeCSS: jest.fn(() => 'mock-css'),
  renderPageHtml: jest.fn((page: PublishedPage) => `<html>${page.slug}</html>`),
}));

import { generateThemeCSS, renderPageHtml } from '../../services/site-generator';
import { SiteGeneratorService } from '../../services/site-generator.service';

const theme: PublishedTheme = {
  colors: {
    primary: '#2563eb',
    secondary: '#0f766e',
    accent: '#f59e0b',
    background: '#fff',
    surface: '#f8fafc',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    headingFontFamily: 'Merriweather, serif',
    baseFontSize: '16px',
    lineHeight: '1.5',
    headingLineHeight: '1.25',
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  borderRadius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.15)',
  },
};

const pages: PublishedPage[] = [
  {
    id: 'p1',
    slug: 'home',
    name: 'Home',
    isHomepage: true,
    seo: {},
    sections: [],
  },
  {
    id: 'p2',
    slug: 'about',
    name: 'About',
    isHomepage: false,
    seo: {},
    sections: [],
  },
];

const content: PublishedContent = {
  templateId: 'tpl_123',
  templateName: 'Template',
  theme,
  pages,
  navigation: { style: 'horizontal', sticky: true, transparent: false, items: [] },
  footer: { columns: [], copyright: 'Copyright' },
  seoDefaults: { title: 'Default', description: 'Default desc' },
  publishedAt: '2026-02-12T00:00:00Z',
  version: '1',
};

describe('SiteGeneratorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates site pages with a single theme css render', () => {
    const service = new SiteGeneratorService();
    const generated = service.generateSite(content);

    expect(generateThemeCSS).toHaveBeenCalledTimes(1);
    expect(renderPageHtml).toHaveBeenCalledTimes(2);
    expect(generated).toEqual([
      { slug: 'home', html: '<html>home</html>', css: 'mock-css' },
      { slug: 'about', html: '<html>about</html>', css: 'mock-css' },
    ]);
  });

  it('generates a single page with its own css render', () => {
    const service = new SiteGeneratorService();
    const generated = service.generatePage(content.pages[0], content);

    expect(generateThemeCSS).toHaveBeenCalledTimes(1);
    expect(renderPageHtml).toHaveBeenCalledWith(content.pages[0], content, 'mock-css');
    expect(generated).toEqual({ slug: 'home', html: '<html>home</html>', css: 'mock-css' });
  });
});
