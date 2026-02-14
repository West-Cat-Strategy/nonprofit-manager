import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirmDialog, confirmPresets } from '../useConfirmDialog';

// ─── useConfirmDialog ─────────────────────────────────────────────────────────

describe('useConfirmDialog', () => {
  it('starts with dialog closed', () => {
    const { result } = renderHook(() => useConfirmDialog());
    expect(result.current.dialogState.isOpen).toBe(false);
  });

  it('confirm() opens the dialog and sets the message', async () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.confirm({ message: 'Are you sure?' });
    });

    expect(result.current.dialogState.isOpen).toBe(true);
    expect(result.current.dialogState.message).toBe('Are you sure?');
  });

  it('confirm() applies custom title, labels, and variant', async () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.confirm({
        title: 'Delete Item',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Keep',
        variant: 'danger',
      });
    });

    const { dialogState } = result.current;
    expect(dialogState.title).toBe('Delete Item');
    expect(dialogState.confirmLabel).toBe('Delete');
    expect(dialogState.cancelLabel).toBe('Keep');
    expect(dialogState.variant).toBe('danger');
  });

  it('confirm() uses defaults for omitted options', () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.confirm({ message: 'Continue?' });
    });

    const { dialogState } = result.current;
    expect(dialogState.title).toBe('Confirm');
    expect(dialogState.confirmLabel).toBe('Confirm');
    expect(dialogState.cancelLabel).toBe('Cancel');
    expect(dialogState.variant).toBe('info');
  });

  it('handleConfirm() resolves the promise with true', async () => {
    const { result } = renderHook(() => useConfirmDialog());

    let resolved: boolean | undefined;
    act(() => {
      result.current.confirm({ message: 'Continue?' }).then((v) => { resolved = v; });
    });

    await act(async () => {
      result.current.handleConfirm();
    });

    expect(resolved).toBe(true);
    expect(result.current.dialogState.isOpen).toBe(false);
  });

  it('handleCancel() resolves the promise with false', async () => {
    const { result } = renderHook(() => useConfirmDialog());

    let resolved: boolean | undefined;
    act(() => {
      result.current.confirm({ message: 'Continue?' }).then((v) => { resolved = v; });
    });

    await act(async () => {
      result.current.handleCancel();
    });

    expect(resolved).toBe(false);
    expect(result.current.dialogState.isOpen).toBe(false);
  });

  it('close() closes the dialog', () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.confirm({ message: 'Close me' });
    });
    expect(result.current.dialogState.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.dialogState.isOpen).toBe(false);
  });

  it('confirm() returns a Promise', () => {
    const { result } = renderHook(() => useConfirmDialog());

    let returnValue: Promise<boolean> | undefined;
    act(() => {
      returnValue = result.current.confirm({ message: 'Test' });
    });

    expect(returnValue).toBeInstanceOf(Promise);
  });
});

// ─── confirmPresets ───────────────────────────────────────────────────────────

describe('confirmPresets.delete', () => {
  it('uses danger variant with the item name in title and message', () => {
    const opts = confirmPresets.delete('Contact');
    expect(opts.title).toBe('Delete Contact');
    expect(opts.message).toMatch(/contact/i);
    expect(opts.confirmLabel).toBe('Delete');
    expect(opts.variant).toBe('danger');
  });

  it('lowercases the item name in the message body', () => {
    const opts = confirmPresets.delete('Invoice');
    expect(opts.message).toMatch(/invoice/);
  });
});

describe('confirmPresets.unsavedChanges', () => {
  it('uses warning variant with Leave/Stay labels', () => {
    const opts = confirmPresets.unsavedChanges();
    expect(opts.title).toBe('Unsaved Changes');
    expect(opts.confirmLabel).toBe('Leave');
    expect(opts.cancelLabel).toBe('Stay');
    expect(opts.variant).toBe('warning');
  });

  it('mentions losing changes in the message', () => {
    const opts = confirmPresets.unsavedChanges();
    expect(opts.message).toMatch(/lost/i);
  });
});

describe('confirmPresets.cancel', () => {
  it('uses warning variant with the action name in title', () => {
    const opts = confirmPresets.cancel('Donation');
    expect(opts.title).toBe('Cancel Donation');
    expect(opts.variant).toBe('warning');
  });

  it('uses Yes, Cancel / No, Continue labels', () => {
    const opts = confirmPresets.cancel('Request');
    expect(opts.confirmLabel).toBe('Yes, Cancel');
    expect(opts.cancelLabel).toBe('No, Continue');
  });

  it('lowercases the action name in the message body', () => {
    const opts = confirmPresets.cancel('Subscription');
    expect(opts.message).toMatch(/subscription/);
  });
});
