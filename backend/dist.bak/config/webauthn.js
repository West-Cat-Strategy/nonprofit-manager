"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebAuthnConfig = void 0;
const splitOrigins = (value) => (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
const getWebAuthnConfig = () => {
    const origins = splitOrigins(process.env.WEBAUTHN_ORIGIN).length
        ? splitOrigins(process.env.WEBAUTHN_ORIGIN)
        : splitOrigins(process.env.CORS_ORIGIN);
    const fallbackOrigin = origins[0] || 'http://localhost:5173';
    const rpID = process.env.WEBAUTHN_RP_ID || new URL(fallbackOrigin).hostname;
    const rpName = process.env.WEBAUTHN_RP_NAME || 'Nonprofit Manager';
    return { origins: origins.length ? origins : [fallbackOrigin], rpID, rpName };
};
exports.getWebAuthnConfig = getWebAuthnConfig;
//# sourceMappingURL=webauthn.js.map