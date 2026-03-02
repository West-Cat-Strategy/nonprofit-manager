import { useEffect, useRef } from 'react';

export interface VisibilityPollingOptions {
  intervalMs: number;
  enabled?: boolean;
  runImmediately?: boolean;
}

export function useVisibilityPolling(
  callback: () => Promise<void> | void,
  options: VisibilityPollingOptions
): void {
  const { intervalMs, enabled = true, runImmediately = true } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let intervalRef: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        await callbackRef.current();
      } catch {
        // Swallow polling errors. Feature hooks surface request errors separately.
      }
    };

    const stop = () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
    };

    const start = () => {
      if (intervalRef || typeof document !== 'undefined' && document.hidden) {
        return;
      }

      if (runImmediately) {
        void run();
      }

      intervalRef = setInterval(() => {
        void run();
      }, intervalMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }

      start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stop();
    };
  }, [enabled, intervalMs, runImmediately]);
}
