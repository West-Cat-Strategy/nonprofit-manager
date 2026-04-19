import { useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

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
  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return;
    }

    if (window.confirm(message)) {
      blocker.proceed();
      return;
    }

    blocker.reset();
  }, [blocker, message]);

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
