"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeName = normalizeName;
exports.clamp = clamp;
exports.uniq = uniq;
exports.take = take;
exports.safeRatio = safeRatio;
exports.splitSqlListTopLevel = splitSqlListTopLevel;
function normalizeName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/^\uFEFF/, '') // BOM
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
function uniq(values) {
    return Array.from(new Set(values));
}
function take(values, limit) {
    if (values.length <= limit)
        return values;
    return values.slice(0, limit);
}
function safeRatio(numerator, denominator) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0)
        return 0;
    return numerator / denominator;
}
function splitSqlListTopLevel(input) {
    const parts = [];
    let current = '';
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "'" && !inDouble) {
            inSingle = !inSingle;
            current += ch;
            continue;
        }
        if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
            current += ch;
            continue;
        }
        if (!inSingle && !inDouble) {
            if (ch === '(')
                depth++;
            if (ch === ')')
                depth = Math.max(0, depth - 1);
            if (ch === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }
        }
        current += ch;
    }
    if (current.trim())
        parts.push(current.trim());
    return parts;
}
//# sourceMappingURL=utils.js.map