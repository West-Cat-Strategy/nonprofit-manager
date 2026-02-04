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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const caseController = __importStar(require("../controllers/caseController"));
const documentController = __importStar(require("../controllers/contactDocumentsController"));
const router = express_1.default.Router();
// Case management routes
router.get('/summary', auth_1.authenticate, caseController.getCaseSummary);
router.get('/types', auth_1.authenticate, caseController.getCaseTypes);
router.get('/statuses', auth_1.authenticate, caseController.getCaseStatuses);
router.post('/', auth_1.authenticate, caseController.createCase);
router.get('/', auth_1.authenticate, caseController.getCases);
router.get('/:id', auth_1.authenticate, caseController.getCaseById);
router.put('/:id', auth_1.authenticate, caseController.updateCase);
router.delete('/:id', auth_1.authenticate, caseController.deleteCase);
router.put('/:id/status', auth_1.authenticate, caseController.updateCaseStatus);
router.get('/:id/notes', auth_1.authenticate, caseController.getCaseNotes);
router.get('/:id/documents', auth_1.authenticate, documentController.getCaseDocuments);
router.post('/notes', auth_1.authenticate, caseController.createCaseNote);
exports.default = router;
//# sourceMappingURL=cases.js.map