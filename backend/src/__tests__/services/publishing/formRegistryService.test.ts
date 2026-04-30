import { FormRegistryService } from '@services/publishing/formRegistryService';
import type { ComponentType, TemplatePage } from '@app-types/websiteBuilder';
import type { WebsiteManagedFormType, WebsiteSiteSettings } from '@app-types/publishing';

const managedFormContractSmoke: Record<
  WebsiteManagedFormType,
  Extract<ComponentType, WebsiteManagedFormType>
> = {
  'contact-form': 'contact-form',
  'newsletter-signup': 'newsletter-signup',
  'donation-form': 'donation-form',
  'volunteer-interest-form': 'volunteer-interest-form',
  'referral-form': 'referral-form',
  'event-registration': 'event-registration',
};

describe('FormRegistryService', () => {
  const service = new FormRegistryService();

  const settings: WebsiteSiteSettings = {
    siteId: 'site-1',
    organizationId: 'org-1',
    newsletter: {
      provider: 'mautic',
    },
    mailchimp: {},
    mautic: {},
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
            {
              id: 'referral-1',
              type: 'referral-form',
              heading: 'Send a referral',
              description: 'Create an intake record.',
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
    {
      id: 'page-3',
      name: 'Volunteer',
      slug: 'volunteer',
      isHomepage: false,
      pageType: 'static',
      routePattern: '/volunteer',
      seo: {
        title: 'Volunteer',
        description: 'Join the mission',
      },
      sections: [
        {
          id: 'section-3',
          name: 'Volunteer CTA',
          components: [
            {
              id: 'volunteer-1',
              type: 'volunteer-interest-form',
              heading: 'Volunteer with us',
              submitText: 'Share your interest',
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
      ],
      false,
      {
        siteKey: 'site-1',
        liveBaseUrl: 'https://public.example.org',
        livePreviewBaseUrl: 'https://public.example.org?preview=true&version=v-live-1',
        previewBaseUrl: 'https://public.example.org?preview=true&version=preview-v-1',
      }
    );

    expect(definitions).toHaveLength(4);
    expect(definitions[0]).toMatchObject({
      formKey: 'newsletter-1',
      formType: 'newsletter-signup',
      path: '/',
      live: true,
      title: 'Stay close',
      publicRuntime: {
        siteKey: 'site-1',
        publicPath: '/',
        publicUrl: 'https://public.example.org',
        previewUrl: 'https://public.example.org?preview=true&version=preview-v-1',
        submissionPath: '/api/v2/public/forms/site-1/newsletter-1/submit',
      },
    });
    expect(definitions[0]?.operationalSettings).toMatchObject({
      successMessage: 'Default success',
      buttonText: 'Join the list',
      mailchimpListId: 'list-42',
      trackingEnabled: true,
    });
    expect(definitions[1]).toMatchObject({
      formKey: 'referral-1',
      formType: 'referral-form',
      path: '/',
      live: true,
      title: 'Send a referral',
    });
    expect(definitions[2]).toMatchObject({
      formKey: 'registration-1',
      formType: 'event-registration',
      path: '/events/:slug',
      live: false,
      publicRuntime: {
        siteKey: 'site-1',
        publicPath: '/events/:slug',
        publicUrl: null,
        previewUrl: null,
        submissionPath: '/api/v2/public/events/:event_id/registrations?site=site-1',
      },
    });
    expect(definitions[3]).toMatchObject({
      formKey: 'volunteer-1',
      formType: 'volunteer-interest-form',
      path: '/volunteer',
      live: false,
      publicRuntime: {
        siteKey: 'site-1',
        publicPath: '/volunteer',
        publicUrl: null,
        previewUrl: 'https://public.example.org/volunteer?preview=true&version=preview-v-1',
        submissionPath: '/api/v2/public/forms/site-1/volunteer-1/submit',
      },
    });
  });

  it('keeps managed-form publishing types aligned with the website-builder component contract', () => {
    expect(Object.keys(managedFormContractSmoke)).toEqual([
      'contact-form',
      'newsletter-signup',
      'donation-form',
      'volunteer-interest-form',
      'referral-form',
      'event-registration',
    ]);
  });
});
