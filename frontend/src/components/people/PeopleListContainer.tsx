import React, { useEffect, useRef } from 'react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SectionCard,
  SecondaryButton,
} from '../ui';

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface PeopleListContainerProps<T> {
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  onCreateNew?: () => void;
  createButtonLabel?: string;
  filters?: React.ReactNode;
  loading?: boolean;
  error?: string;
  data: T[];
  getRowId: (row: T) => string;
  columns: TableColumn<T>[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  selectedRows?: Set<string>;
  onSelectRow?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  bulkActions?: React.ReactNode;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: {
    label: string;
    onClick: () => void;
  };
  emptyStateSecondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const PeopleListContainer = <T,>({
  title,
  description,
  headerActions,
  onCreateNew,
  createButtonLabel = 'New',
  filters,
  loading,
  error,
  data,
  getRowId,
  columns,
  pagination,
  onPageChange,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  bulkActions,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateAction,
  emptyStateSecondaryAction,
}: PeopleListContainerProps<T>) => {
  const allSelected = data.length > 0 && data.every((row) => selectedRows.has(getRowId(row)));
  const someSelected = selectedRows.size > 0 && !allSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const headerActionRow = (
    <>
      {headerActions}
      {onCreateNew ? <PrimaryButton onClick={onCreateNew}>{createButtonLabel}</PrimaryButton> : null}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={headerActionRow} />

      {filters ? (
        <SectionCard
          title="Refine results"
          subtitle="Use filters and search to narrow the list before bulk actions or exports."
        >
          {filters}
        </SectionCard>
      ) : null}

      {selectedRows.size > 0 ? (
        <section className="rounded-[var(--ui-radius-md)] border border-app-accent bg-app-accent-soft p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent-text">
                Selection active
              </p>
              <p className="mt-1 text-sm font-medium text-app-accent-text">
                {selectedRows.size} {selectedRows.size === 1 ? 'record' : 'records'} selected.
              </p>
            </div>
            {bulkActions ? <div className="flex flex-wrap items-center gap-2">{bulkActions}</div> : null}
          </div>
        </section>
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState label={`Loading ${title.toLowerCase()}...`} />
      ) : data.length === 0 ? (
        <EmptyState
          title={emptyStateTitle || 'No records found'}
          description={emptyStateDescription}
          action={
            emptyStateAction || emptyStateSecondaryAction ? (
              <div className="flex flex-wrap items-center gap-2">
                {emptyStateAction ? (
                  <PrimaryButton onClick={emptyStateAction.onClick}>{emptyStateAction.label}</PrimaryButton>
                ) : null}
                {emptyStateSecondaryAction ? (
                  <SecondaryButton onClick={emptyStateSecondaryAction.onClick}>
                    {emptyStateSecondaryAction.label}
                  </SecondaryButton>
                ) : null}
              </div>
            ) : null
          }
        />
      ) : (
        <section className="overflow-hidden rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-app-border-muted text-sm">
              <thead className="bg-app-surface-muted">
                <tr>
                  {onSelectRow ? (
                    <th className="w-14 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        checked={allSelected}
                        onChange={(event) => onSelectAll?.(event.target.checked)}
                        className="h-4 w-4 rounded border-app-input-border text-app-accent focus:ring-app-accent"
                      />
                    </th>
                  ) : null}
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted"
                      style={{ width: column.width }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border-muted">
                {data.map((row) => {
                  const rowId = getRowId(row);
                  return (
                    <tr
                      key={rowId}
                      className={`transition hover:bg-app-hover/40 ${
                        selectedRows.has(rowId) ? 'bg-app-accent-soft/60' : 'bg-app-surface'
                      }`}
                    >
                      {onSelectRow ? (
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(rowId)}
                            onChange={(event) => onSelectRow(rowId, event.target.checked)}
                            className="h-4 w-4 rounded border-app-input-border text-app-accent focus:ring-app-accent"
                          />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={`${rowId}-${String(column.key)}`} className="px-4 py-3 align-top text-app-text">
                          {column.render
                            ? column.render(
                                typeof column.key === 'string'
                                  ? (row as Record<string, unknown>)[column.key]
                                  : row[column.key],
                                row
                              )
                            : ((typeof column.key === 'string'
                                ? (row as Record<string, unknown>)[column.key]
                                : row[column.key]) as React.ReactNode)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-app-border-muted bg-app-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-app-text-muted">
                Page <span className="font-semibold text-app-text">{pagination.page}</span> of{' '}
                <span className="font-semibold text-app-text">{pagination.totalPages}</span> ({pagination.total}{' '}
                total)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <SecondaryButton
                  disabled={pagination.page <= 1}
                  onClick={() => onPageChange?.(pagination.page - 1)}
                >
                  Previous
                </SecondaryButton>
                <SecondaryButton
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => onPageChange?.(pagination.page + 1)}
                >
                  Next
                </SecondaryButton>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
};
