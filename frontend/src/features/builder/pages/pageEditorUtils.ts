import type {
  ComponentType,
  PageCollectionType,
  PageComponent,
  PageSection,
  TemplatePageType,
} from '../../../types/websiteBuilder';

type ComponentDefaults = {
  [Type in ComponentType]: Omit<Extract<PageComponent, { type: Type }>, 'id'>;
};

export const normalizePageSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const getSectionsSignature = (sections: PageSection[] | undefined): string =>
  JSON.stringify(sections ?? []);

export const normalizeRoutePattern = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '/';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const getDefaultRoutePattern = (
  pageType: TemplatePageType,
  collection: PageCollectionType | undefined,
  slug: string,
  isHomepage: boolean
): string => {
  if (pageType === 'collectionIndex') {
    if (collection === 'newsletters') return '/newsletters';
    if (collection === 'blog') return '/blog';
    return '/events';
  }

  if (pageType === 'collectionDetail') {
    if (collection === 'newsletters') return '/newsletters/:slug';
    if (collection === 'blog') return '/blog/:slug';
    return '/events/:slug';
  }

  if (isHomepage) {
    return '/';
  }

  return `/${slug || 'page'}`;
};

export function createNewComponent(type: ComponentType): PageComponent {
  const id = `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const defaults = {
    text: { type: 'text', content: 'Add your text here...', align: 'left' },
    heading: { type: 'heading', content: 'Heading', level: 2, align: 'left' },
    image: { type: 'image', src: '', alt: 'Image description', objectFit: 'cover' },
    button: { type: 'button', text: 'Click me', variant: 'primary', size: 'md' },
    divider: { type: 'divider', color: '#e2e8f0', thickness: '1px', width: '100%' },
    spacer: { type: 'spacer', height: '2rem' },
    form: {
      type: 'form',
      fields: [],
      submitText: 'Submit',
      submitAction: '',
      successMessage: 'Thank you!',
      errorMessage: 'Something went wrong.',
    },
    gallery: { type: 'gallery', items: [], columns: 3 },
    video: { type: 'video', src: '', provider: 'youtube', controls: true },
    map: { type: 'map', height: '300px', zoom: 14 },
    'social-links': { type: 'social-links', links: [], iconSize: 'md', align: 'center' },
    columns: {
      type: 'columns',
      columns: [
        { id: 'col1', width: '1/2', components: [] },
        { id: 'col2', width: '1/2', components: [] },
      ],
      gap: '1rem',
    },
    hero: { type: 'hero', minHeight: '400px', verticalAlign: 'center', components: [] },
    card: { type: 'card', shadow: true },
    testimonial: {
      type: 'testimonial',
      quote: 'Add testimonial quote...',
      author: 'Author Name',
    },
    pricing: { type: 'pricing', tiers: [], columns: 3 },
    faq: { type: 'faq', items: [], expandFirst: true, allowMultiple: false },
    'contact-form': {
      type: 'contact-form',
      submitText: 'Send Message',
      includePhone: true,
      includeMessage: true,
    },
    'referral-form': {
      type: 'referral-form',
      heading: 'Referral intake',
      description: 'Send people who need support, follow-up, or case review.',
      submitText: 'Send Referral',
      successMessage: 'Referral received.',
      includePhone: true,
      defaultTags: ['referral'],
    },
    'donation-form': {
      type: 'donation-form',
      provider: 'stripe',
      suggestedAmounts: [25, 50, 100, 250],
      allowCustomAmount: true,
      recurringOption: true,
    },
    'event-list': {
      type: 'event-list',
      maxEvents: 6,
      showPastEvents: false,
      layout: 'grid',
      emptyMessage: 'No public events are available right now.',
    },
    'event-calendar': {
      type: 'event-calendar',
      maxEvents: 8,
      showPastEvents: false,
      initialView: 'month',
      emptyMessage: 'No public events are available right now.',
    },
    'event-detail': {
      type: 'event-detail',
      showDescription: true,
      showLocation: true,
      showCapacity: true,
      showRegistrationStatus: true,
    },
    'event-registration': {
      type: 'event-registration',
      submitText: 'Register',
      successMessage: 'Registration received.',
      includePhone: true,
      defaultStatus: 'registered',
    },
    'newsletter-signup': {
      type: 'newsletter-signup',
      buttonText: 'Subscribe',
      successMessage: 'Thanks for subscribing!',
    },
    'newsletter-archive': {
      type: 'newsletter-archive',
      maxItems: 10,
      sourceFilter: 'all',
      emptyMessage: 'No newsletters are available right now.',
    },
    'volunteer-interest-form': {
      type: 'volunteer-interest-form',
      submitText: 'Share Interest',
      successMessage: 'Volunteer interest received.',
      includePhone: true,
    },
    'petition-form': {
      type: 'petition-form',
      heading: 'Sign the petition',
      description: 'Add your name to support this request.',
      petitionStatement: 'I support this petition.',
      submitText: 'Sign Petition',
      successMessage: 'Signature received.',
      includePhone: false,
      showSignatureCount: true,
      defaultTags: ['petition'],
    },
    'donation-pledge-form': {
      type: 'donation-pledge-form',
      heading: 'Make a pledge',
      description: 'Tell us how you would like to support this campaign.',
      submitText: 'Send Pledge',
      successMessage: 'Pledge received.',
      suggestedAmounts: [25, 50, 100, 250],
      allowCustomAmount: true,
      currency: 'CAD',
      pledgeSchedule: 'one_time',
      defaultTags: ['donation-pledge'],
    },
    'support-letter-request': {
      type: 'support-letter-request',
      heading: 'Request a support letter',
      description: 'Share what you need so staff can prepare the right letter.',
      submitText: 'Send Request',
      successMessage: 'Request received.',
      includePhone: true,
      defaultTags: ['support-letter'],
    },
    countdown: {
      type: 'countdown',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
    },
    stats: { type: 'stats', items: [], columns: 4 },
    team: { type: 'team', members: [], columns: 3, showBio: true, showSocial: true },
    'logo-grid': { type: 'logo-grid', logos: [], columns: 4, grayscale: false },
  } satisfies ComponentDefaults;

  return { id, ...defaults[type] } as PageComponent;
}
