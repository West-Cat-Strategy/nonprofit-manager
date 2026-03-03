import { useCallback, useEffect, useMemo, useState } from 'react';
import { casesApiClient } from '../../cases/api/casesApiClient';
import { tasksApiClient } from '../../tasks/api/tasksApiClient';
import type { FollowUpEntityOption, FollowUpEntityType } from '../../../types/followup';

interface UseFollowUpEntityLookupOptions {
  debounceMs?: number;
  limit?: number;
}

interface UseFollowUpEntityLookupResult {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  results: FollowUpEntityOption[];
  isLoading: boolean;
  clear: () => void;
}

export function useFollowUpEntityLookup(
  entityType: FollowUpEntityType,
  options: UseFollowUpEntityLookupOptions = {}
): UseFollowUpEntityLookupResult {
  const { debounceMs = 250, limit = 8 } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<FollowUpEntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSearchTerm('');
    setResults([]);
  }, [entityType]);

  const searchEntities = useCallback(
    async (term: string) => {
      const trimmedTerm = term.trim();
      if (trimmedTerm.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        if (entityType === 'case') {
          const response = await casesApiClient.listCases({
            search: trimmedTerm,
            limit,
            page: 1,
            sortBy: 'updated_at',
            sortOrder: 'desc',
          });

          const nextResults: FollowUpEntityOption[] = (response.cases || []).map((row) => {
            const label = row.title || row.case_number || 'Case';
            const descriptionParts = [
              row.case_number,
              row.contact_first_name || row.contact_last_name
                ? `${row.contact_first_name || ''} ${row.contact_last_name || ''}`.trim()
                : undefined,
              row.status_name,
            ].filter(Boolean);

            return {
              entityType: 'case',
              entityId: row.id,
              label,
              description: descriptionParts.join(' • '),
            };
          });

          setResults(nextResults);
          return;
        }

        const response = await tasksApiClient.listTasks({
          search: trimmedTerm,
          limit,
          page: 1,
        });

        const nextResults: FollowUpEntityOption[] = (response.tasks || []).map((row) => {
          const label = row.subject || 'Task';
          const descriptionParts = [row.assigned_to_name || undefined, row.status, row.priority].filter(Boolean);

          return {
            entityType: 'task',
            entityId: row.id,
            label,
            description: descriptionParts.join(' • '),
          };
        });

        setResults(nextResults);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [entityType, limit]
  );

  useEffect(() => {
    const timerId = setTimeout(() => {
      void searchEntities(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(timerId);
    };
  }, [debounceMs, searchEntities, searchTerm]);

  const clear = useCallback(() => {
    setSearchTerm('');
    setResults([]);
  }, []);

  return useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      results,
      isLoading,
      clear,
    }),
    [searchTerm, results, isLoading, clear]
  );
}

export default useFollowUpEntityLookup;
