"use strict";
/**
 * Report Controller
 * Handles HTTP requests for custom report generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableFields = exports.generateReport = void 0;
const reportService_1 = require("../services/reportService");
const database_1 = __importDefault(require("../config/database"));
const reportService = new reportService_1.ReportService(database_1.default);
/**
 * POST /api/reports/generate
 * Generate a custom report based on definition
 */
const generateReport = async (req, res, next) => {
    try {
        const definition = req.body;
        // Validate definition
        if (!definition.entity) {
            res.status(400).json({ error: 'Entity is required' });
            return;
        }
        if (!definition.fields || definition.fields.length === 0) {
            res.status(400).json({ error: 'At least one field must be selected' });
            return;
        }
        const result = await reportService.generateReport(definition);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.generateReport = generateReport;
/**
 * GET /api/reports/fields/:entity
 * Get available fields for an entity type
 */
const getAvailableFields = async (req, res, next) => {
    try {
        const entity = req.params.entity;
        const validEntities = ['accounts', 'contacts', 'donations', 'events', 'volunteers', 'tasks'];
        if (!validEntities.includes(entity)) {
            res.status(400).json({ error: 'Invalid entity type' });
            return;
        }
        const fields = await reportService.getAvailableFields(entity);
        res.json(fields);
    }
    catch (error) {
        next(error);
    }
};
exports.getAvailableFields = getAvailableFields;
exports.default = {
    generateReport: exports.generateReport,
    getAvailableFields: exports.getAvailableFields,
};
//# sourceMappingURL=reportController.js.map