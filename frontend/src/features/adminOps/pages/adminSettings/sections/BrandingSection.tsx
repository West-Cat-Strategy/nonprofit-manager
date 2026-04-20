import type { RefObject } from 'react';
import type { BrandingConfig } from '../../../../../types/branding';
import type { SaveStatus } from '../types';
import SaveBar from '../components/SaveBar';

interface BrandingSectionProps {
  branding: BrandingConfig;
  onBrandingChange: (field: string, value: string) => void;
  onImageUpload: (file: File, type: 'icon' | 'favicon') => void;
  onRemoveIcon: () => void;
  onRemoveFavicon: () => void;
  iconInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: SaveStatus;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

export default function BrandingSection({
  branding,
  onBrandingChange,
  onImageUpload,
  onRemoveIcon,
  onRemoveFavicon,
  iconInputRef,
  faviconInputRef,
  onSave,
  isSaving,
  saveStatus,
  isDirty,
  lastSavedAt,
}: BrandingSectionProps) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h2 className="text-lg font-semibold text-app-text">Application Branding</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Keep the name, browser tab, favicon, and primary colors aligned with the live app shell.
          </p>
        </div>

        <div className="space-y-8 p-6">
          <div className="space-y-2">
            <label
              htmlFor="branding-app-name"
              className="block text-sm font-medium text-app-text-muted"
            >
              Application Name
            </label>
            <input
              id="branding-app-name"
              type="text"
              value={branding.appName}
              onChange={(e) => onBrandingChange('appName', e.target.value)}
              placeholder="Nonprofit Manager"
              className="w-full max-w-md rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
            <p className="text-sm text-app-text-muted">
              This appears in the navigation bar and browser tab.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-app-text-muted">
                  Application Icon
                </label>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-app-input-border bg-app-surface-muted">
                    {branding.appIcon ? (
                      <img
                        src={branding.appIcon}
                        alt="App icon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-app-text-subtle">N</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={iconInputRef}
                      accept="image/*"
                      className="hidden"
                      title="Upload application icon"
                      onChange={(e) =>
                        e.target.files?.[0] && onImageUpload(e.target.files[0], 'icon')
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        className="rounded-lg border border-app-input-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted"
                      >
                        Upload Icon
                      </button>
                      {branding.appIcon && (
                        <button
                          type="button"
                          onClick={onRemoveIcon}
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-accent hover:bg-app-hover"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-app-text-muted">Recommended: 64x64px, PNG or SVG</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-app-text-muted">Favicon</label>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded border border-app-input-border bg-app-surface-muted">
                    {branding.favicon ? (
                      <img
                        src={branding.favicon}
                        alt="Favicon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-app-text-subtle">N</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={faviconInputRef}
                      accept="image/x-icon,image/png,image/svg+xml"
                      className="hidden"
                      title="Upload favicon"
                      onChange={(e) =>
                        e.target.files?.[0] && onImageUpload(e.target.files[0], 'favicon')
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        className="rounded-lg border border-app-input-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted"
                      >
                        Upload Favicon
                      </button>
                      {branding.favicon && (
                        <button
                          type="button"
                          onClick={onRemoveFavicon}
                          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-accent hover:bg-app-hover"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-app-text-muted">Recommended: 32x32px, ICO or PNG</p>
                  </div>
                </div>
              </div>
            </div>

            <fieldset className="space-y-4 rounded-lg border border-app-border bg-app-surface-muted p-4">
              <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-app-text-muted">
                Colors
              </legend>
              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-app-text-muted">
                    Primary Colour
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.primaryColour}
                      onChange={(e) => onBrandingChange('primaryColour', e.target.value)}
                      title="Select primary colour"
                      className="h-10 w-10 cursor-pointer rounded border border-app-input-border"
                    />
                    <input
                      type="text"
                      aria-label="Primary colour value"
                      value={branding.primaryColour}
                      onChange={(e) => onBrandingChange('primaryColour', e.target.value)}
                      placeholder="#2563eb"
                      className="w-28 rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-medium text-app-text-muted">
                    Secondary Colour
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.secondaryColour}
                      onChange={(e) => onBrandingChange('secondaryColour', e.target.value)}
                      title="Select secondary colour"
                      className="h-10 w-10 cursor-pointer rounded border border-app-input-border"
                    />
                    <input
                      type="text"
                      aria-label="Secondary colour value"
                      value={branding.secondaryColour}
                      onChange={(e) => onBrandingChange('secondaryColour', e.target.value)}
                      placeholder="#7c3aed"
                      className="w-28 rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-app-text-muted">Preview</label>
            <div className="flex items-center gap-3 rounded-lg bg-app-text p-4">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-app-surface">
                {branding.appIcon ? (
                  <img src={branding.appIcon} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-app-accent">
                    {branding.appName[0] || 'N'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {branding.appName || 'Nonprofit Manager'}
                </p>
                <p className="text-xs text-white/80">This preview mirrors the live header chrome.</p>
              </div>
            </div>
          </div>
        </div>

        <SaveBar
          isSaving={isSaving}
          saveStatus={saveStatus}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
          onSave={onSave}
        />
      </section>
    </div>
  );
}
