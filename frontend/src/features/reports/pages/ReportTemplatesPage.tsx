import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const CATEGORIES: { value: TemplateCategory; label: string; icon: string }[] = [
  { value: 'fundraising', label: 'Fundraising', icon: '💰' },
  { value: 'engagement', label: 'Engagement', icon: '👥' },
  { value: 'operations', label: 'Operations', icon: '⚙️' },
  { value: 'finance', label: 'Finance', icon: '📊' },
  { value: 'compliance', label: 'Compliance', icon: '📋' },
  { value: 'custom', label: 'Custom', icon: '✨' },
];

function ReportTemplates() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | ''>('');
  const { error, fetchTemplates, filteredTemplates, loading } =
    useReportTemplatesController(selectedCategory);

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

        <SectionCard title="Filter by Category">
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              className={selectedCategory === '' ? 'border-app-accent bg-app-accent-soft text-app-accent-text' : ''}
              onClick={() => setSelectedCategory('')}
            >
              All
            </SecondaryButton>
            {CATEGORIES.map((category) => (
              <SecondaryButton
                key={category.value}
                className={selectedCategory === category.value ? 'border-app-accent bg-app-accent-soft text-app-accent-text' : ''}
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.icon} {category.label}
              </SecondaryButton>
            ))}
          </div>
        </SectionCard>

        {loading && <LoadingState label="Loading report templates..." />}
        {error && <ErrorState message={error} onRetry={() => void fetchTemplates()} retryLabel="Retry loading templates" />}

        {!loading && !error && filteredTemplates.length === 0 && (
          <EmptyState
            title="No templates found"
            description="Try another category or create a custom report."
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
              const category = CATEGORIES.find((candidate) => candidate.value === template.category);
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
                      {category?.icon} {category?.label || template.category}
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
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-app-border px-2 py-1 text-xs text-app-text-muted"
                        >
                          #{tag}
                        </span>
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
