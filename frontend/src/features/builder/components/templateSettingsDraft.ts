import type { Template, TemplateStatus } from '../../../types/websiteBuilder';

export type TemplateSettingsDraft = {
  name: string;
  description: string;
  status: TemplateStatus;
};

export const toTemplateSettingsDraft = (
  template: Template | null
): TemplateSettingsDraft => ({
  name: template?.name || '',
  description: template?.description || '',
  status: template?.status || 'draft',
});
