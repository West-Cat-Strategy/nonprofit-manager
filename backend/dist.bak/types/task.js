"use strict";
/**
 * Task Types
 * Based on CDM Task model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelatedToType = exports.TaskPriority = exports.TaskStatus = void 0;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["NOT_STARTED"] = "not_started";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["WAITING"] = "waiting";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["DEFERRED"] = "deferred";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "low";
    TaskPriority["NORMAL"] = "normal";
    TaskPriority["HIGH"] = "high";
    TaskPriority["URGENT"] = "urgent";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
var RelatedToType;
(function (RelatedToType) {
    RelatedToType["ACCOUNT"] = "account";
    RelatedToType["CONTACT"] = "contact";
    RelatedToType["EVENT"] = "event";
    RelatedToType["DONATION"] = "donation";
    RelatedToType["VOLUNTEER"] = "volunteer";
})(RelatedToType || (exports.RelatedToType = RelatedToType = {}));
//# sourceMappingURL=task.js.map