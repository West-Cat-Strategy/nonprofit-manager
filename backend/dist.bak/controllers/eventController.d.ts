/**
 * Event Controller
 * HTTP request handlers for event scheduling and registration
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/events
 * Get all events with optional filtering
 */
export declare const getEvents: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/events/summary
 * Get event attendance summary for dashboards
 */
export declare const getEventAttendanceSummary: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/events/:id
 * Get a single event by ID
 */
export declare const getEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/events
 * Create a new event
 */
export declare const createEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/events/:id
 * Update an event
 */
export declare const updateEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/events/:id
 * Delete (cancel) an event
 */
export declare const deleteEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/events/:id/registrations
 * Get registrations for an event
 */
export declare const getEventRegistrations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/events/:id/register
 * Register for an event
 */
export declare const registerForEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/events/registrations/:id
 * Update a registration
 */
export declare const updateRegistration: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/events/registrations/:id/checkin
 * Check in an attendee
 */
export declare const checkInAttendee: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/events/registrations/:id
 * Cancel a registration
 */
export declare const cancelRegistration: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/events/:id/attendance
 * Get attendance statistics for an event
 */
export declare const getAttendanceStats: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/events/registrations
 * Get registrations for a contact
 */
export declare const getRegistrations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getEvents: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    createEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getEventRegistrations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    registerForEvent: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateRegistration: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    checkInAttendee: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    cancelRegistration: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAttendanceStats: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getRegistrations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=eventController.d.ts.map