"use strict";
/**
 * Event Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Campaign/Event entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationStatus = exports.EventStatus = exports.EventType = void 0;
var EventType;
(function (EventType) {
    EventType["FUNDRAISER"] = "fundraiser";
    EventType["COMMUNITY"] = "community";
    EventType["TRAINING"] = "training";
    EventType["MEETING"] = "meeting";
    EventType["VOLUNTEER"] = "volunteer";
    EventType["SOCIAL"] = "social";
    EventType["OTHER"] = "other";
})(EventType || (exports.EventType = EventType = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["PLANNED"] = "planned";
    EventStatus["ACTIVE"] = "active";
    EventStatus["COMPLETED"] = "completed";
    EventStatus["CANCELLED"] = "cancelled";
    EventStatus["POSTPONED"] = "postponed";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["REGISTERED"] = "registered";
    RegistrationStatus["WAITLISTED"] = "waitlisted";
    RegistrationStatus["CANCELLED"] = "cancelled";
    RegistrationStatus["CONFIRMED"] = "confirmed";
    RegistrationStatus["NO_SHOW"] = "no_show";
})(RegistrationStatus || (exports.RegistrationStatus = RegistrationStatus = {}));
//# sourceMappingURL=event.js.map