import { useCallback, useEffect, useState } from 'react';
import api from '../../../../services/api';
import { useApiError } from '../../../../hooks/useApiError';
import { validatePassword } from '../../../../utils/validation';
import type { SecurityOverview } from './types';

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type TotpSetup = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string | null;
};

const TOTP_SETUP_TIMEOUT_MS = 5 * 60 * 1000;

const getPasswordErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
    return axiosError.response?.data?.error?.message || 'Failed to change password';
  }

  return 'Failed to change password';
};

export default function useUserSecuritySettings() {
  const [security, setSecurity] = useState<SecurityOverview>({ totpEnabled: false, passkeys: [] });
  const [securityLoading, setSecurityLoading] = useState(true);
  const {
    error: securityError,
    details: securityDetails,
    setFromError: setSecurityErrorFromError,
    clear: clearSecurityError,
  } = useApiError();
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [totpSetupExpiresAt, setTotpSetupExpiresAt] = useState<number | null>(null);
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState(0);
  const [totpEnableCode, setTotpEnableCode] = useState('');
  const [totpDisablePassword, setTotpDisablePassword] = useState('');
  const [totpDisableCode, setTotpDisableCode] = useState('');
  const [securityActionLoading, setSecurityActionLoading] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const refreshSecurity = useCallback(async () => {
    clearSecurityError();
    try {
      const response = await api.get<{ totpEnabled: boolean; passkeys: SecurityOverview['passkeys'] }>('/auth/security');
      setSecurity(response.data);
    } catch (error: unknown) {
      setSecurityErrorFromError(error, 'Failed to load security settings');
    } finally {
      setSecurityLoading(false);
    }
  }, [clearSecurityError, setSecurityErrorFromError]);

  useEffect(() => {
    void refreshSecurity();
  }, [refreshSecurity]);

  useEffect(() => {
    if (!totpSetupExpiresAt) {
      setTotpSecondsRemaining(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((totpSetupExpiresAt - Date.now()) / 1000));
      setTotpSecondsRemaining(remaining);

      if (remaining === 0) {
        setTotpSetup(null);
        setTotpSetupExpiresAt(null);
        setTotpEnableCode('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [totpSetupExpiresAt]);

  const handleChangePassword = useCallback(async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const passwordValidationError = validatePassword(passwordData.newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus('idle');
    setPasswordError('');

    try {
      await api.put('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordStatus('success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (error: unknown) {
      setPasswordStatus('error');
      setPasswordError(getPasswordErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwordData]);

  const handleStartTotpSetup = useCallback(async () => {
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      const response = await api.post<{ secret: string; otpauthUrl: string }>('/auth/2fa/totp/enroll');
      const { secret, otpauthUrl } = response.data;
      const qrcode = await import('qrcode');
      const qrDataUrl = await qrcode.toDataURL(otpauthUrl, { margin: 1, width: 192 });
      setTotpSetup({ secret, otpauthUrl, qrDataUrl });
      setTotpSetupExpiresAt(Date.now() + TOTP_SETUP_TIMEOUT_MS);
      setTotpEnableCode('');
    } catch (error: unknown) {
      setSecurityErrorFromError(error, 'Failed to start 2FA setup');
    } finally {
      setSecurityActionLoading(false);
    }
  }, [clearSecurityError, setSecurityErrorFromError]);

  const handleEnableTotp = useCallback(async () => {
    if (!totpEnableCode.trim()) return;
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      await api.post('/auth/2fa/totp/enable', { code: totpEnableCode.trim() });
      setTotpSetup(null);
      setTotpSetupExpiresAt(null);
      setTotpEnableCode('');
      await refreshSecurity();
    } catch (error: unknown) {
      setSecurityErrorFromError(error, 'Failed to enable 2FA');
    } finally {
      setSecurityActionLoading(false);
    }
  }, [clearSecurityError, refreshSecurity, setSecurityErrorFromError, totpEnableCode]);

  const handleDisableTotp = useCallback(async () => {
    if (!totpDisablePassword || !totpDisableCode.trim()) return;
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      await api.post('/auth/2fa/totp/disable', {
        password: totpDisablePassword,
        code: totpDisableCode.trim(),
      });
      setTotpDisablePassword('');
      setTotpDisableCode('');
      await refreshSecurity();
    } catch (error: unknown) {
      setSecurityErrorFromError(error, 'Failed to disable 2FA');
    } finally {
      setSecurityActionLoading(false);
    }
  }, [
    clearSecurityError,
    refreshSecurity,
    setSecurityErrorFromError,
    totpDisableCode,
    totpDisablePassword,
  ]);

  const handleAddPasskey = useCallback(async () => {
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const optionsResp = await api.post<{ challengeId: string; options: unknown }>(
        '/auth/passkeys/register/options'
      );
      const credential = await startRegistration(optionsResp.data.options as never);
      await api.post('/auth/passkeys/register/verify', {
        challengeId: optionsResp.data.challengeId,
        credential,
        name: newPasskeyName.trim() || null,
      });
      setNewPasskeyName('');
      await refreshSecurity();
    } catch (error: unknown) {
      setSecurityErrorFromError(error, 'Failed to add passkey');
    } finally {
      setSecurityActionLoading(false);
    }
  }, [clearSecurityError, newPasskeyName, refreshSecurity, setSecurityErrorFromError]);

  const handleDeletePasskey = useCallback(async (id: string) => {
    clearSecurityError();
    setSecurityActionLoading(true);
    try {
      await api.delete(`/auth/passkeys/${id}`);
      await refreshSecurity();
    } catch (error: unknown) {
      setSecurityErrorFromError(error, 'Failed to delete passkey');
    } finally {
      setSecurityActionLoading(false);
    }
  }, [clearSecurityError, refreshSecurity, setSecurityErrorFromError]);

  return {
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
  };
}
