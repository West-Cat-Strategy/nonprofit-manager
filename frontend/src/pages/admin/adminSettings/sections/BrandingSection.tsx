import type { RefObject } from 'react';
import type { BrandingConfig } from '../../../../types/branding';
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
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text">Application Branding</h2>
          <p className="text-sm text-app-text-muted mt-1">Customise the look and feel of your application</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Application Name
            </label>
            <input
              type="text"
              value={branding.appName}
              onChange={(e) => onBrandingChange('appName', e.target.value)}
              placeholder="Nonprofit Manager"
              className="w-full max-w-md px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
            <p className="mt-1 text-sm text-app-text-muted">This appears in the navigation bar and browser tab</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Application Icon
            </label>
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-app-surface-muted rounded-lg flex items-center justify-center border-2 border-dashed border-app-input-border overflow-hidden">
                {branding.appIcon ? (
                  <img src={branding.appIcon} alt="App icon" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-app-text-subtle">N</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={iconInputRef}
                  accept="image/*"
                  className="hidden"
                  title="Upload application icon"
                  onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0], 'icon')}
                />
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="px-3 py-2 text-sm font-medium text-app-text-muted bg-app-surface border border-app-input-border rounded-lg hover:bg-app-surface-muted"
                >
                  Upload Icon
                </button>
                {branding.appIcon && (
                  <button
                    type="button"
                    onClick={onRemoveIcon}
                    className="ml-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <p className="mt-1 text-sm text-app-text-muted">Recommended: 64x64px, PNG or SVG</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Favicon
            </label>
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-app-surface-muted rounded flex items-center justify-center border border-app-input-border overflow-hidden">
                {branding.favicon ? (
                  <img src={branding.favicon} alt="Favicon" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-app-text-subtle">N</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={faviconInputRef}
                  accept="image/x-icon,image/png,image/svg+xml"
                  className="hidden"
                  title="Upload favicon"
                  onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0], 'favicon')}
                />
                <button
                  type="button"
                  onClick={() => faviconInputRef.current?.click()}
                  className="px-3 py-2 text-sm font-medium text-app-text-muted bg-app-surface border border-app-input-border rounded-lg hover:bg-app-surface-muted"
                >
                  Upload Favicon
                </button>
                {branding.favicon && (
                  <button
                    type="button"
                    onClick={onRemoveFavicon}
                    className="ml-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
                <p className="mt-1 text-sm text-app-text-muted">Recommended: 32x32px, ICO or PNG</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Primary Colour
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={branding.primaryColour}
                  onChange={(e) => onBrandingChange('primaryColour', e.target.value)}
                  title="Select primary colour"
                  className="w-10 h-10 rounded border border-app-input-border cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.primaryColour}
                  onChange={(e) => onBrandingChange('primaryColour', e.target.value)}
                  placeholder="#2563eb"
                  className="w-28 px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Secondary Colour
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={branding.secondaryColour}
                  onChange={(e) => onBrandingChange('secondaryColour', e.target.value)}
                  title="Select secondary colour"
                  className="w-10 h-10 rounded border border-app-input-border cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.secondaryColour}
                  onChange={(e) => onBrandingChange('secondaryColour', e.target.value)}
                  placeholder="#7c3aed"
                  className="w-28 px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-2">
              Preview
            </label>
            <div className="bg-app-text rounded-lg p-4 flex items-center space-x-3">
              <div className="w-8 h-8 bg-app-surface rounded flex items-center justify-center overflow-hidden">
                {branding.appIcon ? (
                  <img src={branding.appIcon} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold" style={{ color: branding.primaryColour }}>
                    {branding.appName[0] || 'N'}
                  </span>
                )}
              </div>
              <span className="text-white font-semibold">{branding.appName || 'Nonprofit Manager'}</span>
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
      </div>
    </div>
  );
}
