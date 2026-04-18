import type { TemplateCategory, TemplateStatus } from '../../../../types/websiteBuilder';

export type TemplateGalleryTab = 'my-templates' | 'starter-templates';
export type SiteCreationStage = 'duplicate' | 'create' | 'publish';

export const templateCategoryOptions: { value: TemplateCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'landing-page', label: 'Landing Page' },
  { value: 'event', label: 'Event' },
  { value: 'donation', label: 'Donation' },
  { value: 'blog', label: 'Blog' },
  { value: 'multi-page', label: 'Multi-Page' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'contact', label: 'Contact' },
];

export const templateStatusOptions: { value: TemplateStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];
