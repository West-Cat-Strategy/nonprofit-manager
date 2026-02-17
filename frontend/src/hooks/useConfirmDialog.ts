/**
 * Custom hook for confirmation dialogs
 * Replaces native confirm() with a more controlled async approach
 */

import { useState, useCallback } from 'react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: 'danger' | 'warning' | 'info';
}

export interface UseConfirmDialogReturn {
  /** Current dialog state */
  dialogState: ConfirmDialogState;
  /** Show the confirmation dialog and wait for response */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Close the dialog (for external control) */
  close: () => void;
  /** Handle user confirming */
  handleConfirm: () => void;
  /** Handle user canceling */
  handleCancel: () => void;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const defaultState: ConfirmDialogState = {
  isOpen: false,
  title: 'Confirm',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'info',
};

/**
 * Hook for managing confirmation dialogs
 *
 * @example
 * const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?',
 *     variant: 'danger',
 *     confirmLabel: 'Delete',
 *   });
 *   if (confirmed) {
 *     // Perform delete
 *   }
 * };
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(defaultState);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
      setDialogState({
        isOpen: true,
        title: options.title ?? 'Confirm',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        variant: options.variant ?? 'info',
      });
    });
  }, []);

  const close = useCallback(() => {
    setDialogState(defaultState);
    setResolveRef(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef) {
      resolveRef(true);
    }
    close();
  }, [resolveRef, close]);

  const handleCancel = useCallback(() => {
    if (resolveRef) {
      resolveRef(false);
    }
    close();
  }, [resolveRef, close]);

  return {
    dialogState,
    confirm,
    close,
    handleConfirm,
    handleCancel,
  };
}

/**
 * Common confirm dialog presets
 */
export const confirmPresets = {
  delete: (itemName: string): ConfirmOptions => ({
    title: `Delete ${itemName}`,
    message: `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'danger',
  }),

  unsavedChanges: (): ConfirmOptions => ({
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
    confirmLabel: 'Leave',
    cancelLabel: 'Stay',
    variant: 'warning',
  }),

  cancel: (action: string): ConfirmOptions => ({
    title: `Cancel ${action}`,
    message: `Are you sure you want to cancel this ${action.toLowerCase()}?`,
    confirmLabel: 'Yes, Cancel',
    cancelLabel: 'No, Continue',
    variant: 'warning',
  }),
};

export default useConfirmDialog;
