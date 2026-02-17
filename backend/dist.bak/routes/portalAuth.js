"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const portalAuthController_1 = require("../controllers/portalAuthController");
const portalAuth_1 = require("../middleware/portalAuth");
const router = (0, express_1.Router)();
router.post('/signup', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
    (0, express_validator_1.body)('firstName').isString().notEmpty(),
    (0, express_validator_1.body)('lastName').isString().notEmpty(),
    (0, express_validator_1.body)('phone').optional().isString(),
], portalAuthController_1.portalSignup);
router.post('/login', [(0, express_validator_1.body)('email').isEmail().normalizeEmail(), (0, express_validator_1.body)('password').isString()], portalAuthController_1.portalLogin);
router.get('/me', portalAuth_1.authenticatePortal, portalAuthController_1.getPortalMe);
router.get('/invitations/validate/:token', [(0, express_validator_1.param)('token').isString().notEmpty()], portalAuthController_1.validatePortalInvitation);
router.post('/invitations/accept/:token', [
    (0, express_validator_1.param)('token').isString().notEmpty(),
    (0, express_validator_1.body)('firstName').isString().notEmpty(),
    (0, express_validator_1.body)('lastName').isString().notEmpty(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
], portalAuthController_1.acceptPortalInvitation);
exports.default = router;
//# sourceMappingURL=portalAuth.js.map