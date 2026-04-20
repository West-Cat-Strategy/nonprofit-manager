import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import { reportsApiClient } from '../api/reportsApiClient';
import type { ReportTemplate, TemplateCategory } from '../../../types/reportTemplate';
import {
  collectReportTemplateTags,
  templateMatchesTag,
} from '../reportTemplateFilters';

interface ReportTemplateFilters {
  category: TemplateCategory | '';
  tag: string;
}

export function useReportTemplatesController({
  category,
  tag,
}: ReportTemplateFilters) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTemplatesError = useMemo(
    () => formatApiErrorMessageWith('Unable to load report templates right now.'),
    []
  );

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = category ? { category } : undefined;
      const data = await reportsApiClient.listTemplates(params);
      setTemplates(data as ReportTemplate[]);
    } catch (loadError) {
      console.error('Error fetching templates:', loadError);
      setError(formatTemplatesError(loadError));
    } finally {
      setLoading(false);
    }
  }, [category, formatTemplatesError]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter((template) => templateMatchesTag(template, tag));
  const availableTags = collectReportTemplateTags(templates);

  return {
    availableTags,
    error,
    filteredTemplates,
    loading,
    templates,
    fetchTemplates,
  };
}

export default useReportTemplatesController;
