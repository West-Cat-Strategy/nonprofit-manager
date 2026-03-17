import { useCallback, useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';

interface EventQrScannerProps {
  enabled: boolean;
  disabled?: boolean;
  onTokenScanned: (token: string) => void;
}

const SCAN_DEDUP_WINDOW_MS = 2000;

export default function EventQrScanner({ enabled, disabled = false, onTokenScanned }: EventQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ token: string; at: number }>({ token: '', at: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopScanner();
      setCameraError(null);
      return;
    }

    if (!videoRef.current) {
      return;
    }
    const videoElement = videoRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera scanning is unavailable in this browser. Use manual token entry.');
      return;
    }

    let cancelled = false;
    setCameraError(null);

    void import('@zxing/browser')
      .then(({ BrowserQRCodeReader }) => {
        const scanner = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 250,
        });

        return scanner.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoElement,
          (result) => {
            if (cancelled || disabled || !result) {
              return;
            }

            const token = result.getText().trim();
            if (!token) {
              return;
            }

            const now = Date.now();
            if (
              token === lastScanRef.current.token &&
              now - lastScanRef.current.at < SCAN_DEDUP_WINDOW_MS
            ) {
              return;
            }

            lastScanRef.current = { token, at: now };
            onTokenScanned(token);
          }
        );
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError('Unable to access camera. Use manual token entry or check browser permissions.');
        }
      });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [disabled, enabled, onTokenScanned, stopScanner]);

  return (
    <div className="mt-2 rounded-md border border-app-border bg-app-surface p-3">
      <p className="text-xs text-app-text-muted">
        Camera scan is active. Point the camera at the attendee QR code.
      </p>
      <video ref={videoRef} className="mt-2 h-52 w-full rounded-md bg-black object-cover" autoPlay muted playsInline />
      {cameraError && <p className="mt-2 text-xs text-app-accent-text">{cameraError}</p>}
    </div>
  );
}
