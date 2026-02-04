"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const mfaController_1 = require("../controllers/mfaController");
const passkeyController_1 = require("../controllers/passkeyController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const accountLockout_1 = require("../middleware/accountLockout");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_1.registrationLimiter, [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Last name is required'),
], authController_1.register);
router.post('/login', rateLimiter_1.authLimiter, accountLockout_1.checkAccountLockout, [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
], authController_1.login);
router.post('/login/2fa', rateLimiter_1.authLimiter, accountLockout_1.checkAccountLockout, [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('mfaToken').notEmpty().withMessage('MFA token is required'),
    (0, express_validator_1.body)('code')
        .trim()
        .matches(/^[0-9]{6}$/)
        .withMessage('Authentication code must be 6 digits'),
], mfaController_1.completeTotpLogin);
router.get('/me', auth_1.authenticate, authController_1.getCurrentUser);
// Security (MFA / passkeys) overview
router.get('/security', auth_1.authenticate, mfaController_1.getSecurityOverview);
// User preferences routes
router.get('/preferences', auth_1.authenticate, authController_1.getPreferences);
router.put('/preferences', auth_1.authenticate, authController_1.updatePreferences);
router.patch('/preferences/:key', auth_1.authenticate, authController_1.updatePreferenceKey);
// User profile routes
router.get('/profile', auth_1.authenticate, authController_1.getProfile);
router.put('/profile', auth_1.authenticate, [
    (0, express_validator_1.body)('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
], authController_1.updateProfile);
// Password change route
router.put('/password', auth_1.authenticate, [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
], authController_1.changePassword);
// TOTP 2FA management
router.post('/2fa/totp/enroll', auth_1.authenticate, mfaController_1.enrollTotp);
router.post('/2fa/totp/enable', auth_1.authenticate, [(0, express_validator_1.body)('code').trim().matches(/^[0-9]{6}$/).withMessage('Authentication code must be 6 digits')], mfaController_1.enableTotp);
router.post('/2fa/totp/disable', auth_1.authenticate, [
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
    (0, express_validator_1.body)('code')
        .trim()
        .matches(/^[0-9]{6}$/)
        .withMessage('Authentication code must be 6 digits'),
], mfaController_1.disableTotp);
// Passkeys (WebAuthn)
router.get('/passkeys', auth_1.authenticate, passkeyController_1.listPasskeys);
router.delete('/passkeys/:id', auth_1.authenticate, passkeyController_1.deletePasskey);
router.post('/passkeys/register/options', auth_1.authenticate, passkeyController_1.registrationOptions);
router.post('/passkeys/register/verify', auth_1.authenticate, [(0, express_validator_1.body)('challengeId').notEmpty().withMessage('challengeId is required'), (0, express_validator_1.body)('credential').notEmpty()], passkeyController_1.registrationVerify);
router.post('/passkeys/login/options', rateLimiter_1.authLimiter, accountLockout_1.checkAccountLockout, [(0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required')], passkeyController_1.loginOptions);
router.post('/passkeys/login/verify', rateLimiter_1.authLimiter, accountLockout_1.checkAccountLockout, [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('challengeId').notEmpty().withMessage('challengeId is required'),
    (0, express_validator_1.body)('credential').notEmpty(),
], passkeyController_1.loginVerify);
// Setup routes (no authentication required)
router.get('/setup-status', authController_1.checkSetupStatus);
router.post('/setup', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Last name is required'),
], authController_1.setupFirstUser);
exports.default = router;
//# sourceMappingURL=auth.js.map