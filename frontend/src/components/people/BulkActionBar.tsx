/**
 * Bulk Action Bar
 * Displays action buttons for bulk operations on selected items
 */

import React from 'react';
import { BrutalButton } from './index';
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
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="w-4 h-4" />,
      variant: 'danger',
    },
  ];

  const allActions = actions.length > 0 ? actions : defaultActions;

  return (
    <div className="bg-blue-50 border-2 border-blue-600 p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckIcon className="w-5 h-5 text-blue-600" />
        <p className="font-bold text-gray-900">
          {selectedCount} selected
          {selectedCount > 1 ? ' items' : ' item'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {allActions.map((action) => (
          <BrutalButton
            key={action.id}
            variant={action.variant as any}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.tooltip}
            className="text-sm"
          >
            {action.icon && <span className="mr-1 inline-block">{action.icon}</span>}
            {action.label}
          </BrutalButton>
        ))}
        <button
          onClick={onClearSelection}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 font-mono"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
