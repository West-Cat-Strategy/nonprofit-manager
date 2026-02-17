"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENSITIVE_FIELDS = exports.maskSensitiveData = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
// Fields that should be masked in logs
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'secret',
    'authorization',
    'api_key',
    'apiKey',
    'credit_card',
    'creditCard',
    'card_number',
    'cardNumber',
    'cvv',
    'ssn',
    'social_security',
    'stripe_secret',
    'stripeSecret',
    'webhook_secret',
    'webhookSecret',
    'client_secret',
    'clientSecret',
];
exports.SENSITIVE_FIELDS = SENSITIVE_FIELDS;
// Mask sensitive data in objects
const maskSensitiveData = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(maskSensitiveData);
    }
    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
            masked[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            masked[key] = maskSensitiveData(value);
        }
        else {
            masked[key] = value;
        }
    }
    return masked;
};
exports.maskSensitiveData = maskSensitiveData;
// Custom format to mask sensitive data
const sensitiveDataMasker = winston_1.default.format((info) => {
    // Mask any metadata objects
    if (info.metadata && typeof info.metadata === 'object') {
        info.metadata = maskSensitiveData(info.metadata);
    }
    // Mask any additional properties
    const maskedInfo = { ...info };
    for (const [key, value] of Object.entries(maskedInfo)) {
        if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'service') {
            if (typeof value === 'object' && value !== null) {
                maskedInfo[key] = maskSensitiveData(value);
            }
            else if (typeof value === 'string') {
                const lowerKey = key.toLowerCase();
                if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
                    maskedInfo[key] = '[REDACTED]';
                }
            }
        }
    }
    return maskedInfo;
});
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), sensitiveDataMasker(), winston_1.default.format.splat(), winston_1.default.format.json());
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'nonprofit-manager-api' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
    }));
}
//# sourceMappingURL=logger.js.map