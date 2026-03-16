import { useCallback, useEffect, useState } from 'react';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import { reportsApiClient } from '../api/reportsApiClient';
import type { ReportTemplate, TemplateCategory } from '../../../types/reportTemplate';

export function useReportTemplatesController(selectedCategory: TemplateCategory | '') {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTemplatesError = formatApiErrorMessageWith(
    'Unable to load report templates right now.'
  );

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedCategory ? { category: selectedCategory } : {};
      const data = await reportsApiClient.listTemplates(params);
      setTemplates(data as ReportTemplate[]);
    } catch (loadError) {
      console.error('Error fetching templates:', loadError);
      setError(formatTemplatesError(loadError));
    } finally {
      setLoading(false);
    }
  }, [formatTemplatesError, selectedCategory]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = selectedCategory
    ? templates.filter((template) => template.category === selectedCategory)
    : templates;

  return {
    error,
    filteredTemplates,
    loading,
    selectedCategory,
    templates,
    fetchTemplates,
  };
}

export default useReportTemplatesController;
