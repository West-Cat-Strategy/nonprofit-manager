import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EventCheckInSettings } from '../../../types/event';
import { buildEventRegistrationKioskUrl } from './buildKioskUrl';

interface UseEventRegistrationKioskSettingsArgs {
  eventId: string;
  occurrenceId?: string | null;
  checkInSettings: EventCheckInSettings | null;
  onUpdateCheckInSettings: (enabled: boolean) => Promise<void>;
  onRotateCheckInPin: () => Promise<string>;
}

export function useEventRegistrationKioskSettings({
  eventId,
  occurrenceId,
  checkInSettings,
  onUpdateCheckInSettings,
  onRotateCheckInPin,
}: UseEventRegistrationKioskSettingsArgs) {
  const [kioskEnabledDraft, setKioskEnabledDraft] = useState(false);
  const [kioskBusy, setKioskBusy] = useState(false);
  const [kioskMessage, setKioskMessage] = useState<string | null>(null);
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [latestPin, setLatestPin] = useState<string | null>(null);

  useEffect(() => {
    if (checkInSettings) {
      setKioskEnabledDraft(checkInSettings.public_checkin_enabled);
    }
  }, [checkInSettings]);

  const kioskUrl = useMemo(
    () => buildEventRegistrationKioskUrl(eventId, occurrenceId),
    [eventId, occurrenceId]
  );

  const saveKioskSettings = useCallback(async () => {
    setKioskBusy(true);
    setKioskError(null);
    setKioskMessage(null);

    try {
      await onUpdateCheckInSettings(kioskEnabledDraft);
      setKioskMessage(kioskEnabledDraft ? 'Public kiosk enabled.' : 'Public kiosk disabled.');
    } catch {
      setKioskError('Failed to update kiosk settings.');
    } finally {
      setKioskBusy(false);
    }
  }, [kioskEnabledDraft, onUpdateCheckInSettings]);

  const rotateKioskPin = useCallback(async () => {
    setKioskBusy(true);
    setKioskError(null);
    setKioskMessage(null);

    try {
      const pin = await onRotateCheckInPin();
      setLatestPin(pin);
      setKioskMessage('PIN rotated. Share this PIN with on-site staff only.');
    } catch {
      setKioskError('Failed to rotate kiosk PIN.');
    } finally {
      setKioskBusy(false);
    }
  }, [onRotateCheckInPin]);

  return {
    kioskBusy,
    kioskEnabledDraft,
    kioskError,
    kioskMessage,
    kioskUrl,
    latestPin,
    rotateKioskPin,
    saveKioskSettings,
    setKioskEnabledDraft,
  };
}
