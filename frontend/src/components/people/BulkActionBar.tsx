/**
 * Bulk Action Bar
 * Displays action buttons for bulk operations on selected items
 */

import React from 'react';
import { BrutalButton } from '../neo-brutalist';
import {
  TrashIcon,
  ArrowUpTrayIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  actions,
  onClearSelection,
}) => {
  const defaultActions: BulkAction[] = [
    {
      id: 'export',
      label: 'Export',
      icon: <ArrowUpTrayIcon className="w-4 h-4" />,
      variant: 'secondary',
      onClick: () => { },
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="w-4 h-4" />,
      variant: 'danger',
      onClick: () => { },
    },
  ];

  const allActions = actions.length > 0 ? actions : defaultActions;

  return (
    <div className="bg-[var(--app-accent)] border-4 border-black p-4 flex items-center justify-between shadow-[6px_6px_0px_0px_var(--shadow-color)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-white border-2 border-black p-1">
          <CheckIcon className="w-6 h-6 text-black stroke-[3px]" />
        </div>
        <p className="font-black uppercase italic tracking-tighter text-white text-xl">
          {selectedCount} selected
          {selectedCount > 1 ? ' items' : ' item'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {allActions.map((action) => (
          <BrutalButton
            key={action.id}
            variant={action.variant === 'danger' ? 'danger' : action.variant}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`text-sm px-4 py-2 font-black uppercase ${action.variant === 'danger' ? 'bg-red-500 text-white' : 'bg-white text-black'
              }`}
          >
            {action.icon && <span className="mr-2 inline-block">{action.icon}</span>}
            {action.label}
          </BrutalButton>
        ))}
        <button
          onClick={onClearSelection}
          className="px-4 py-2 text-sm font-black uppercase tracking-widest text-white hover:underline transition-all"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
