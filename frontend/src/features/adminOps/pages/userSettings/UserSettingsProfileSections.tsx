import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import type { UserSettingsPageController } from './useUserSettingsPageController';
import { pronounOptions } from './helpers';
import type { UserProfile } from './types';

type Props = {
  controller: UserSettingsPageController;
};

export default function UserSettingsProfileSections({ controller }: Props) {
  const {
    profile,
    customPronouns,
    setCustomPronouns,
    fieldVisibility,
    toggleFieldVisibility,
    handleChange,
    handleNotificationChange,
  } = controller;

  return (
    <>
      <div
        id="bio-section"
        className="bg-app-surface border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]"
      >
        <div className="bg-[var(--loop-pink)] border-b-4 border-black p-4">
          <h2 className="text-2xl font-black uppercase text-app-brutal-ink">Bio</h2>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'First Name', field: 'firstName', req: true },
            { label: 'Last Name', field: 'lastName', req: true },
            { label: 'Display Name', field: 'displayName', placeholder: 'Included in credit roll' },
            { label: 'Alt Name', field: 'alternativeName', placeholder: 'Nickname' },
            { label: 'Title / Role', field: 'title', placeholder: 'e.g. Keyblade Master' },
          ].map((item) => (
            <div key={item.field} className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor={`user-profile-${item.field}`}
                  className="block font-bold text-sm uppercase tracking-wide"
                >
                  {item.label} {item.req && <span className="text-app-accent">*</span>}
                </label>
                <button
                  type="button"
                  onClick={() => toggleFieldVisibility(item.field)}
                  className="text-app-text-muted hover:text-black transition-all border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] p-1 rounded-sm"
                  title="Toggle Public Visibility"
                >
                  {fieldVisibility[item.field] ? (
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EyeSlashIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <input
                id={`user-profile-${item.field}`}
                type="text"
                value={String(profile[item.field as keyof UserProfile] || '')}
                onChange={(event) =>
                  handleChange(item.field as keyof UserProfile, event.target.value)
                }
                placeholder={item.placeholder || ''}
                className="w-full p-3 border-2 border-black font-medium focus:outline-none shadow-[4px_4px_0px_0px_var(--shadow-color)] focus:-translate-y-1 transition-all"
              />
            </div>
          ))}

          <div className="space-y-2">
            <label
              htmlFor="user-profile-pronouns"
              className="block font-bold text-sm uppercase tracking-wide"
            >
              Pronouns
            </label>
            <div className="flex gap-2">
              <select
                id="user-profile-pronouns"
                value={profile.pronouns}
                onChange={(event) => handleChange('pronouns', event.target.value)}
                className="w-full p-3 border-2 border-black font-medium bg-app-surface focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--shadow-color)] focus:-translate-y-1 transition-all"
              >
                {pronounOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {profile.pronouns === 'custom' && (
                <input
                  type="text"
                  aria-label="Custom pronouns"
                  value={customPronouns}
                  onChange={(event) => setCustomPronouns(event.target.value)}
                  placeholder="Specify"
                  className="w-1/2 p-3 border-2 border-black font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--shadow-color)]"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        id="contact-section"
        className="bg-app-surface border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]"
      >
        <div className="bg-[var(--loop-green)] border-b-4 border-black p-4">
          <h2 className="text-2xl font-black uppercase text-app-brutal-ink">Contact Info</h2>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="user-profile-cell-phone"
              className="block font-bold text-sm uppercase tracking-wide"
            >
              Cell Phone
            </label>
            <div className="flex justify-between items-center mb-1">
              <button
                type="button"
                onClick={() => toggleFieldVisibility('cellPhone')}
                className="text-app-text-muted hover:text-black transition-colors ml-auto"
                title="Toggle Public Visibility"
              >
                {fieldVisibility.cellPhone ? (
                  <EyeIcon className="w-5 h-5" />
                ) : (
                  <EyeSlashIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            <input
              id="user-profile-cell-phone"
              type="text"
              value={profile.cellPhone}
              onChange={(event) => handleChange('cellPhone', event.target.value)}
              className="w-full p-3 border-2 border-black font-medium focus:outline-none shadow-[4px_4px_0px_0px_var(--shadow-color)] focus:-translate-y-1 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="user-profile-email"
              className="block font-bold text-sm uppercase tracking-wide"
            >
              Primary Frequency (Email) <span className="text-app-accent">*</span>
            </label>
            <input
              id="user-profile-email"
              type="email"
              value={profile.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className="w-full p-3 border-2 border-black bg-app-surface-muted font-mono text-app-text-muted cursor-not-allowed"
              disabled
            />
          </div>

          <div className="border-2 border-black p-4 bg-app-surface-muted flex flex-col gap-3">
            <h3 className="font-bold text-sm uppercase">Visibility Settings</h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-all ${
                  profile.emailSharedWithUsers ? 'bg-black' : 'bg-app-surface'
                }`}
              >
                {profile.emailSharedWithUsers && <span className="text-white text-xs">✓</span>}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={profile.emailSharedWithUsers}
                onChange={(event) => handleChange('emailSharedWithUsers', event.target.checked)}
              />
              <span className="font-medium group-hover:underline">
                Broadcast email to other staff
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-all ${
                  profile.emailSharedWithClients ? 'bg-black' : 'bg-app-surface'
                }`}
              >
                {profile.emailSharedWithClients && <span className="text-white text-xs">✓</span>}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={profile.emailSharedWithClients}
                onChange={(event) => handleChange('emailSharedWithClients', event.target.checked)}
              />
              <span className="font-medium group-hover:underline">
                Broadcast email to external contacts
              </span>
            </label>
          </div>
        </div>
      </div>

      <div
        id="notifications-section"
        className="bg-app-surface border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]"
      >
        <div className="bg-[var(--loop-purple)] border-b-4 border-black p-4">
          <h2 className="text-2xl font-black uppercase text-app-brutal-ink">
            Notification Settings
          </h2>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(profile.notifications).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between border-2 border-black p-3 bg-app-surface hover:bg-app-surface-muted transition-colors shadow-[4px_4px_0px_0px_var(--shadow-color)]"
            >
              <span className="font-bold uppercase text-sm">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleNotificationChange(key as keyof typeof profile.notifications, !value)
                }
                aria-label={`${
                  key.replace(/([A-Z])/g, ' $1').trim()
                } notifications ${value ? 'enabled' : 'disabled'}`}
                className={`w-12 h-6 border-2 border-app-border rounded-full relative transition-colors shadow-[2px_2px_0px_0px_var(--shadow-color)] ${
                  value ? 'bg-app-accent-foreground' : 'bg-app-surface-muted'
                }`}
              >
                <div
                  className={`absolute top-0.5 bottom-0.5 w-4 h-4 bg-app-brutal-ink border border-app-border rounded-full transition-all ${
                    value ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
