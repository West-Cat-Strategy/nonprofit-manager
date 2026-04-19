import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext, useBeforeUnload } from 'react-router-dom';

interface UseUnsavedChangesGuardOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

const DEFAULT_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.';

type NavigationTransition = {
  retry(): void;
};

type NavigatorWithBlock = {
  block?: (blocker: (transition: NavigationTransition) => void) => (() => void) | void;
};

export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  message = DEFAULT_MESSAGE,
}: UseUnsavedChangesGuardOptions): void {
  const navigationContext = useContext(UNSAFE_NavigationContext);
  const navigator = (navigationContext as { navigator?: NavigatorWithBlock } | null)?.navigator;

  useEffect(() => {
    if (!hasUnsavedChanges || typeof navigator?.block !== 'function') {
      return;
    }

    const unblock = navigator.block((transition) => {
      if (!window.confirm(message)) {
        return;
      }

      unblock?.();
      transition.retry();
    });

    return unblock;
  }, [hasUnsavedChanges, message, navigator]);

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
