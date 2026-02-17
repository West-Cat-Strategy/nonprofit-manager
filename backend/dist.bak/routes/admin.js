"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminBrandingController_1 = require("../controllers/adminBrandingController");
const router = express_1.default.Router();
router.get('/branding', auth_1.authenticate, adminBrandingController_1.getBranding);
router.put('/branding', auth_1.authenticate, (0, auth_1.authorize)('admin'), adminBrandingController_1.putBranding);
exports.default = router;
//# sourceMappingURL=admin.js.map