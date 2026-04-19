import ErrorBanner from '../../../../components/ErrorBanner';
import type { UserSettingsPageController } from './useUserSettingsPageController';

type Props = {
  controller: UserSettingsPageController;
};

export default function UserSettingsSecuritySection({ controller }: Props) {
  const {
    security: {
      security,
      securityLoading,
      securityError,
      securityDetails,
      totpSetup,
      setTotpSetup,
      setTotpSetupExpiresAt,
      totpSecondsRemaining,
      totpEnableCode,
      setTotpEnableCode,
      totpDisablePassword,
      setTotpDisablePassword,
      totpDisableCode,
      setTotpDisableCode,
      securityActionLoading,
      newPasskeyName,
      setNewPasskeyName,
      showPasswordSection,
      setShowPasswordSection,
      passwordData,
      setPasswordData,
      passwordError,
      passwordStatus,
      isChangingPassword,
      handleChangePassword,
      handleStartTotpSetup,
      handleEnableTotp,
      handleDisableTotp,
      handleAddPasskey,
      handleDeletePasskey,
    },
  } = controller;

  return (
    <div
      id="security-section"
      className="bg-app-surface border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]"
    >
      <div className="bg-[var(--loop-cyan)] border-b-4 border-black p-4">
        <h2 className="text-2xl font-black uppercase text-app-brutal-ink">Security</h2>
      </div>
      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-app-text-heading">Password</h3>
              <p className="text-sm text-app-text-muted">Change your account password</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="px-4 py-2 bg-app-surface text-app-text font-bold uppercase text-sm border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_var(--shadow-color)] transition-all"
            >
              {showPasswordSection ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {passwordStatus === 'success' && (
            <div className="bg-app-accent-soft border-2 border-app-accent p-3 mb-3">
              <span className="font-bold text-app-accent-text">
                Password changed successfully!
              </span>
            </div>
          )}

          {showPasswordSection && (
            <div className="space-y-3 border-2 border-black p-4 bg-app-surface-muted shadow-[4px_4px_0px_0px_var(--shadow-color)]">
              {passwordError && (
                <div className="bg-app-accent-soft border-2 border-app-border p-3">
                  <span className="font-bold text-app-accent-text">{passwordError}</span>
                </div>
              )}
              <div>
                <label
                  htmlFor="user-password-current"
                  className="block text-sm font-bold uppercase mb-1"
                >
                  Current Password
                </label>
                <input
                  id="user-password-current"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(event) =>
                    setPasswordData((previous) => ({
                      ...previous,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border-2 border-black bg-app-surface font-medium shadow-[2px_2px_0px_0px_var(--shadow-color)]"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label
                  htmlFor="user-password-new"
                  className="block text-sm font-bold uppercase mb-1"
                >
                  New Password
                </label>
                <input
                  id="user-password-new"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(event) =>
                    setPasswordData((previous) => ({
                      ...previous,
                      newPassword: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border-2 border-black bg-app-surface font-medium shadow-[2px_2px_0px_0px_var(--shadow-color)]"
                  placeholder="Min 8 chars, upper, lower, number"
                />
              </div>
              <div>
                <label
                  htmlFor="user-password-confirm"
                  className="block text-sm font-bold uppercase mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  id="user-password-confirm"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(event) =>
                    setPasswordData((previous) => ({
                      ...previous,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border-2 border-black bg-app-surface font-medium shadow-[2px_2px_0px_0px_var(--shadow-color)]"
                  placeholder="Re-enter new password"
                />
              </div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  !passwordData.currentPassword ||
                  !passwordData.newPassword ||
                  !passwordData.confirmPassword
                }
                className="px-6 py-2 bg-[var(--loop-cyan)] text-black font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_var(--shadow-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? 'Changing...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-app-border">
          <h3 className="text-sm font-semibold text-app-text-heading">
            Two-Factor Authentication (2FA)
          </h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Use an authenticator app (TOTP) to protect your account.
          </p>

          {securityLoading ? (
            <div className="mt-3 text-sm text-app-text-muted">Loading security settings…</div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-app-text-muted">
                Status:{' '}
                <span
                  className={
                    security.totpEnabled
                      ? 'text-app-accent-text font-medium'
                      : 'text-app-text-muted font-medium'
                  }
                >
                  {security.totpEnabled ? 'Enabled' : 'Not enabled'}
                </span>
              </div>
              {!security.totpEnabled ? (
                <button
                  type="button"
                  onClick={handleStartTotpSetup}
                  disabled={securityActionLoading}
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] font-medium rounded-lg hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
                >
                  {securityActionLoading ? 'Starting…' : 'Enable 2FA'}
                </button>
              ) : null}
            </div>
          )}

          <ErrorBanner
            message={securityError}
            correlationId={securityDetails?.correlationId}
            className="mt-3"
          />

          {!security.totpEnabled && totpSetup && (
            <div className="mt-4 bg-app-surface-muted border border-app-border rounded-lg p-4">
              {totpSecondsRemaining > 0 && (
                <div
                  className={`mb-4 p-3 rounded-lg border ${
                    totpSecondsRemaining < 60
                      ? 'bg-app-accent-soft border-app-border text-app-accent-text'
                      : 'bg-app-accent-soft border-app-border text-app-accent-text'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{totpSecondsRemaining < 60 ? '⚠️' : '⏱️'}</span>
                    <span className="font-medium">
                      Setup expires in {Math.floor(totpSecondsRemaining / 60)}:
                      {(totpSecondsRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  {totpSecondsRemaining < 60 && (
                    <p className="text-sm mt-1">
                      Complete setup now or the secret will be cleared for security.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                {totpSetup.qrDataUrl && (
                  <img
                    src={totpSetup.qrDataUrl}
                    alt="2FA QR code"
                    className="w-48 h-48 border border-app-border rounded bg-app-surface"
                  />
                )}
                <div className="mt-4 md:mt-0 flex-1">
                  <p className="text-sm text-app-text-muted">
                    Scan this QR code with your authenticator app, or enter the secret manually.
                  </p>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-app-text-muted mb-1">
                      Secret
                    </label>
                    <div className="font-mono text-sm bg-app-surface border border-app-border rounded px-3 py-2 break-all">
                      {totpSetup.secret}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label
                      htmlFor="user-totp-enable-code"
                      className="block text-xs font-medium text-app-text-muted mb-1"
                    >
                      Enter 6-digit code to confirm
                    </label>
                    <input
                      id="user-totp-enable-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={totpEnableCode}
                      onChange={(event) => setTotpEnableCode(event.target.value)}
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                    />
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      type="button"
                      onClick={handleEnableTotp}
                      disabled={securityActionLoading}
                      className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] font-medium rounded-lg hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
                    >
                      {securityActionLoading ? 'Enabling…' : 'Confirm & Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTotpSetup(null);
                        setTotpSetupExpiresAt(null);
                        setTotpEnableCode('');
                      }}
                      className="px-4 py-2 text-app-text-muted font-medium rounded-lg hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {security.totpEnabled && (
            <div className="mt-4 bg-app-surface-muted border border-app-border rounded-lg p-4">
              <p className="text-sm text-app-text-muted">
                To disable 2FA, confirm your password and a current authentication code.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="user-totp-disable-password"
                    className="block text-xs font-medium text-app-text-muted mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="user-totp-disable-password"
                    type="password"
                    value={totpDisablePassword}
                    onChange={(event) => setTotpDisablePassword(event.target.value)}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="user-totp-disable-code"
                    className="block text-xs font-medium text-app-text-muted mb-1"
                  >
                    6-digit code
                  </label>
                  <input
                    id="user-totp-disable-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpDisableCode}
                    onChange={(event) => setTotpDisableCode(event.target.value)}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleDisableTotp}
                  disabled={securityActionLoading}
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] font-medium rounded-lg hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
                >
                  {securityActionLoading ? 'Disabling…' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-app-border">
          <h3 className="text-sm font-semibold text-app-text-heading">Passkeys</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Use passkeys to sign in with your device biometrics or screen lock.
          </p>

          <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="w-full md:max-w-sm">
              <label
                htmlFor="user-passkey-name"
                className="block text-xs font-medium text-app-text-muted mb-1"
              >
                Passkey name (optional)
              </label>
              <input
                id="user-passkey-name"
                value={newPasskeyName}
                onChange={(event) => setNewPasskeyName(event.target.value)}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                placeholder="e.g., MacBook Touch ID"
              />
            </div>
            <button
              type="button"
              onClick={handleAddPasskey}
              disabled={securityActionLoading}
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] font-medium rounded-lg hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
            >
              {securityActionLoading ? 'Adding…' : 'Add passkey'}
            </button>
          </div>

          {security.passkeys.length === 0 ? (
            <div className="mt-4 text-sm text-app-text-muted">No passkeys registered.</div>
          ) : (
            <ul className="mt-4 divide-y divide-app-border border border-app-border rounded-lg bg-app-surface overflow-hidden">
              {security.passkeys.map((passkey) => (
                <li key={passkey.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-app-text">
                      {passkey.name || 'Passkey'}
                    </div>
                    <div className="text-xs text-app-text-muted">
                      Added {new Date(passkey.createdAt).toLocaleString('en-CA')}
                      {passkey.lastUsedAt
                        ? ` • Last used ${new Date(passkey.lastUsedAt).toLocaleString('en-CA')}`
                        : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePasskey(passkey.id)}
                    disabled={securityActionLoading}
                    className="px-3 py-1.5 text-sm font-medium text-app-accent-text hover:text-app-accent-text hover:bg-app-accent-soft rounded"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
