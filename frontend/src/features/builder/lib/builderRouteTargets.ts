export const getTemplateGalleryPath = (): string => '/website-builder';

export const getTemplateEditorPath = (templateId: string): string =>
  `/website-builder/${templateId}`;

export const getTemplatePreviewPath = (templateId: string): string =>
  `/website-builder/${templateId}/preview`;
