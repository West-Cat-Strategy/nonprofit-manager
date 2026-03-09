import type { PageCollectionType, TemplatePageType } from '../../../types/websiteBuilder';

export const pageTypeOptions: Array<{ value: TemplatePageType; label: string }> = [
  { value: 'static', label: 'Static page' },
  { value: 'collectionIndex', label: 'Collection index' },
  { value: 'collectionDetail', label: 'Collection detail' },
];

export const collectionOptions: Array<{ value: PageCollectionType; label: string }> = [
  { value: 'events', label: 'Events' },
  { value: 'newsletters', label: 'Newsletters' },
];

export const eventTypeOptions = [
  { value: '', label: 'All public events' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community', label: 'Community' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'conference', label: 'Conference' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
] as const;
