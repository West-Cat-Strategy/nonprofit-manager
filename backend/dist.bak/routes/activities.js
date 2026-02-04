"use strict";
/**
 * Activity Routes
 * API routes for activity feed
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activityController_1 = require("../controllers/activityController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/activities/recent
 * Get recent activities across the application
 * Query params:
 *   - limit: number of activities to return (default 10, max 50)
 */
router.get('/recent', activityController_1.getRecentActivities);
/**
 * GET /api/activities/:entityType/:entityId
 * Get activities for a specific entity
 * Path params:
 *   - entityType: case | donation | volunteer | event | contact
 *   - entityId: UUID of the entity
 */
router.get('/:entityType/:entityId', activityController_1.getEntityActivities);
exports.default = router;
//# sourceMappingURL=activities.js.map