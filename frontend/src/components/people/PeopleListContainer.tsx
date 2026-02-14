/**
 * People List Container
 * Reusable container for list pages with consistent layout and functionality
 */

import React from 'react';
import { BrutalCard, BrutalButton } from './index';

interface TableColumn {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface PeopleListContainerProps {
  title: string;
  description?: string;
  onCreateNew?: () => void;
  createButtonLabel?: string;
  filters?: React.ReactNode;
  loading?: boolean;
  error?: string;
  data: any[];
  columns: TableColumn[];
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
}

export const PeopleListContainer: React.FC<PeopleListContainerProps> = ({
  title,
  description,
  onCreateNew,
  createButtonLabel = 'New',
  filters,
  loading,
  error,
  data,
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
}) => {
  const allSelected =
    data.length > 0 && data.every((row) => selectedRows.has(row.id));
  const someSelected = selectedRows.size > 0 && !allSelected;

  return (
    <div className="min-h-screen bg-app-surface-muted p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-app-text">{title}</h1>
            {description && (
              <p className="text-app-text-muted mt-1">{description}</p>
            )}
          </div>
          {onCreateNew && (
            <BrutalButton onClick={onCreateNew}>
              + {createButtonLabel}
            </BrutalButton>
          )}
        </div>

        {/* Filters */}
        {filters && (
          <BrutalCard className="mb-6">
            {filters}
          </BrutalCard>
        )}

        {/* Bulk Actions Bar */}
        {selectedRows.size > 0 && (
          <div className="bg-app-accent-soft border-2 border-app-accent p-4 mb-6 flex items-center justify-between">
            <p className="font-bold text-app-text">
              {selectedRows.size} selected
            </p>
            {bulkActions && <div>{bulkActions}</div>}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-600 text-red-700 px-4 py-3 mb-4 font-mono">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <BrutalCard className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-text mx-auto"></div>
            <p className="mt-4 font-mono text-app-text-muted">Loading...</p>
          </BrutalCard>
        ) : data.length === 0 ? (
          // Empty State
          <BrutalCard className="p-8 text-center">
            <h3 className="text-xl font-bold text-app-text mb-2">
              {emptyStateTitle || 'No records found'}
            </h3>
            {emptyStateDescription && (
              <p className="text-app-text-muted mb-4">{emptyStateDescription}</p>
            )}
            {emptyStateAction && (
              <BrutalButton onClick={emptyStateAction.onClick}>
                {emptyStateAction.label}
              </BrutalButton>
            )}
          </BrutalCard>
        ) : (
          // Table
          <BrutalCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-app-text">
                    {onSelectRow && (
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={(e) => onSelectAll?.(e.target.checked)}
                          className="w-4 h-4 border-2 border-app-text accent-app-text"
                        />
                      </th>
                    )}
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-3 text-left text-xs font-bold text-app-text uppercase tracking-wider"
                        style={{ width: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-app-border hover:bg-app-surface-muted ${
                        selectedRows.has(row.id) ? 'bg-app-accent-soft' : ''
                      }
                      ${idx === data.length - 1 ? 'border-b-0' : ''}`}
                    >
                      {onSelectRow && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(row.id)}
                            onChange={(e) =>
                              onSelectRow(row.id, e.target.checked)
                            }
                            className="w-4 h-4 border-2 border-app-text accent-app-text"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={`${row.id}-${col.key}`} className="px-6 py-4">
                          {col.render
                            ? col.render(row[col.key], row)
                            : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t-2 border-app-text p-4 flex items-center justify-between">
                <p className="text-sm font-mono">
                  Page <strong>{pagination.page}</strong> of{' '}
                  <strong>{pagination.totalPages}</strong> ({pagination.total}{' '}
                  total)
                </p>
                <div className="flex gap-2">
                  <BrutalButton
                    variant="secondary"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      onPageChange?.(pagination.page - 1)
                    }
                  >
                    ← Previous
                  </BrutalButton>
                  <BrutalButton
                    variant="secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      onPageChange?.(pagination.page + 1)
                    }
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
