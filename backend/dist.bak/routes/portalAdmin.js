"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const portalAdminController_1 = require("../controllers/portalAdminController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/requests', portalAdminController_1.listPortalSignupRequests);
router.post('/requests/:id/approve', [(0, express_validator_1.param)('id').isUUID(), validation_1.handleValidationErrors], portalAdminController_1.approvePortalSignupRequest);
router.post('/requests/:id/reject', [(0, express_validator_1.param)('id').isUUID(), (0, express_validator_1.body)('notes').optional().isString(), validation_1.handleValidationErrors], portalAdminController_1.rejectPortalSignupRequest);
router.get('/invitations', portalAdminController_1.listPortalInvitations);
router.get('/users', portalAdminController_1.listPortalUsers);
router.patch('/users/:id', [(0, express_validator_1.param)('id').isUUID(), validation_1.handleValidationErrors], portalAdminController_1.updatePortalUserStatus);
router.get('/users/:id/activity', [(0, express_validator_1.param)('id').isUUID(), validation_1.handleValidationErrors], portalAdminController_1.getPortalUserActivity);
router.post('/invitations', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('contact_id').optional().isUUID(),
    (0, express_validator_1.body)('expiresInDays').optional().isInt({ min: 1, max: 90 }),
    validation_1.handleValidationErrors,
], portalAdminController_1.createPortalInvitation);
router.post('/reset-password', [(0, express_validator_1.body)('portalUserId').isUUID(), (0, express_validator_1.body)('password').isLength({ min: 8 }), validation_1.handleValidationErrors], portalAdminController_1.resetPortalUserPassword);
exports.default = router;
//# sourceMappingURL=portalAdmin.js.map