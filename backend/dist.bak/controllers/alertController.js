"use strict";
/**
 * Alert Controller
 * HTTP request handlers for alert configuration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlertStats = exports.resolveAlert = exports.acknowledgeAlert = exports.getAlertInstances = exports.testAlertConfig = exports.toggleAlertConfig = exports.deleteAlertConfig = exports.updateAlertConfig = exports.createAlertConfig = exports.getAlertConfig = exports.getAlertConfigs = void 0;
const alertService_1 = require("../services/alertService");
const database_1 = __importDefault(require("../config/database"));
const alertService = new alertService_1.AlertService(database_1.default);
/**
 * GET /api/alerts/configs
 * Get all alert configurations for current user
 */
const getAlertConfigs = async (req, res, next) => {
    try {
        const alerts = await alertService.getUserAlerts(req.user.id);
        res.json(alerts);
    }
    catch (error) {
        next(error);
    }
};
exports.getAlertConfigs = getAlertConfigs;
/**
 * GET /api/alerts/configs/:id
 * Get a specific alert configuration
 */
const getAlertConfig = async (req, res, next) => {
    try {
        const { id } = req.params;
        const alert = await alertService.getAlert(id, req.user.id);
        if (!alert) {
            res.status(404).json({ error: 'Alert configuration not found' });
            return;
        }
        res.json(alert);
    }
    catch (error) {
        next(error);
    }
};
exports.getAlertConfig = getAlertConfig;
/**
 * POST /api/alerts/configs
 * Create a new alert configuration
 */
const createAlertConfig = async (req, res, next) => {
    try {
        const data = {
            ...req.body,
            user_id: req.user.id,
        };
        const alert = await alertService.createAlert(data);
        res.status(201).json(alert);
    }
    catch (error) {
        next(error);
    }
};
exports.createAlertConfig = createAlertConfig;
/**
 * PUT /api/alerts/configs/:id
 * Update alert configuration
 */
const updateAlertConfig = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const alert = await alertService.updateAlert(id, req.user.id, data);
        if (!alert) {
            res.status(404).json({ error: 'Alert configuration not found' });
            return;
        }
        res.json(alert);
    }
    catch (error) {
        next(error);
    }
};
exports.updateAlertConfig = updateAlertConfig;
/**
 * DELETE /api/alerts/configs/:id
 * Delete alert configuration
 */
const deleteAlertConfig = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await alertService.deleteAlert(id, req.user.id);
        if (!deleted) {
            res.status(404).json({ error: 'Alert configuration not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteAlertConfig = deleteAlertConfig;
/**
 * PATCH /api/alerts/configs/:id/toggle
 * Toggle alert enabled status
 */
const toggleAlertConfig = async (req, res, next) => {
    try {
        const { id } = req.params;
        const alert = await alertService.toggleAlert(id, req.user.id);
        if (!alert) {
            res.status(404).json({ error: 'Alert configuration not found' });
            return;
        }
        res.json(alert);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleAlertConfig = toggleAlertConfig;
/**
 * POST /api/alerts/test
 * Test alert configuration without saving
 */
const testAlertConfig = async (req, res, next) => {
    try {
        const data = {
            ...req.body,
            user_id: req.user.id,
        };
        const result = await alertService.testAlert(data);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.testAlertConfig = testAlertConfig;
/**
 * GET /api/alerts/instances
 * Get alert instances (triggered alerts)
 */
const getAlertInstances = async (req, res, next) => {
    try {
        const filters = {
            status: req.query.status,
            severity: req.query.severity,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        };
        const instances = await alertService.getAlertInstances(filters);
        res.json(instances);
    }
    catch (error) {
        next(error);
    }
};
exports.getAlertInstances = getAlertInstances;
/**
 * PATCH /api/alerts/instances/:id/acknowledge
 * Acknowledge an alert instance
 */
const acknowledgeAlert = async (req, res, next) => {
    try {
        const { id } = req.params;
        const instance = await alertService.acknowledgeAlert(id, req.user.id);
        if (!instance) {
            res.status(404).json({ error: 'Alert instance not found' });
            return;
        }
        res.json(instance);
    }
    catch (error) {
        next(error);
    }
};
exports.acknowledgeAlert = acknowledgeAlert;
/**
 * PATCH /api/alerts/instances/:id/resolve
 * Resolve an alert instance
 */
const resolveAlert = async (req, res, next) => {
    try {
        const { id } = req.params;
        const instance = await alertService.resolveAlert(id);
        if (!instance) {
            res.status(404).json({ error: 'Alert instance not found' });
            return;
        }
        res.json(instance);
    }
    catch (error) {
        next(error);
    }
};
exports.resolveAlert = resolveAlert;
/**
 * GET /api/alerts/stats
 * Get alert statistics for current user
 */
const getAlertStats = async (req, res, next) => {
    try {
        const stats = await alertService.getAlertStats(req.user.id);
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
};
exports.getAlertStats = getAlertStats;
exports.default = {
    getAlertConfigs: exports.getAlertConfigs,
    getAlertConfig: exports.getAlertConfig,
    createAlertConfig: exports.createAlertConfig,
    updateAlertConfig: exports.updateAlertConfig,
    deleteAlertConfig: exports.deleteAlertConfig,
    toggleAlertConfig: exports.toggleAlertConfig,
    testAlertConfig: exports.testAlertConfig,
    getAlertInstances: exports.getAlertInstances,
    acknowledgeAlert: exports.acknowledgeAlert,
    resolveAlert: exports.resolveAlert,
    getAlertStats: exports.getAlertStats,
};
//# sourceMappingURL=alertController.js.map