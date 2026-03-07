import { FormRegistryService } from '@services/publishing/formRegistryService';
import type { TemplatePage } from '@app-types/websiteBuilder';
import type { WebsiteSiteSettings } from '@app-types/publishing';

describe('FormRegistryService', () => {
  const service = new FormRegistryService();

  const settings: WebsiteSiteSettings = {
    siteId: 'site-1',
    organizationId: 'org-1',
    mailchimp: {},
    stripe: {},
    formDefaults: {
      successMessage: 'Default success',
      trackingEnabled: true,
    },
    formOverrides: {
      'newsletter-1': {
        buttonText: 'Join the list',
        mailchimpListId: 'list-42',
      },
    },
    conversionTracking: {
      enabled: true,
      events: {
        formSubmit: true,
        donation: true,
        eventRegister: true,
      },
    },
    createdAt: null,
    updatedAt: null,
  };

  const pages: TemplatePage[] = [
    {
      id: 'page-1',
      name: 'Home',
      slug: 'home',
      isHomepage: true,
      pageType: 'static',
      routePattern: '/',
      seo: {
        title: 'Home',
        description: 'Welcome',
      },
      sections: [
        {
          id: 'section-1',
          name: 'Hero',
          components: [
            {
              id: 'columns-1',
              type: 'columns',
              columns: [
                {
                  id: 'column-1',
                  width: '1/2',
                  components: [
                    {
                      id: 'newsletter-1',
                      type: 'newsletter-signup',
                      heading: 'Stay close',
                      buttonText: 'Subscribe',
                    },
                  ],
                },
              ],
            } as never,
          ],
        },
      ],
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
    },
    {
      id: 'page-2',
      name: 'Events',
      slug: 'events',
      isHomepage: false,
      pageType: 'collectionDetail',
      collection: 'events',
      routePattern: '/events/:slug',
      seo: {
        title: 'Events',
        description: 'Event details',
      },
      sections: [
        {
          id: 'section-2',
          name: 'Registration',
          components: [
            {
              id: 'registration-1',
              type: 'event-registration',
              submitText: 'Reserve a spot',
            } as never,
          ],
        },
      ],
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
    },
  ];

  it('extracts connected forms from nested component trees and applies override precedence', () => {
    const definitions = service.extract(
      pages,
      settings,
      [
        {
          id: 'page-1',
          name: 'Home',
          slug: 'home',
          isHomepage: true,
          pageType: 'static',
          routePattern: '/',
          sections: [],
          seo: {},
        },
      ]
    );

    expect(definitions).toHaveLength(2);
    expect(definitions[0]).toMatchObject({
      formKey: 'newsletter-1',
      formType: 'newsletter-signup',
      path: '/',
      live: true,
      title: 'Stay close',
    });
    expect(definitions[0]?.operationalSettings).toMatchObject({
      successMessage: 'Default success',
      buttonText: 'Join the list',
      mailchimpListId: 'list-42',
      trackingEnabled: true,
    });
    expect(definitions[1]).toMatchObject({
      formKey: 'registration-1',
      formType: 'event-registration',
      path: '/events/:slug',
      live: false,
    });
  });
});
