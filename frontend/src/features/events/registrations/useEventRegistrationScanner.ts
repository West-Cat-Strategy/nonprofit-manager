import { useCallback, useState } from 'react';

interface UseEventRegistrationScannerArgs {
  onScanCheckIn?: (token: string) => Promise<void>;
}

export function useEventRegistrationScanner({ onScanCheckIn }: UseEventRegistrationScannerArgs) {
  const [scanToken, setScanToken] = useState('');
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const submitScanCheckIn = useCallback(
    async (rawToken: string) => {
      if (!onScanCheckIn) {
        return;
      }

      const token = rawToken.trim();
      if (!token) {
        return;
      }

      setScanError(null);
      setScanStatusMessage(null);

      try {
        await onScanCheckIn(token);
        setScanStatusMessage(`Checked in token ${token.slice(0, 10)}${token.length > 10 ? '...' : ''}`);
      } catch {
        setScanError('Failed to check in scanned token.');
      }
    },
    [onScanCheckIn]
  );

  const handleCameraTokenScanned = useCallback(
    (token: string) => {
      setScanToken(token);
      void submitScanCheckIn(token).then(() => {
        setScanToken('');
      });
    },
    [submitScanCheckIn]
  );

  return {
    cameraScannerOpen,
    handleCameraTokenScanned,
    scanError,
    scanStatusMessage,
    scanToken,
    setCameraScannerOpen,
    setScanToken,
    submitScanCheckIn,
  };
}
