"use strict";
/**
 * Response Helpers
 * Standardized HTTP response utilities for controllers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginated = exports.noContent = exports.created = exports.serverError = exports.validationError = exports.forbidden = exports.unauthorized = exports.badRequest = exports.conflict = exports.notFound = void 0;
/**
 * Send a 404 Not Found response
 */
const notFound = (res, entity = 'Resource') => {
    res.status(404).json({ error: `${entity} not found` });
};
exports.notFound = notFound;
/**
 * Send a 409 Conflict response
 */
const conflict = (res, message) => {
    res.status(409).json({ error: message });
};
exports.conflict = conflict;
/**
 * Send a 400 Bad Request response
 */
const badRequest = (res, message) => {
    res.status(400).json({ error: message });
};
exports.badRequest = badRequest;
/**
 * Send a 401 Unauthorized response
 */
const unauthorized = (res, message = 'Unauthorized') => {
    res.status(401).json({ error: message });
};
exports.unauthorized = unauthorized;
/**
 * Send a 403 Forbidden response
 */
const forbidden = (res, message = 'Forbidden') => {
    res.status(403).json({ error: message });
};
exports.forbidden = forbidden;
/**
 * Send a 422 Unprocessable Entity response (validation errors)
 */
const validationError = (res, errors) => {
    res.status(422).json({ error: 'Validation failed', details: errors });
};
exports.validationError = validationError;
/**
 * Send a 500 Internal Server Error response
 */
const serverError = (res, message = 'Internal server error') => {
    res.status(500).json({ error: message });
};
exports.serverError = serverError;
/**
 * Send a 201 Created response with data
 */
const created = (res, data) => {
    res.status(201).json(data);
};
exports.created = created;
/**
 * Send a 204 No Content response
 */
const noContent = (res) => {
    res.status(204).send();
};
exports.noContent = noContent;
const paginated = (res, data, page, limit, total) => {
    res.json({
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
};
exports.paginated = paginated;
//# sourceMappingURL=responseHelpers.js.map