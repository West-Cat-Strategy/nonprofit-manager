"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromBase64Url = exports.toBase64Url = void 0;
const toBase64Url = (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return buf
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};
exports.toBase64Url = toBase64Url;
const fromBase64Url = (data) => {
    const padded = data.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (padded.length % 4)) % 4;
    return Buffer.from(padded + '='.repeat(padLength), 'base64');
};
exports.fromBase64Url = fromBase64Url;
//# sourceMappingURL=base64url.js.map