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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestPreviewFromTextAuto = exports.ingestPreviewFromText = exports.ingestPreviewFromBuffer = exports.schemaRegistry = void 0;
__exportStar(require("./types"), exports);
var schemaRegistry_1 = require("./schemaRegistry");
Object.defineProperty(exports, "schemaRegistry", { enumerable: true, get: function () { return schemaRegistry_1.schemaRegistry; } });
var preview_1 = require("./preview");
Object.defineProperty(exports, "ingestPreviewFromBuffer", { enumerable: true, get: function () { return preview_1.ingestPreviewFromBuffer; } });
Object.defineProperty(exports, "ingestPreviewFromText", { enumerable: true, get: function () { return preview_1.ingestPreviewFromText; } });
Object.defineProperty(exports, "ingestPreviewFromTextAuto", { enumerable: true, get: function () { return preview_1.ingestPreviewFromTextAuto; } });
//# sourceMappingURL=index.js.map