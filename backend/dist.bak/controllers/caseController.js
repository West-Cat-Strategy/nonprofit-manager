"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCase = exports.getCaseStatuses = exports.getCaseTypes = exports.getCaseSummary = exports.createCaseNote = exports.getCaseNotes = exports.updateCaseStatus = exports.updateCase = exports.getCaseById = exports.getCases = exports.createCase = void 0;
const caseService = __importStar(require("../services/caseService"));
const logger_1 = require("../config/logger");
const constants_1 = require("../config/constants");
const responseHelpers_1 = require("../utils/responseHelpers");
const createCase = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user?.id;
        const newCase = await caseService.createCase(data, userId);
        res.status(201).json(newCase);
    }
    catch (error) {
        logger_1.logger.error('Error creating case:', error);
        res.status(500).json({ error: 'Failed to create case' });
    }
};
exports.createCase = createCase;
const getCases = async (req, res) => {
    try {
        const filter = req.query;
        const { cases, total } = await caseService.getCases(filter);
        res.json({ cases, total, pagination: { page: parseInt(String(filter.page || 1)), limit: parseInt(String(filter.limit || constants_1.PAGINATION.DEFAULT_LIMIT)) } });
    }
    catch (error) {
        logger_1.logger.error('Error fetching cases:', error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
};
exports.getCases = getCases;
const getCaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const caseData = await caseService.getCaseById(id);
        if (!caseData) {
            (0, responseHelpers_1.notFound)(res, 'Case');
            return;
        }
        res.json(caseData);
    }
    catch (error) {
        logger_1.logger.error('Error fetching case:', error);
        res.status(500).json({ error: 'Failed to fetch case' });
    }
};
exports.getCaseById = getCaseById;
const updateCase = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const userId = req.user?.id;
        const updated = await caseService.updateCase(id, data, userId);
        res.json(updated);
    }
    catch (error) {
        logger_1.logger.error('Error updating case:', error);
        res.status(500).json({ error: 'Failed to update case' });
    }
};
exports.updateCase = updateCase;
const updateCaseStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const userId = req.user?.id;
        const updated = await caseService.updateCaseStatus(id, data, userId);
        res.json(updated);
    }
    catch (error) {
        logger_1.logger.error('Error updating case status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};
exports.updateCaseStatus = updateCaseStatus;
const getCaseNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const notes = await caseService.getCaseNotes(id);
        res.json({ notes });
    }
    catch (error) {
        logger_1.logger.error('Error fetching case notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
};
exports.getCaseNotes = getCaseNotes;
const createCaseNote = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user?.id;
        const note = await caseService.createCaseNote(data, userId);
        res.status(201).json(note);
    }
    catch (error) {
        logger_1.logger.error('Error creating case note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
};
exports.createCaseNote = createCaseNote;
const getCaseSummary = async (_req, res) => {
    try {
        const summary = await caseService.getCaseSummary();
        res.json(summary);
    }
    catch (error) {
        logger_1.logger.error('Error fetching case summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
};
exports.getCaseSummary = getCaseSummary;
const getCaseTypes = async (_req, res) => {
    try {
        const types = await caseService.getCaseTypes();
        res.json({ types });
    }
    catch (error) {
        logger_1.logger.error('Error fetching case types:', error);
        res.status(500).json({ error: 'Failed to fetch types' });
    }
};
exports.getCaseTypes = getCaseTypes;
const getCaseStatuses = async (_req, res) => {
    try {
        const statuses = await caseService.getCaseStatuses();
        res.json({ statuses });
    }
    catch (error) {
        logger_1.logger.error('Error fetching case statuses:', error);
        res.status(500).json({ error: 'Failed to fetch statuses' });
    }
};
exports.getCaseStatuses = getCaseStatuses;
const deleteCase = async (req, res) => {
    try {
        const { id } = req.params;
        await caseService.deleteCase(id);
        res.json({ success: true, message: 'Case deleted' });
    }
    catch (error) {
        logger_1.logger.error('Error deleting case:', error);
        res.status(500).json({ error: 'Failed to delete case' });
    }
};
exports.deleteCase = deleteCase;
//# sourceMappingURL=caseController.js.map