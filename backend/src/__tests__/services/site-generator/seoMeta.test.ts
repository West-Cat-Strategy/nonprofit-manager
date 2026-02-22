import { buildSeoMeta } from '../../../services/site-generator';

describe('seoMeta.buildSeoMeta', () => {
  it('renders base, OG, Twitter and custom head metadata', () => {
    const html = buildSeoMeta(
      'My Title',
      'My Description',
      {
        title: 'Default Title',
        description: 'Default Description',
        favicon: '/favicon-custom.ico',
        ogImage: 'HTTPS://cdn.example.com/default-og.png',
        customHeadCode: '<meta name="x-custom" content="1">',
      },
      {
        keywords: ['a', 'b'],
        canonicalUrl: 'HTTPS://example.org/page',
      },
      'body { color: red; }',
      '<main>Hello</main>',
      '<script>analytics()</script>'
    );

    expect(html).toContain('<title>My Title</title>');
    expect(html).toContain('name="description" content="My Description"');
    expect(html).toContain('name="keywords" content="a, b"');
    expect(html).toContain('rel="canonical" href="HTTPS://example.org/page"');
    expect(html).toContain('property="og:image" content="HTTPS://cdn.example.com/default-og.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<meta name="x-custom" content="1">');
    expect(html).toContain('<script>analytics()</script>');
    expect(html).toContain('body { color: red; }');
    expect(html).toContain('<main>Hello</main>');
  });

  it('escapes title/description/canonical and supports noindex + page OG override', () => {
    const html = buildSeoMeta(
      'Title <unsafe>',
      'Desc "unsafe"',
      {
        title: 'Default Title',
        description: 'Default Description',
        ogImage: 'HTTPS://cdn.example.com/default-og.png',
      },
      {
        noIndex: true,
        canonicalUrl: 'https://example.org/?x=<y>',
        ogImage: 'HTTPS://cdn.example.com/page-og.png',
      },
      '',
      '<main/>',
      ''
    );

    expect(html).toContain('Title &lt;unsafe&gt;');
    expect(html).toContain('Desc &quot;unsafe&quot;');
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('href="https://example.org/?x=&lt;y&gt;"');
    expect(html).toContain('property="og:image" content="HTTPS://cdn.example.com/page-og.png"');
  });
});
