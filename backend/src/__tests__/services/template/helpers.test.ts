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

    expect(withNewsletters).toHaveLength(5);
    expect(withNewsletters.map((page) => page.slug)).toEqual(
      expect.arrayContaining(['events', 'event-detail', 'whats-happening'])
    );

    const eventsPage = withNewsletters.find((page) => page.slug === 'events');
    const eventDetailPage = withNewsletters.find(
      (page) => page.pageType === 'collectionDetail' && page.collection === 'events'
    );
    const newsPage = withNewsletters.find((page) => page.slug === 'whats-happening');
    const newsDetailPage = withNewsletters.find(
      (page) => page.pageType === 'collectionDetail' && page.collection === 'newsletters'
    );

    expect(eventsPage).toMatchObject({
      collection: 'events',
      routePattern: '/events',
    });
    expect(eventDetailPage).toMatchObject({
      collection: 'events',
      routePattern: '/events/:slug',
    });
    expect(
      eventDetailPage?.sections.flatMap((section) =>
        section.components.map((component) => component.type)
      )
    ).toEqual(expect.arrayContaining(['event-detail', 'event-registration']));
    expect(newsPage).toMatchObject({
      collection: 'newsletters',
      routePattern: '/whats-happening',
    });
    expect(newsDetailPage).toMatchObject({
      collection: 'newsletters',
      routePattern: '/whats-happening/:slug',
    });
  });

  it('adds the event detail fallback when a template only has an event index', () => {
    const pages: TemplatePage[] = [
      ...basePages,
      {
        id: 'events',
        name: 'Events',
        slug: 'events',
        isHomepage: false,
        pageType: 'collectionIndex',
        collection: 'events',
        routePattern: '/events',
        seo: {
          title: 'Events',
          description: 'Upcoming events',
        },
        sections: [],
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const result = ensureEventsPage(pages, 'template-1');

    expect(result).toHaveLength(3);
    expect(result.filter((page) => page.pageType === 'collectionIndex' && page.collection === 'events')).toHaveLength(1);
    expect(result.filter((page) => page.pageType === 'collectionDetail' && page.collection === 'events')).toHaveLength(1);
  });

  it('does not add a duplicate event index fallback when a static events page already owns /events', () => {
    const pages: TemplatePage[] = [
      ...basePages,
      {
        id: 'static-events',
        name: 'Events',
        slug: 'events',
        isHomepage: false,
        pageType: 'static',
        routePattern: '/events',
        seo: {
          title: 'Events',
          description: 'Program events',
        },
        sections: [],
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const result = ensureEventsPage(pages, 'template-1');

    expect(result.filter((page) => page.routePattern === '/events')).toHaveLength(1);
    expect(result.filter((page) => page.pageType === 'collectionIndex' && page.collection === 'events')).toHaveLength(0);
    expect(result.filter((page) => page.pageType === 'collectionDetail' && page.collection === 'events')).toHaveLength(1);
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
