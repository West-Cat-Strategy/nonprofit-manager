"use strict";
/**
 * Analytics Service
 * Re-exports from the analytics/ directory for backwards compatibility
 *
 * NOTE: This file is deprecated. Import from './analytics' or './analytics/index' instead.
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.AnalyticsService = void 0;
// Re-export everything from the analytics directory
__exportStar(require("./analytics"), exports);
var analytics_1 = require("./analytics");
Object.defineProperty(exports, "AnalyticsService", { enumerable: true, get: function () { return analytics_1.AnalyticsService; } });
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(analytics_1).default; } });
//# sourceMappingURL=analyticsService.js.map