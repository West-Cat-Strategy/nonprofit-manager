import type { EventCheckInSettings } from '../../../types/event';

interface EventRegistrationKioskCardProps {
  checkInSettings: EventCheckInSettings | null;
  checkInSettingsLoading: boolean;
  kioskBusy: boolean;
  kioskEnabledDraft: boolean;
  kioskError: string | null;
  kioskMessage: string | null;
  kioskUrl: string;
  latestPin: string | null;
  onRotateKioskPin: () => void;
  onSaveKioskSettings: () => void;
  setKioskEnabledDraft: (value: boolean) => void;
}

export function EventRegistrationKioskCard({
  checkInSettings,
  checkInSettingsLoading,
  kioskBusy,
  kioskEnabledDraft,
  kioskError,
  kioskMessage,
  kioskUrl,
  latestPin,
  onRotateKioskPin,
  onSaveKioskSettings,
  setKioskEnabledDraft,
}: EventRegistrationKioskCardProps) {
  return (
    <div className="mb-4 rounded-lg border border-app-border bg-app-surface-muted p-4">
      <h3 className="text-lg font-semibold text-app-text">Public Kiosk Check-In</h3>
      <p className="mt-1 text-sm text-app-text-muted">
        Allow attendees to self check-in at the event with a staff-issued PIN.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={kioskEnabledDraft}
            disabled={checkInSettingsLoading || kioskBusy}
            onChange={(event) => setKioskEnabledDraft(event.target.checked)}
          />
          Enable public kiosk
        </label>
        <button
          type="button"
          onClick={onSaveKioskSettings}
          disabled={checkInSettingsLoading || kioskBusy}
          className="rounded-md border border-app-border px-3 py-1.5 text-sm hover:bg-app-surface disabled:opacity-60"
        >
          {kioskBusy ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onRotateKioskPin}
          disabled={checkInSettingsLoading || kioskBusy}
          className="rounded-md bg-app-accent px-3 py-1.5 text-sm text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-60"
        >
          Rotate PIN
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded bg-app-surface px-2 py-1 text-xs text-app-text">{kioskUrl}</code>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(kioskUrl)}
          className="rounded border border-app-border px-2 py-1 text-xs hover:bg-app-surface"
        >
          Copy URL
        </button>
      </div>

      {checkInSettings?.public_checkin_pin_rotated_at && (
        <p className="mt-2 text-xs text-app-text-muted">
          Last PIN rotation: {new Date(checkInSettings.public_checkin_pin_rotated_at).toLocaleString()}
        </p>
      )}

      {latestPin && (
        <p className="mt-2 text-sm font-medium text-app-accent-text">
          Current PIN: <span className="font-mono">{latestPin}</span>
        </p>
      )}
      {kioskMessage && <p className="mt-2 text-sm text-app-accent">{kioskMessage}</p>}
      {kioskError && <p className="mt-2 text-sm text-app-accent-text">{kioskError}</p>}
    </div>
  );
}
