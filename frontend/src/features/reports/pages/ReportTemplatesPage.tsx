import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ReportTemplate, TemplateCategory } from '../../../types/reportTemplate';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import useReportTemplatesController from '../hooks/useReportTemplatesController';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../../components/ui';
import {
  normalizeTemplateTag,
  parseTemplateCategory,
  REPORT_TEMPLATE_CATEGORY_OPTIONS,
} from '../reportTemplateFilters';

function ReportTemplates() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = parseTemplateCategory(searchParams.get('category'));
  const selectedTag = normalizeTemplateTag(searchParams.get('tag'));
  const { availableTags, error, fetchTemplates, filteredTemplates, loading } =
    useReportTemplatesController({
      category: selectedCategory,
      tag: selectedTag,
    });

  const displayedTags =
    selectedTag && !availableTags.includes(selectedTag)
      ? [selectedTag, ...availableTags]
      : availableTags;
  const selectedCategoryOption = REPORT_TEMPLATE_CATEGORY_OPTIONS.find(
    (category) => category.value === selectedCategory
  );
  const hasActiveFilters = Boolean(selectedCategory || selectedTag);

  const updateTemplateFilters = ({
    category,
    tag,
  }: {
    category?: TemplateCategory | '';
    tag?: string;
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (category !== undefined) {
      if (category) {
        nextSearchParams.set('category', category);
      } else {
        nextSearchParams.delete('category');
      }
    }

    if (tag !== undefined) {
      const normalizedTag = normalizeTemplateTag(tag);
      if (normalizedTag) {
        nextSearchParams.set('tag', normalizedTag);
      } else {
        nextSearchParams.delete('tag');
      }
    }

    setSearchParams(nextSearchParams);
  };

  const handleUseTemplate = (template: ReportTemplate) => {
    navigate(`/reports/builder?template=${template.id}`);
  };

  return (
    <NeoBrutalistLayout pageTitle="REPORT TEMPLATES">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Report Templates"
          description="Start with pre-built templates for common reports."
          actions={
            <PrimaryButton onClick={() => navigate('/reports/builder')}>
              Create Custom Report
            </PrimaryButton>
          }
        />

        <details
          open={hasActiveFilters}
          className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface shadow-sm"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-app-text-heading">
            Filter templates
          </summary>
          <div className="border-t border-app-border px-4 py-4">
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Category
                </div>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton
                    className={selectedCategory === '' ? 'border-app-accent bg-app-accent-soft text-app-accent-text' : ''}
                    onClick={() => updateTemplateFilters({ category: '' })}
                  >
                    All
                  </SecondaryButton>
                  {REPORT_TEMPLATE_CATEGORY_OPTIONS.map((category) => (
                    <SecondaryButton
                      key={category.value}
                      className={selectedCategory === category.value ? 'border-app-accent bg-app-accent-soft text-app-accent-text' : ''}
                      onClick={() => updateTemplateFilters({ category: category.value })}
                    >
                      {category.label}
                    </SecondaryButton>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    Tag
                  </div>
                  {selectedTag && (
                    <SecondaryButton
                      className="px-3 py-1 text-xs"
                      onClick={() => updateTemplateFilters({ tag: '' })}
                    >
                      Clear tag filter
                    </SecondaryButton>
                  )}
                </div>
                {displayedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {displayedTags.map((tag) => {
                      const isActive = normalizeTemplateTag(tag) === selectedTag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`rounded-[var(--ui-radius-sm)] border px-3 py-1 text-xs font-semibold ${
                            isActive
                              ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                              : 'border-app-border bg-app-surface text-app-text hover:bg-app-hover'
                          }`}
                          onClick={() =>
                            updateTemplateFilters({
                              tag: isActive ? '' : tag,
                            })
                          }
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-app-text-muted">
                    No template tags are available yet for this category.
                  </p>
                )}
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-muted">
                  <span>
                    Showing {selectedCategoryOption?.label || 'all'} templates
                    {selectedTag ? ` tagged #${selectedTag}` : ''}.
                  </span>
                  <SecondaryButton
                    className="px-3 py-1 text-xs"
                    onClick={() => updateTemplateFilters({ category: '', tag: '' })}
                  >
                    Clear all filters
                  </SecondaryButton>
                </div>
              )}
            </div>
          </div>
        </details>

        {loading && <LoadingState label="Loading report templates..." />}
        {error && (
          <ErrorState
            message={error}
            onRetry={() => void fetchTemplates()}
            retryLabel="Retry loading templates"
          />
        )}

        {!loading && !error && filteredTemplates.length === 0 && (
          <EmptyState
            title="No templates found"
            description={
              hasActiveFilters
                ? 'Try another category, clear the current tag filter, or create a custom report.'
                : 'Try another category or create a custom report.'
            }
            action={
              <PrimaryButton onClick={() => navigate('/reports/builder')}>
                Create Custom Report
              </PrimaryButton>
            }
          />
        )}

        {!loading && !error && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => {
              const category = REPORT_TEMPLATE_CATEGORY_OPTIONS.find(
                (candidate) => candidate.value === template.category
              );
              return (
                <SectionCard
                  key={template.id}
                  title={template.name}
                  subtitle={template.description || 'No description provided'}
                  actions={
                    <PrimaryButton onClick={() => handleUseTemplate(template)}>
                      Use Template
                    </PrimaryButton>
                  }
                  className="h-full"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-app-border bg-app-accent-soft px-2 py-1 text-xs font-semibold text-app-accent-text">
                      {category?.label || template.category}
                    </span>
                    {template.is_system && (
                      <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-2 py-1 text-xs font-semibold text-app-text-muted">
                        System
                      </span>
                    )}
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${
                            normalizeTemplateTag(tag) === selectedTag
                              ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                              : 'border-app-border text-app-text-muted'
                          }`}
                          onClick={() => updateTemplateFilters({ tag })}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>
        )}
      </div>
    </NeoBrutalistLayout>
  );
}

export default ReportTemplates;
