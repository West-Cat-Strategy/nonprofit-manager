"use strict";
/**
 * Volunteer Controller
 * Handles HTTP requests for volunteer management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssignment = exports.createAssignment = exports.getVolunteerAssignments = exports.deleteVolunteer = exports.updateVolunteer = exports.createVolunteer = exports.findVolunteersBySkills = exports.getVolunteerById = exports.getVolunteers = void 0;
const volunteerService_1 = require("../services/volunteerService");
const database_1 = __importDefault(require("../config/database"));
const queryHelpers_1 = require("../utils/queryHelpers");
const responseHelpers_1 = require("../utils/responseHelpers");
const volunteerService = new volunteerService_1.VolunteerService(database_1.default);
/**
 * GET /api/volunteers
 * Get all volunteers with filtering and pagination
 */
const getVolunteers = async (req, res, next) => {
    try {
        const filters = {
            search: (0, queryHelpers_1.getString)(req.query.search),
            skills: (0, queryHelpers_1.getString)(req.query.skills)?.split(','),
            availability_status: (0, queryHelpers_1.getString)(req.query.availability_status),
            background_check_status: (0, queryHelpers_1.getString)(req.query.background_check_status),
            is_active: (0, queryHelpers_1.getBoolean)(req.query.is_active),
        };
        const pagination = {
            page: (0, queryHelpers_1.getString)(req.query.page) ? parseInt(req.query.page) : undefined,
            limit: (0, queryHelpers_1.getString)(req.query.limit) ? parseInt(req.query.limit) : undefined,
            sort_by: (0, queryHelpers_1.getString)(req.query.sort_by),
            sort_order: (0, queryHelpers_1.getString)(req.query.sort_order),
        };
        const scope = req.dataScope?.filter;
        const result = await volunteerService.getVolunteers(filters, pagination, scope);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getVolunteers = getVolunteers;
/**
 * GET /api/volunteers/:id
 * Get volunteer by ID
 */
const getVolunteerById = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        const volunteer = await volunteerService.getVolunteerById(req.params.id, scope);
        if (!volunteer) {
            (0, responseHelpers_1.notFound)(res, 'Volunteer');
            return;
        }
        res.json(volunteer);
    }
    catch (error) {
        next(error);
    }
};
exports.getVolunteerById = getVolunteerById;
/**
 * GET /api/volunteers/search/skills
 * Find volunteers by skills (skill matching)
 */
const findVolunteersBySkills = async (req, res, next) => {
    try {
        const skills = (0, queryHelpers_1.getString)(req.query.skills)?.split(',') ?? [];
        if (skills.length === 0) {
            (0, responseHelpers_1.badRequest)(res, 'Skills parameter is required');
            return;
        }
        const volunteers = await volunteerService.findVolunteersBySkills(skills);
        res.json(volunteers);
    }
    catch (error) {
        next(error);
    }
};
exports.findVolunteersBySkills = findVolunteersBySkills;
/**
 * POST /api/volunteers
 * Create new volunteer
 */
const createVolunteer = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const volunteer = await volunteerService.createVolunteer(req.body, userId);
        res.status(201).json(volunteer);
    }
    catch (error) {
        next(error);
    }
};
exports.createVolunteer = createVolunteer;
/**
 * PUT /api/volunteers/:id
 * Update volunteer
 */
const updateVolunteer = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const volunteer = await volunteerService.updateVolunteer(req.params.id, req.body, userId);
        if (!volunteer) {
            (0, responseHelpers_1.notFound)(res, 'Volunteer');
            return;
        }
        res.json(volunteer);
    }
    catch (error) {
        next(error);
    }
};
exports.updateVolunteer = updateVolunteer;
/**
 * DELETE /api/volunteers/:id
 * Soft delete volunteer
 */
const deleteVolunteer = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const success = await volunteerService.deleteVolunteer(req.params.id, userId);
        if (!success) {
            (0, responseHelpers_1.notFound)(res, 'Volunteer');
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteVolunteer = deleteVolunteer;
/**
 * GET /api/volunteers/:id/assignments
 * Get assignments for a volunteer
 */
const getVolunteerAssignments = async (req, res, next) => {
    try {
        const filters = {
            volunteer_id: req.params.id,
        };
        const assignments = await volunteerService.getVolunteerAssignments(filters);
        res.json(assignments);
    }
    catch (error) {
        next(error);
    }
};
exports.getVolunteerAssignments = getVolunteerAssignments;
/**
 * POST /api/volunteers/assignments
 * Create volunteer assignment
 */
const createAssignment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const assignment = await volunteerService.createAssignment(req.body, userId);
        res.status(201).json(assignment);
    }
    catch (error) {
        next(error);
    }
};
exports.createAssignment = createAssignment;
/**
 * PUT /api/volunteers/assignments/:id
 * Update assignment (log hours, change status)
 */
const updateAssignment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const assignment = await volunteerService.updateAssignment(req.params.id, req.body, userId);
        if (!assignment) {
            (0, responseHelpers_1.notFound)(res, 'Assignment');
            return;
        }
        res.json(assignment);
    }
    catch (error) {
        next(error);
    }
};
exports.updateAssignment = updateAssignment;
//# sourceMappingURL=volunteerController.js.map