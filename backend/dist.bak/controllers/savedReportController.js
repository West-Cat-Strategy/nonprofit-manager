"use strict";
/**
 * Saved Report Controller
 * Handles HTTP requests for saved report management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSavedReport = exports.updateSavedReport = exports.createSavedReport = exports.getSavedReportById = exports.getSavedReports = void 0;
const savedReportService_1 = require("../services/savedReportService");
const database_1 = __importDefault(require("../config/database"));
const savedReportService = new savedReportService_1.SavedReportService(database_1.default);
/**
 * GET /api/saved-reports
 * Get all saved reports for current user
 */
const getSavedReports = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const entity = req.query.entity;
        const reports = await savedReportService.getSavedReports(userId, entity);
        res.json(reports);
    }
    catch (error) {
        next(error);
    }
};
exports.getSavedReports = getSavedReports;
/**
 * GET /api/saved-reports/:id
 * Get a specific saved report by ID
 */
const getSavedReportById = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const report = await savedReportService.getSavedReportById(id, userId);
        if (!report) {
            res.status(404).json({ error: 'Saved report not found or access denied' });
            return;
        }
        res.json(report);
    }
    catch (error) {
        next(error);
    }
};
exports.getSavedReportById = getSavedReportById;
/**
 * POST /api/saved-reports
 * Create a new saved report
 */
const createSavedReport = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const data = req.body;
        // Validate required fields
        if (!data.name || !data.entity || !data.report_definition) {
            res.status(400).json({ error: 'Name, entity, and report_definition are required' });
            return;
        }
        const report = await savedReportService.createSavedReport(userId, data);
        res.status(201).json(report);
    }
    catch (error) {
        next(error);
    }
};
exports.createSavedReport = createSavedReport;
/**
 * PUT /api/saved-reports/:id
 * Update an existing saved report
 */
const updateSavedReport = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const data = req.body;
        const report = await savedReportService.updateSavedReport(id, userId, data);
        if (!report) {
            res.status(404).json({ error: 'Saved report not found or access denied' });
            return;
        }
        res.json(report);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSavedReport = updateSavedReport;
/**
 * DELETE /api/saved-reports/:id
 * Delete a saved report
 */
const deleteSavedReport = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const success = await savedReportService.deleteSavedReport(id, userId);
        if (!success) {
            res.status(404).json({ error: 'Saved report not found or access denied' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSavedReport = deleteSavedReport;
exports.default = {
    getSavedReports: exports.getSavedReports,
    getSavedReportById: exports.getSavedReportById,
    createSavedReport: exports.createSavedReport,
    updateSavedReport: exports.updateSavedReport,
    deleteSavedReport: exports.deleteSavedReport,
};
//# sourceMappingURL=savedReportController.js.map