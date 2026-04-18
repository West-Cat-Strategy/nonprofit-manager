import type { TemplateListItem } from '../../../../types/websiteBuilder';
import type { SiteCreationStage } from './options';

export const getTemplateCopyName = (template: TemplateListItem): string =>
  template.name ? `${template.name} (Copy)` : 'Untitled Website Copy';

export const getSiteTemplateCopyName = (siteName: string): string =>
  siteName.trim() ? `${siteName.trim()} Website Template` : 'Untitled Website Template';

const getAsyncErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallbackMessage;
};

export const getSiteCreationErrorMessage = (
  stage: SiteCreationStage,
  error: unknown
): string => {
  const message = getAsyncErrorMessage(error, 'Please try again.');

  switch (stage) {
    case 'duplicate':
      return `Could not prepare the starter template. ${message}`;
    case 'publish':
      return `The site was created, but publishing live failed. ${message}`;
    case 'create':
    default:
      return `Could not create the site. ${message}`;
  }
};
