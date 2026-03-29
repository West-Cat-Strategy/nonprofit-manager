import { ensureEventsPage, ensureNewslettersPage } from '@services/template/helpers';
import type { TemplatePage } from '@app-types/websiteBuilder';

describe('template helpers', () => {
  const basePages: TemplatePage[] = [
    {
      id: 'home',
      name: 'Home',
      slug: 'home',
      isHomepage: true,
      pageType: 'static',
      routePattern: '/',
      seo: {
        title: 'Home',
        description: 'Welcome',
      },
      sections: [],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  it('adds both event and newsletter fallbacks when a template has neither collection page', () => {
    const withEvents = ensureEventsPage(basePages, 'template-1');
    const withNewsletters = ensureNewslettersPage(withEvents, 'template-1');

    expect(withNewsletters).toHaveLength(4);
    expect(withNewsletters.map((page) => page.slug)).toEqual(
      expect.arrayContaining(['events', 'whats-happening'])
    );

    const newsPage = withNewsletters.find((page) => page.slug === 'whats-happening');
    const newsDetailPage = withNewsletters.find((page) => page.pageType === 'collectionDetail');

    expect(newsPage).toMatchObject({
      collection: 'newsletters',
      routePattern: '/whats-happening',
    });
    expect(newsDetailPage).toMatchObject({
      collection: 'newsletters',
      routePattern: '/whats-happening/:slug',
    });
  });

  it('does not add duplicate newsletter fallbacks when the template already has one', () => {
    const pages: TemplatePage[] = [
      ...basePages,
      {
        id: 'news',
        name: 'What\'s Happening',
        slug: 'whats-happening',
        isHomepage: false,
        pageType: 'collectionIndex',
        collection: 'newsletters',
        routePattern: '/whats-happening',
        seo: {
          title: 'What\'s Happening',
          description: 'Updates',
        },
        sections: [],
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const result = ensureNewslettersPage(pages, 'template-1');

    expect(result).toHaveLength(3);
    expect(result.filter((page) => page.pageType === 'collectionIndex' && page.collection === 'newsletters')).toHaveLength(1);
    expect(result.filter((page) => page.pageType === 'collectionDetail' && page.collection === 'newsletters')).toHaveLength(1);
  });
});
