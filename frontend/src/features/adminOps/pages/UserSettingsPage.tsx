/**
 * User Settings Page - SMB3 "Backstage" Aesthetic
 * Dark background, vibrant props, heavy shadows
 */
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import ThemeSelector from '../../../components/ThemeSelector';
import UserProfileAvatarSection from './userSettings/UserProfileAvatarSection';
import UserSettingsProfileSections from './userSettings/UserSettingsProfileSections';
import UserSettingsSecuritySection from './userSettings/UserSettingsSecuritySection';
import { useUserSettingsPageController } from './userSettings/useUserSettingsPageController';

export default function UserSettingsPage() {
  const controller = useUserSettingsPageController();

  if (controller.isLoading) {
    return (
      <NeoBrutalistLayout pageTitle="USER SETTINGS">
        <div className="min-h-full bg-[#202020] p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#FFD700]" />
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="USER SETTINGS">
      <div className="min-h-full bg-[#202020] p-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-start sticky top-4 z-20">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-app-surface border-2 border-black p-2 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
                <button
                  type="button"
                  onClick={() => controller.setSettingsMode('basic')}
                  className={`px-3 py-2 text-xs font-black uppercase border-2 border-black ${
                    controller.settingsMode === 'basic'
                      ? 'bg-[var(--loop-yellow)]'
                      : 'bg-app-surface-muted'
                  }`}
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => controller.setSettingsMode('advanced')}
                  className={`px-3 py-2 text-xs font-black uppercase border-2 border-black ${
                    controller.settingsMode === 'advanced'
                      ? 'bg-[var(--loop-cyan)]'
                      : 'bg-app-surface-muted'
                  }`}
                >
                  Advanced
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => controller.scrollToSection('profile-section')}
                  className={`px-2 py-1 text-xs font-bold uppercase border-2 border-black ${
                    controller.activeSection === 'profile-section'
                      ? 'bg-[var(--loop-yellow)]'
                      : 'bg-app-surface'
                  }`}
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => controller.scrollToSection('bio-section')}
                  className={`px-2 py-1 text-xs font-bold uppercase border-2 border-black ${
                    controller.activeSection === 'bio-section'
                      ? 'bg-[var(--loop-yellow)]'
                      : 'bg-app-surface'
                  }`}
                >
                  Bio
                </button>
                <button
                  type="button"
                  onClick={() => controller.scrollToSection('contact-section')}
                  className={`px-2 py-1 text-xs font-bold uppercase border-2 border-black ${
                    controller.activeSection === 'contact-section'
                      ? 'bg-[var(--loop-yellow)]'
                      : 'bg-app-surface'
                  }`}
                >
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => controller.scrollToSection('notifications-section')}
                  className={`px-2 py-1 text-xs font-bold uppercase border-2 border-black ${
                    controller.activeSection === 'notifications-section'
                      ? 'bg-[var(--loop-yellow)]'
                      : 'bg-app-surface'
                  }`}
                >
                  Notifications
                </button>
                {controller.settingsMode === 'advanced' && (
                  <button
                    type="button"
                    onClick={() => controller.scrollToSection('security-section')}
                    className={`px-2 py-1 text-xs font-bold uppercase border-2 border-black ${
                      controller.activeSection === 'security-section'
                        ? 'bg-[var(--loop-cyan)]'
                        : 'bg-app-surface'
                    }`}
                  >
                    Security
                  </button>
                )}
              </div>
              <p className="text-xs font-bold uppercase text-app-text-muted">
                Currently viewing:{' '}
                {controller.activeSection.replace('-section', '').replace('-', ' ')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void controller.handleSave()}
              disabled={controller.isSaving || !controller.isProfileDataReady}
              className="px-8 py-3 bg-[var(--loop-yellow)] text-app-brutal-ink font-black uppercase tracking-wider text-xl border-4 border-black shadow-[6px_6px_0px_0px_var(--shadow-color)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shrink-0"
            >
              {controller.isSaving ? (
                <>
                  <span className="animate-spin">⌛</span> SAVING...
                </>
              ) : (
                <>
                  <span>💾</span> SAVE ALL CHANGES
                </>
              )}
            </button>
          </div>

          <div className="bg-app-surface border-2 border-black p-3 font-bold shadow-[4px_4px_0px_0px_var(--shadow-color)] text-sm uppercase tracking-wide">
            {controller.profileLoadState === 'error'
              ? 'Profile data unavailable. Retry to enable saving.'
              : controller.isProfileDirty
                ? 'Unsaved changes'
                : controller.lastSavedAt
                  ? `Saved ${controller.lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                  : 'No pending changes'}
          </div>
          {controller.profileLoadState === 'error' && (
            <div className="bg-[#FFF1CC] border-4 border-black p-4 font-bold shadow-[6px_6px_0px_0px_var(--shadow-color)] flex items-center justify-between gap-4 text-sm uppercase animate-slide-in">
              <span>{controller.profileLoadError}</span>
              <button
                type="button"
                onClick={() => void controller.retryLoadProfile()}
                className="px-4 py-2 bg-[var(--loop-yellow)] text-app-brutal-ink border-2 border-black uppercase tracking-wider"
              >
                Retry Loading Profile
              </button>
            </div>
          )}
          {controller.saveStatus === 'success' && (
            <div className="bg-[#90EE90] border-4 border-black p-4 font-bold shadow-[6px_6px_0px_0px_var(--shadow-color)] flex items-center gap-3 text-lg animate-slide-in">
              <span>✅</span> Profile saved successfully!
            </div>
          )}
          {controller.saveStatus === 'error' && (
            <div className="bg-[#FF6B6B] border-4 border-black p-4 font-bold shadow-[6px_6px_0px_0px_var(--shadow-color)] flex items-center gap-3 text-lg animate-slide-in text-white">
              <span>⚠️</span> {controller.errorMessage || 'Failed to save profile'}
            </div>
          )}

          <div className="w-full">
            <ThemeSelector />
          </div>

          <UserProfileAvatarSection
            fileInputRef={controller.fileInputRef}
            dropZoneRef={controller.dropZoneRef}
            previewImage={controller.previewImage}
            firstName={controller.profile.firstName}
            lastName={controller.profile.lastName}
            isProcessingImage={controller.isProcessingImage}
            isDragging={controller.isDragging}
            onImageUpload={controller.handleImageUpload}
            onDragOver={controller.handleDragOver}
            onDragLeave={controller.handleDragLeave}
            onDrop={controller.handleDrop}
            onRemoveImage={controller.handleRemoveImage}
          />

          <UserSettingsProfileSections controller={controller} />

          {controller.settingsMode === 'advanced' && (
            <UserSettingsSecuritySection controller={controller} />
          )}
        </div>
      </div>
    </NeoBrutalistLayout>
  );
}
