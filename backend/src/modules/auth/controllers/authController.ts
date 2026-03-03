export {
  register,
  checkSetupStatus,
  setupFirstUser,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getRegistrationStatus,
} from './registration.controller';

export {
  login,
  logout,
  getCurrentUser,
  checkAccess,
} from './session.controller';

export {
  getPreferences,
  updatePreferences,
  updatePreferenceKey,
} from './preferences.controller';

export {
  getProfile,
  updateProfile,
  changePassword,
} from './profile.controller';
