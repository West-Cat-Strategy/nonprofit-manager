"use strict";
/**
 * Event Controller
 * HTTP request handlers for event scheduling and registration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegistrations = exports.getAttendanceStats = exports.cancelRegistration = exports.checkInAttendee = exports.updateRegistration = exports.registerForEvent = exports.getEventRegistrations = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEvent = exports.getEventAttendanceSummary = exports.getEvents = void 0;
const eventService_1 = require("../services/eventService");
const database_1 = __importDefault(require("../config/database"));
const eventService = new eventService_1.EventService(database_1.default);
/**
 * GET /api/events
 * Get all events with optional filtering
 */
const getEvents = async (req, res, next) => {
    try {
        const filters = {
            event_type: req.query.event_type,
            status: req.query.status,
            start_date: req.query.start_date ? new Date(req.query.start_date) : undefined,
            end_date: req.query.end_date ? new Date(req.query.end_date) : undefined,
            search: req.query.search,
        };
        const scope = req.dataScope?.filter;
        const events = await eventService.getEvents(filters, {}, scope);
        res.json(events);
    }
    catch (error) {
        next(error);
    }
};
exports.getEvents = getEvents;
/**
 * GET /api/events/summary
 * Get event attendance summary for dashboards
 */
const getEventAttendanceSummary = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        const summary = await eventService.getEventAttendanceSummary(new Date(), scope);
        res.json(summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getEventAttendanceSummary = getEventAttendanceSummary;
/**
 * GET /api/events/:id
 * Get a single event by ID
 */
const getEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scope = req.dataScope?.filter;
        const event = await eventService.getEventById(id, scope);
        if (!event) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }
        res.json(event);
    }
    catch (error) {
        next(error);
    }
};
exports.getEvent = getEvent;
/**
 * POST /api/events
 * Create a new event
 */
const createEvent = async (req, res, next) => {
    try {
        const data = req.body;
        const event = await eventService.createEvent(data, req.user.id);
        res.status(201).json(event);
    }
    catch (error) {
        next(error);
    }
};
exports.createEvent = createEvent;
/**
 * PUT /api/events/:id
 * Update an event
 */
const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const event = await eventService.updateEvent(id, data, req.user.id);
        if (!event) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }
        res.json(event);
    }
    catch (error) {
        next(error);
    }
};
exports.updateEvent = updateEvent;
/**
 * DELETE /api/events/:id
 * Delete (cancel) an event
 */
const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        await eventService.deleteEvent(id, req.user.id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteEvent = deleteEvent;
/**
 * GET /api/events/:id/registrations
 * Get registrations for an event
 */
const getEventRegistrations = async (req, res, next) => {
    try {
        const { id } = req.params;
        const filters = {
            registration_status: req.query.status,
            checked_in: req.query.checked_in === 'true' ? true : req.query.checked_in === 'false' ? false : undefined,
        };
        const registrations = await eventService.getEventRegistrations(id, filters);
        res.json(registrations);
    }
    catch (error) {
        next(error);
    }
};
exports.getEventRegistrations = getEventRegistrations;
/**
 * POST /api/events/:id/register
 * Register for an event
 */
const registerForEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = {
            ...req.body,
            event_id: id,
        };
        const registration = await eventService.registerContact(data);
        res.status(201).json(registration);
    }
    catch (error) {
        next(error);
    }
};
exports.registerForEvent = registerForEvent;
/**
 * PUT /api/events/registrations/:id
 * Update a registration
 */
const updateRegistration = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const registration = await eventService.updateRegistration(id, data);
        if (!registration) {
            res.status(404).json({ error: 'Registration not found' });
            return;
        }
        res.json(registration);
    }
    catch (error) {
        next(error);
    }
};
exports.updateRegistration = updateRegistration;
/**
 * POST /api/events/registrations/:id/checkin
 * Check in an attendee
 */
const checkInAttendee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await eventService.checkInAttendee(id);
        if (!result.success) {
            res.status(400).json({ error: result.message });
            return;
        }
        res.json(result.registration);
    }
    catch (error) {
        next(error);
    }
};
exports.checkInAttendee = checkInAttendee;
/**
 * DELETE /api/events/registrations/:id
 * Cancel a registration
 */
const cancelRegistration = async (req, res, next) => {
    try {
        const { id } = req.params;
        await eventService.cancelRegistration(id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.cancelRegistration = cancelRegistration;
/**
 * GET /api/events/:id/attendance
 * Get attendance statistics for an event
 */
const getAttendanceStats = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Get registrations for the event
        const registrations = await eventService.getEventRegistrations(id);
        // Calculate stats
        const stats = {
            total_registered: registrations.length,
            checked_in: registrations.filter(r => r.checked_in).length,
            attendance_rate: registrations.length > 0
                ? (registrations.filter(r => r.checked_in).length / registrations.length) * 100
                : 0,
        };
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendanceStats = getAttendanceStats;
/**
 * GET /api/events/registrations
 * Get registrations for a contact
 */
const getRegistrations = async (req, res, next) => {
    try {
        const contactId = req.query.contact_id;
        if (!contactId) {
            res.status(400).json({ error: 'contact_id query parameter is required' });
            return;
        }
        const registrations = await eventService.getContactRegistrations(contactId);
        res.json(registrations);
    }
    catch (error) {
        next(error);
    }
};
exports.getRegistrations = getRegistrations;
exports.default = {
    getEvents: exports.getEvents,
    getEvent: exports.getEvent,
    createEvent: exports.createEvent,
    updateEvent: exports.updateEvent,
    deleteEvent: exports.deleteEvent,
    getEventRegistrations: exports.getEventRegistrations,
    registerForEvent: exports.registerForEvent,
    updateRegistration: exports.updateRegistration,
    checkInAttendee: exports.checkInAttendee,
    cancelRegistration: exports.cancelRegistration,
    getAttendanceStats: exports.getAttendanceStats,
    getRegistrations: exports.getRegistrations,
};
//# sourceMappingURL=eventController.js.map