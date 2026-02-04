"use strict";
/**
 * Dashboard Controller
 * HTTP request handlers for dashboard configuration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDashboard = exports.updateDashboardLayout = exports.updateDashboard = exports.createDashboard = exports.getDefaultDashboard = exports.getDashboard = exports.getDashboards = void 0;
const dashboardService_1 = require("../services/dashboardService");
const database_1 = __importDefault(require("../config/database"));
const dashboardService = new dashboardService_1.DashboardService(database_1.default);
/**
 * GET /api/dashboard/configs
 * Get all dashboard configurations for current user
 */
const getDashboards = async (req, res, next) => {
    try {
        const dashboards = await dashboardService.getUserDashboards(req.user.id);
        res.json(dashboards);
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboards = getDashboards;
/**
 * GET /api/dashboard/configs/:id
 * Get a specific dashboard configuration
 */
const getDashboard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const dashboard = await dashboardService.getDashboard(id, req.user.id);
        if (!dashboard) {
            res.status(404).json({ error: 'Dashboard configuration not found' });
            return;
        }
        res.json(dashboard);
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboard = getDashboard;
/**
 * GET /api/dashboard/configs/default
 * Get user's default dashboard
 */
const getDefaultDashboard = async (req, res, next) => {
    try {
        let dashboard = await dashboardService.getDefaultDashboard(req.user.id);
        // If no default dashboard exists, create one
        if (!dashboard) {
            dashboard = await dashboardService.createDefaultDashboard(req.user.id);
        }
        res.json(dashboard);
    }
    catch (error) {
        next(error);
    }
};
exports.getDefaultDashboard = getDefaultDashboard;
/**
 * POST /api/dashboard/configs
 * Create a new dashboard configuration
 */
const createDashboard = async (req, res, next) => {
    try {
        const data = {
            ...req.body,
            user_id: req.user.id, // Override user_id with authenticated user
        };
        const dashboard = await dashboardService.createDashboard(data);
        res.status(201).json(dashboard);
    }
    catch (error) {
        next(error);
    }
};
exports.createDashboard = createDashboard;
/**
 * PUT /api/dashboard/configs/:id
 * Update dashboard configuration
 */
const updateDashboard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const dashboard = await dashboardService.updateDashboard(id, req.user.id, data);
        if (!dashboard) {
            res.status(404).json({ error: 'Dashboard configuration not found' });
            return;
        }
        res.json(dashboard);
    }
    catch (error) {
        next(error);
    }
};
exports.updateDashboard = updateDashboard;
/**
 * PUT /api/dashboard/configs/:id/layout
 * Update only the layout of a dashboard
 */
const updateDashboardLayout = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { layout } = req.body;
        if (!Array.isArray(layout)) {
            res.status(400).json({ error: 'Layout must be an array' });
            return;
        }
        const dashboard = await dashboardService.updateDashboardLayout(id, req.user.id, layout);
        if (!dashboard) {
            res.status(404).json({ error: 'Dashboard configuration not found' });
            return;
        }
        res.json(dashboard);
    }
    catch (error) {
        next(error);
    }
};
exports.updateDashboardLayout = updateDashboardLayout;
/**
 * DELETE /api/dashboard/configs/:id
 * Delete dashboard configuration
 */
const deleteDashboard = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Check if this is the default dashboard
        const dashboard = await dashboardService.getDashboard(id, req.user.id);
        if (dashboard?.is_default) {
            res.status(400).json({ error: 'Cannot delete default dashboard. Set another dashboard as default first.' });
            return;
        }
        const deleted = await dashboardService.deleteDashboard(id, req.user.id);
        if (!deleted) {
            res.status(404).json({ error: 'Dashboard configuration not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteDashboard = deleteDashboard;
exports.default = {
    getDashboards: exports.getDashboards,
    getDashboard: exports.getDashboard,
    getDefaultDashboard: exports.getDefaultDashboard,
    createDashboard: exports.createDashboard,
    updateDashboard: exports.updateDashboard,
    updateDashboardLayout: exports.updateDashboardLayout,
    deleteDashboard: exports.deleteDashboard,
};
//# sourceMappingURL=dashboardController.js.map