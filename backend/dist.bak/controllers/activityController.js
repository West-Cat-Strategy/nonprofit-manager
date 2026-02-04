"use strict";
/**
 * Activity Controller
 * Handles activity feed requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEntityActivities = exports.getRecentActivities = void 0;
const activityService_1 = __importDefault(require("../services/activityService"));
const logger_1 = require("../config/logger");
const constants_1 = require("../config/constants");
/**
 * Get recent activities
 * GET /api/activities/recent
 */
const getRecentActivities = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || constants_1.PAGINATION.ACTIVITY_DEFAULT_LIMIT;
        // Validate limit
        if (limit < constants_1.PAGINATION.MIN_LIMIT || limit > constants_1.PAGINATION.ACTIVITY_MAX_LIMIT) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                error: `Limit must be between ${constants_1.PAGINATION.MIN_LIMIT} and ${constants_1.PAGINATION.ACTIVITY_MAX_LIMIT}`,
            });
        }
        const activities = await activityService_1.default.getRecentActivities(limit);
        res.json({
            activities,
            total: activities.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching activities', { error });
        next(error);
    }
};
exports.getRecentActivities = getRecentActivities;
/**
 * Get activities for a specific entity
 * GET /api/activities/:entityType/:entityId
 */
const getEntityActivities = async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        // Validate entity type
        const validTypes = ['case', 'donation', 'volunteer', 'event', 'contact'];
        if (!validTypes.includes(entityType)) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                error: 'Invalid entity type',
            });
        }
        const activities = await activityService_1.default.getActivitiesForEntity(entityType, entityId);
        res.json({
            activities,
            total: activities.length,
        });
    }
    catch (error) {
        const { entityType, entityId } = req.params;
        logger_1.logger.error('Error fetching entity activities', { error, entityType, entityId });
        next(error);
    }
};
exports.getEntityActivities = getEntityActivities;
//# sourceMappingURL=activityController.js.map