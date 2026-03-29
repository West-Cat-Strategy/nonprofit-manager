import { generateSectionHtml } from '../../../services/site-generator';
import type { PublishedSection, PublishedTheme } from '../../../types/publishing';

const theme: PublishedTheme = {
  colors: {
    primary: '#1e40af',
    secondary: '#0f766e',
    accent: '#f59e0b',
    background: '#ffffff',
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
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.15)',
  },
};

describe('componentRenderer.generateSectionHtml', () => {
  it('renders a section with primitive/media/form components', () => {
    const section: PublishedSection = {
      id: 's1',
      name: 'Hero',
      maxWidth: '960px',
      backgroundColor: '#fff',
      components: [
        { id: 'c1', type: 'heading', content: 'Welcome', level: 1 },
        { id: 'c2', type: 'button', text: 'Donate', url: '/donate', variant: 'primary' },
        { id: 'c3', type: 'video', src: 'https://youtu.be/abc123', provider: 'youtube' },
        { id: 'c4', type: 'newsletter-signup', buttonText: 'Join' },
        { id: 'c5', type: 'event-list', maxEvents: 4, layout: 'grid' },
      ],
    };

    const html = generateSectionHtml(section, theme);

    expect(html).toContain('section class="site-section"');
    expect(html).toContain('max-width: 960px');
    expect(html).toContain('<h1');
    expect(html).toContain('>Donate<');
    expect(html).toContain('youtube.com/embed/abc123');
    expect(html).toContain('newsletter-form');
    expect(html).toContain('data-event-list="true"');
  });

  it('renders unknown components as html comments', () => {
    const section: PublishedSection = {
      id: 's2',
      name: 'Unknown',
      components: [{ id: 'x', type: 'unknown-widget' }],
    };

    const html = generateSectionHtml(section, theme);
    expect(html).toContain('Unknown component type: unknown-widget');
  });

  it('escapes user content in rendered components', () => {
    const section: PublishedSection = {
      id: 's3',
      name: 'Escaping',
      components: [
        { id: 'c1', type: 'heading', content: '<script>alert(1)</script>' },
        { id: 'c2', type: 'social-links', links: [{ platform: 'email', url: 'https://example.org?a=<x>' }] },
      ],
    };

    const html = generateSectionHtml(section, theme);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('https://example.org?a=%3Cx%3E');
  });

  it('renders the richer nonprofit builder blocks used by the starter template', () => {
    const section: PublishedSection = {
      id: 's4',
      name: 'Rich Blocks',
      components: [
        {
          id: 'hero',
          type: 'hero',
          backgroundImage: 'https://example.org/hero.jpg',
          components: [
            { id: 'hero-heading', type: 'heading', content: 'Hero title', level: 1 },
          ],
        },
        {
          id: 'columns',
          type: 'columns',
          columns: [
            {
              id: 'col-1',
              width: '2/3',
              components: [
                { id: 'card-1', type: 'card', title: 'Card title', content: 'Card copy', link: '/learn-more', linkText: 'Learn more' },
              ],
            },
            {
              id: 'col-2',
              width: '1/3',
              components: [
                { id: 'map-1', type: 'map', address: '400 West Georgia Street, Vancouver, BC V6B 1A1', height: '280px' },
              ],
            },
          ],
        },
        {
          id: 'pricing',
          type: 'pricing',
          tiers: [
            { id: 'tier-1', name: 'One', price: '$10', features: ['First'], buttonText: 'Choose', buttonLink: '/donate' },
          ],
        },
        {
          id: 'faq',
          type: 'faq',
          items: [{ id: 'faq-1', question: 'Question?', answer: 'Answer.' }],
          expandFirst: true,
        },
        {
          id: 'team',
          type: 'team',
          members: [{ id: 'member-1', name: 'Taylor', role: 'Director', bio: 'Leads the team.' }],
        },
        {
          id: 'logos',
          type: 'logo-grid',
          logos: [{ id: 'logo-1', src: 'https://example.org/logo.png', alt: 'Logo' }],
        },
      ],
    };

    const html = generateSectionHtml(section, theme);

    expect(html).toContain('hero-component');
    expect(html).toContain('card-component');
    expect(html).toContain('map-component');
    expect(html).toContain('pricing-grid');
    expect(html).toContain('faq-list');
    expect(html).toContain('team-grid');
    expect(html).toContain('logo-grid');
    expect(html).toContain('data-track-click="true"');
  });
});
