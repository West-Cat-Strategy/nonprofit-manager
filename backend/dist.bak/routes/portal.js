"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const portalAuth_1 = require("../middleware/portalAuth");
const portalController_1 = require("../controllers/portalController");
const router = (0, express_1.Router)();
router.use(portalAuth_1.authenticatePortal);
router.get('/profile', portalController_1.getPortalProfile);
router.patch('/profile', portalController_1.updatePortalProfile);
router.get('/relationships', portalController_1.getPortalRelationships);
router.post('/relationships', [
    (0, express_validator_1.body)('relationship_type').isString(),
    (0, express_validator_1.body)('relationship_label').optional().isString(),
    (0, express_validator_1.body)('notes').optional().isString(),
    (0, express_validator_1.body)('related_contact_id').optional().isUUID(),
], portalController_1.createPortalRelationship);
router.put('/relationships/:id', [(0, express_validator_1.param)('id').isUUID()], portalController_1.updatePortalRelationship);
router.delete('/relationships/:id', [(0, express_validator_1.param)('id').isUUID()], portalController_1.deletePortalRelationship);
router.get('/events', portalController_1.getPortalEvents);
router.post('/events/:eventId/register', [(0, express_validator_1.param)('eventId').isUUID()], portalController_1.registerPortalEvent);
router.delete('/events/:eventId/register', [(0, express_validator_1.param)('eventId').isUUID()], portalController_1.cancelPortalEventRegistration);
router.get('/appointments', portalController_1.getPortalAppointments);
router.post('/appointments', [
    (0, express_validator_1.body)('title').isString().notEmpty(),
    (0, express_validator_1.body)('start_time').isISO8601(),
    (0, express_validator_1.body)('end_time').optional().isISO8601(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('location').optional().isString(),
], portalController_1.createPortalAppointment);
router.delete('/appointments/:id', [(0, express_validator_1.param)('id').isUUID()], portalController_1.cancelPortalAppointment);
router.get('/documents', portalController_1.getPortalDocuments);
router.get('/documents/:id/download', [(0, express_validator_1.param)('id').isUUID()], portalController_1.downloadPortalDocument);
router.get('/notes', portalController_1.getPortalNotes);
router.get('/forms', portalController_1.getPortalForms);
router.get('/reminders', portalController_1.getPortalReminders);
exports.default = router;
//# sourceMappingURL=portal.js.map