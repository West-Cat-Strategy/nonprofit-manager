import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext, useBeforeUnload } from 'react-router-dom';

interface UseUnsavedChangesGuardOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

const DEFAULT_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.';

export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  message = DEFAULT_MESSAGE,
}: UseUnsavedChangesGuardOptions): void {
  const { navigator } = useContext(UNSAFE_NavigationContext);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const blockingNavigator = navigator as {
      block?: (blocker: (tx: { retry: () => void }) => void) => () => void;
    };

    if (typeof blockingNavigator.block !== 'function') {
      return;
    }

    const unblock = blockingNavigator.block((tx) => {
      if (window.confirm(message)) {
        unblock();
        tx.retry();
      }
    });

    return unblock;
  }, [navigator, hasUnsavedChanges, message]);

  useBeforeUnload(
    (event) => {
      if (!hasUnsavedChanges) {
        return;
      }
      event.preventDefault();
      event.returnValue = message;
    },
    { capture: true }
  );
}

export default useUnsavedChangesGuard;
