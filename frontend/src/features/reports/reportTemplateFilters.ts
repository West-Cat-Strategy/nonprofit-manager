import type { ReportTemplate, TemplateCategory } from '../../types/reportTemplate';

export const REPORT_TEMPLATE_CATEGORY_OPTIONS: {
  value: TemplateCategory;
  label: string;
  icon: string;
}[] = [
  { value: 'fundraising', label: 'Fundraising', icon: 'Revenue' },
  { value: 'engagement', label: 'Engagement', icon: 'Engagement' },
  { value: 'operations', label: 'Operations', icon: 'Operations' },
  { value: 'finance', label: 'Finance', icon: 'Finance' },
  { value: 'compliance', label: 'Compliance', icon: 'Compliance' },
  { value: 'custom', label: 'Custom', icon: 'Custom' },
];

const TEMPLATE_CATEGORY_VALUES = new Set<TemplateCategory>(
  REPORT_TEMPLATE_CATEGORY_OPTIONS.map((category) => category.value)
);

const normalizeTemplateTagValue = (value: string): string => value.trim().toLowerCase();

export const parseTemplateCategory = (value: string | null): TemplateCategory | '' => {
  if (!value || !TEMPLATE_CATEGORY_VALUES.has(value as TemplateCategory)) {
    return '';
  }

  return value as TemplateCategory;
};

export const normalizeTemplateTag = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  return normalizeTemplateTagValue(value);
};

export const templateMatchesTag = (
  template: Pick<ReportTemplate, 'tags'>,
  selectedTag: string
): boolean => {
  const normalizedSelectedTag = normalizeTemplateTag(selectedTag);

  if (!normalizedSelectedTag) {
    return true;
  }

  return template.tags.some(
    (tag) => normalizeTemplateTagValue(tag) === normalizedSelectedTag
  );
};

export const collectReportTemplateTags = (templates: ReportTemplate[]): string[] => {
  const tagSet = new Set<string>();

  templates.forEach((template) => {
    template.tags.forEach((tag) => {
      const normalizedTag = normalizeTemplateTag(tag);
      if (normalizedTag) {
        tagSet.add(normalizedTag);
      }
    });
  });

  return Array.from(tagSet).sort((left, right) => left.localeCompare(right));
};
