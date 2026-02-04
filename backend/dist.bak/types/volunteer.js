"use strict";
/**
 * Volunteer Type Definitions
 * Extends Contact entity with volunteer-specific fields
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundCheckStatus = exports.AvailabilityStatus = void 0;
var AvailabilityStatus;
(function (AvailabilityStatus) {
    AvailabilityStatus["AVAILABLE"] = "available";
    AvailabilityStatus["UNAVAILABLE"] = "unavailable";
    AvailabilityStatus["LIMITED"] = "limited";
})(AvailabilityStatus || (exports.AvailabilityStatus = AvailabilityStatus = {}));
var BackgroundCheckStatus;
(function (BackgroundCheckStatus) {
    BackgroundCheckStatus["NOT_REQUIRED"] = "not_required";
    BackgroundCheckStatus["PENDING"] = "pending";
    BackgroundCheckStatus["IN_PROGRESS"] = "in_progress";
    BackgroundCheckStatus["APPROVED"] = "approved";
    BackgroundCheckStatus["REJECTED"] = "rejected";
    BackgroundCheckStatus["EXPIRED"] = "expired";
})(BackgroundCheckStatus || (exports.BackgroundCheckStatus = BackgroundCheckStatus = {}));
//# sourceMappingURL=volunteer.js.map