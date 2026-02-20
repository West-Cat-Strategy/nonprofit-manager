/**
 * People List Container
 * Reusable container for list pages with consistent layout and functionality
 */

import React, { useEffect, useRef } from 'react';
import { BrutalCard, BrutalButton } from '../neo-brutalist';

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface PeopleListContainerProps<T> {
  title: string;
  description?: string;
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

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase text-[var(--app-text)] tracking-tight">{title}</h1>
            {description && (
              <p className="text-[var(--app-text-muted)] mt-2 font-medium text-lg">{description}</p>
            )}
          </div>
          {onCreateNew && (
            <BrutalButton onClick={onCreateNew} className="text-xl shadow-[6px_6px_0px_0px_var(--shadow-color)]">
              + {createButtonLabel}
            </BrutalButton>
          )}
        </div>

        {/* Filters */}
        {filters && (
          <div className="mb-8">
            {filters}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedRows.size > 0 && (
          <div className="bg-[var(--app-accent-soft)] border-4 border-[var(--app-accent)] p-6 mb-8 shadow-[6px_6px_0px_0px_var(--shadow-color)] flex items-center justify-between">
            <p className="font-black uppercase text-[var(--app-accent-text)] text-lg">
              {selectedRows.size} selected
            </p>
            {bulkActions && <div>{bulkActions}</div>}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500 border-4 border-black text-white px-6 py-4 mb-8 font-black uppercase tracking-wider shadow-[6px_6px_0px_0px_var(--shadow-color)]">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <BrutalCard className="p-12 text-center border-4 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--app-border)] border-b-[var(--app-accent)] mx-auto"></div>
            <p className="mt-6 font-black uppercase tracking-widest text-[var(--app-text)] animate-pulse text-xl">Loading...</p>
          </BrutalCard>
        ) : data.length === 0 ? (
          // Empty State
          <BrutalCard className="p-12 text-center border-4 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <h3 className="text-3xl font-black uppercase text-[var(--app-text)] mb-4">
              {emptyStateTitle || 'No records found'}
            </h3>
            {emptyStateDescription && (
              <p className="text-[var(--app-text-muted)] mb-8 font-medium text-lg italic">{emptyStateDescription}</p>
            )}
            {emptyStateAction && (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <BrutalButton onClick={emptyStateAction.onClick} className="text-lg">
                  {emptyStateAction.label}
                </BrutalButton>
                {emptyStateSecondaryAction && (
                  <BrutalButton
                    variant="secondary"
                    onClick={emptyStateSecondaryAction.onClick}
                    className="text-lg"
                  >
                    {emptyStateSecondaryAction.label}
                  </BrutalButton>
                )}
              </div>
            )}
          </BrutalCard>
        ) : (
          // Table
          <BrutalCard className="border-4 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[10px_10px_0px_0px_var(--shadow-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-4 border-[var(--app-border)] bg-[var(--app-surface-muted)]">
                    {onSelectRow && (
                      <th className="px-6 py-4 text-left w-16">
                        <input
                          type="checkbox"
                          ref={selectAllRef}
                          checked={allSelected}
                          onChange={(e) => onSelectAll?.(e.target.checked)}
                          className="w-6 h-6 border-4 border-[var(--app-border)] bg-[var(--app-bg)] accent-[var(--app-accent)] cursor-pointer"
                        />
                      </th>
                    )}
                    {columns.map((col) => (
                      <th
                        key={String(col.key)}
                        className="px-6 py-4 text-left text-sm font-black text-[var(--app-text)] uppercase tracking-widest"
                        style={{ width: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[var(--app-border)]">
                  {data.map((row) => {
                    // Use consumer-provided ID to support entities keyed as *_id.
                    const rowId = getRowId(row);
                    return (
                    <tr
                      key={rowId}
                      className={`hover:bg-[var(--app-surface-hover)] transition-colors ${selectedRows.has(rowId) ? 'bg-[var(--app-accent-soft)]' : ''
                        }`}
                    >
                      {onSelectRow && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(rowId)}
                            onChange={(e) =>
                              onSelectRow(rowId, e.target.checked)
                            }
                            className="w-6 h-6 border-[3px] border-[var(--app-border)] bg-[var(--app-bg)] accent-[var(--app-accent)] cursor-pointer"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={`${rowId}-${String(col.key)}`} className="px-6 py-4 text-[var(--app-text)] font-medium">
                          {col.render
                            ? col.render(
                              typeof col.key === 'string' ? (row as Record<string, unknown>)[col.key] : row[col.key],
                              row
                            )
                            : (typeof col.key === 'string'
                              ? (row as Record<string, unknown>)[col.key]
                              : row[col.key]) as React.ReactNode}
                        </td>
                      ))}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t-4 border-[var(--app-border)] bg-[var(--app-surface-muted)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm font-black uppercase tracking-wider text-[var(--app-text)]">
                  Page <span className="text-[var(--app-accent)]">{pagination.page}</span> of{' '}
                  <span className="text-[var(--app-accent)]">{pagination.totalPages}</span> ({pagination.total}{' '}
                  total)
                </p>
                <div className="flex gap-4">
                  <BrutalButton
                    variant="secondary"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      onPageChange?.(pagination.page - 1)
                    }
                    className="px-4 py-2"
                  >
                    ← Previous
                  </BrutalButton>
                  <BrutalButton
                    variant="secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      onPageChange?.(pagination.page + 1)
                    }
                    className="px-4 py-2"
                  >
                    Next →
                  </BrutalButton>
                </div>
              </div>
            )}
          </BrutalCard>
        )}
      </div>
    </div>
  );
};
