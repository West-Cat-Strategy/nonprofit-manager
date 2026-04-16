import type { ReactNode } from 'react';
import type { DashboardWidget } from '../../types/dashboard';

interface WidgetContainerProps {
  widget: DashboardWidget;
  editMode: boolean;
  onRemove: () => void;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
}

const WidgetContainer = ({
  widget,
  editMode,
  onRemove,
  children,
  loading,
  error,
}: WidgetContainerProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Widget Header */}
      <div
        className={`flex items-center justify-between border-b border-app-border/70 p-4 ${
          editMode ? 'drag-handle cursor-move bg-app-surface-muted' : ''
        }`}
      >
        <h3 className="font-semibold text-app-text flex items-center">
          {editMode && (
            <svg className="w-5 h-5 mr-2 text-app-text-subtle" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          )}
          {widget.title}
        </h3>

        {editMode && (
          <button
            onClick={onRemove}
            className="rounded-md text-app-text-subtle transition-colors hover:text-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
            title="Remove widget"
            aria-label={`Remove ${widget.title} widget`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Widget Content */}
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-app-text-muted">Loading…</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-app-accent">Error: {error}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default WidgetContainer;
