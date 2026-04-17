import type { ReactNode } from 'react';
import { classNames } from './classNames';

export interface DataColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyLabel?: string;
  caption?: string;
  captionClassName?: string;
  ariaLabel?: string;
  className?: string;
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyLabel = 'No records found.',
  caption,
  captionClassName = 'sr-only',
  ariaLabel,
  className,
}: DataTableProps<T>) {
  return (
    <div
      data-shell-transition
      className={classNames(
        'overflow-x-auto rounded-[var(--ui-radius-sm)] border border-app-border-muted',
        className
      )}
    >
      <table
        aria-label={caption ? undefined : ariaLabel}
        className="min-w-full divide-y divide-app-border-muted bg-app-surface text-sm"
      >
        {caption ? <caption className={captionClassName}>{caption}</caption> : null}
        <thead className="bg-app-surface-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={classNames(
                  'whitespace-normal break-words px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted [overflow-wrap:anywhere]',
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border-muted">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-app-text-muted" colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-app-hover/40">
                {columns.map((column) => {
                  const rawValue = (row as Record<string, unknown>)[String(column.key)];
                  return (
                    <td
                      key={String(column.key)}
                      className={classNames(
                        'align-top whitespace-normal break-words px-4 py-3 text-app-text [overflow-wrap:anywhere]',
                        column.className
                      )}
                    >
                      {column.render ? column.render(row) : (rawValue as ReactNode)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
