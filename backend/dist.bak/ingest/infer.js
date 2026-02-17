"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferColumn = inferColumn;
exports.inferColumnType = inferColumnType;
exports.typeCompatibilityScore = typeCompatibilityScore;
const utils_1 = require("./utils");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}(\s*(x|ext\.?)\s*\d+)?$/i;
function isNullish(v) {
    if (v === null || v === undefined)
        return true;
    const s = String(v).trim().toLowerCase();
    return s === '' || s === 'null' || s === 'nil' || s === 'n/a' || s === 'na';
}
function looksBoolean(s) {
    const v = s.trim().toLowerCase();
    return ['true', 'false', 't', 'f', 'yes', 'no', 'y', 'n', '1', '0'].includes(v);
}
function looksNumber(s) {
    const v = s.trim().replace(/,/g, '');
    return /^-?\d+(\.\d+)?$/.test(v);
}
function looksCurrency(s) {
    const v = s.trim();
    if (/^[€£$]\s*-?\d/.test(v))
        return true;
    if (/\b(usd|eur|gbp)\b/i.test(v) && /\d/.test(v))
        return true;
    return false;
}
function parseDateLoose(s) {
    const v = s.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
        const t = Date.parse(v);
        return Number.isFinite(t) ? t : null;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v)) {
        const t = Date.parse(v);
        return Number.isFinite(t) ? t : null;
    }
    if (/[a-z]{3,9}\s+\d{1,2},?\s+\d{2,4}/i.test(v)) {
        const t = Date.parse(v);
        return Number.isFinite(t) ? t : null;
    }
    return null;
}
function inferColumn(values) {
    const nonNull = values.filter((v) => !isNullish(v)).map((v) => String(v).trim());
    const stats = { nonNullCount: nonNull.length, counts: {} };
    const patterns = [];
    if (nonNull.length === 0) {
        return { inferredType: 'unknown', confidence: 1, stats, patterns };
    }
    let uuidCount = 0;
    let emailCount = 0;
    let phoneCount = 0;
    let boolCount = 0;
    let currencyCount = 0;
    let numberCount = 0;
    let dateCount = 0;
    let datetimeCount = 0;
    let hasCurrencySymbol = false;
    let hasCommaNumber = false;
    for (const s of nonNull) {
        if (UUID_RE.test(s))
            uuidCount++;
        if (EMAIL_RE.test(s))
            emailCount++;
        if (PHONE_RE.test(s))
            phoneCount++;
        if (looksBoolean(s))
            boolCount++;
        if (looksCurrency(s))
            currencyCount++;
        if (looksNumber(s))
            numberCount++;
        if (/[€£$]/.test(s))
            hasCurrencySymbol = true;
        if (/\d,\d{3}\b/.test(s))
            hasCommaNumber = true;
        const t = parseDateLoose(s);
        if (t !== null) {
            if (/[t\s]\d{1,2}:\d{2}/i.test(s))
                datetimeCount++;
            else
                dateCount++;
        }
    }
    const n = nonNull.length;
    const ratio = (c) => (0, utils_1.safeRatio)(c, n);
    const candidates = [
        { type: 'email', score: ratio(emailCount) },
        { type: 'uuid', score: ratio(uuidCount) },
        { type: 'phone', score: ratio(phoneCount) },
        { type: 'datetime', score: ratio(datetimeCount) },
        { type: 'date', score: ratio(dateCount + datetimeCount) },
        { type: 'boolean', score: ratio(boolCount) },
        { type: 'currency', score: ratio(currencyCount) },
        { type: 'number', score: ratio(numberCount) },
        { type: 'string', score: 1 },
    ];
    // Priority rules (reduce accidental misclassification)
    const pick = (type, threshold) => candidates.find((c) => c.type === type && c.score >= threshold)?.type ?? null;
    const inferredType = pick('email', 0.8) ??
        pick('uuid', 0.8) ??
        pick('phone', 0.7) ??
        pick('datetime', 0.7) ??
        pick('date', 0.7) ??
        pick('boolean', 0.9) ??
        pick('currency', 0.5) ??
        pick('number', 0.9) ??
        'string';
    stats.counts.email = emailCount;
    stats.counts.uuid = uuidCount;
    stats.counts.phone = phoneCount;
    stats.counts.datetime = datetimeCount;
    stats.counts.date = dateCount;
    stats.counts.boolean = boolCount;
    stats.counts.currency = currencyCount;
    stats.counts.number = numberCount;
    stats.counts.string = n;
    if (hasCurrencySymbol)
        patterns.push('contains_currency_symbol');
    if (hasCommaNumber)
        patterns.push('contains_thousands_separators');
    if (inferredType === 'uuid')
        patterns.push('looks_like_uuid');
    if (inferredType === 'email')
        patterns.push('looks_like_email');
    if (inferredType === 'phone')
        patterns.push('looks_like_phone');
    const confidence = (0, utils_1.clamp)(inferredType === 'string' ? 0.5 : ratio(stats.counts[inferredType] ?? 0), 0, 1);
    return { inferredType, confidence, stats, patterns };
}
function inferColumnType(values) {
    return inferColumn(values).inferredType;
}
function typeCompatibilityScore(inferred, schemaType) {
    if (inferred === 'unknown')
        return 0.25;
    if (schemaType === 'string' || schemaType === 'enum') {
        if (inferred === 'string')
            return 1;
        if (inferred === 'email' || inferred === 'phone')
            return 0.95;
        if (inferred === 'uuid')
            return 0.6;
        if (inferred === 'date' || inferred === 'datetime')
            return 0.7;
        if (inferred === 'number' || inferred === 'currency')
            return 0.7;
        if (inferred === 'boolean')
            return 0.7;
        return 0.6;
    }
    if (schemaType === 'uuid')
        return inferred === 'uuid' ? 1 : 0.15;
    if (schemaType === 'boolean')
        return inferred === 'boolean' ? 1 : 0.25;
    if (schemaType === 'number')
        return inferred === 'number' || inferred === 'currency' ? 1 : 0.25;
    if (schemaType === 'date')
        return inferred === 'date' || inferred === 'datetime' ? 1 : 0.25;
    if (schemaType === 'datetime')
        return inferred === 'datetime' || inferred === 'date' ? 1 : 0.25;
    return 0.4;
}
//# sourceMappingURL=infer.js.map