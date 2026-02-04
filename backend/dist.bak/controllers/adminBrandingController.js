"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.putBranding = exports.getBranding = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const ensureBrandingTable = async () => {
    await database_1.default.query(`CREATE TABLE IF NOT EXISTS organization_branding (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`);
    await database_1.default.query(`INSERT INTO organization_branding (id, config)
     VALUES (1, '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`);
};
const isPlainObject = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const isValidHexColor = (value) => {
    if (typeof value !== 'string')
        return false;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
};
const parseBrandingConfig = (input) => {
    if (!isPlainObject(input))
        return null;
    const appName = input.appName;
    const appIcon = input.appIcon;
    const primaryColour = input.primaryColour;
    const secondaryColour = input.secondaryColour;
    const favicon = input.favicon;
    if (typeof appName !== 'string' || appName.trim().length === 0)
        return null;
    if (appIcon !== null && typeof appIcon !== 'string')
        return null;
    if (!isValidHexColor(primaryColour))
        return null;
    if (!isValidHexColor(secondaryColour))
        return null;
    if (favicon !== null && typeof favicon !== 'string')
        return null;
    return {
        appName: appName.trim(),
        appIcon,
        primaryColour,
        secondaryColour,
        favicon,
    };
};
const getBranding = async (_req, res) => {
    try {
        // Read-only access: any authenticated user can read branding.
        const result = await database_1.default.query('SELECT config FROM organization_branding WHERE id = 1');
        const config = (result.rows[0]?.config ?? {});
        return res.json(config);
    }
    catch (error) {
        const err = error;
        if (err?.code === '42P01') {
            // Migration not applied yet; create the table so clients can use defaults.
            await ensureBrandingTable();
            const result = await database_1.default.query('SELECT config FROM organization_branding WHERE id = 1');
            return res.json((result.rows[0]?.config ?? {}));
        }
        logger_1.logger.error('Failed to fetch organization branding', { error });
        return res.status(500).json({ error: 'Failed to fetch branding' });
    }
};
exports.getBranding = getBranding;
const putBranding = async (req, res) => {
    const brandingConfig = parseBrandingConfig(req.body);
    if (!brandingConfig) {
        return res.status(400).json({
            error: 'Invalid branding payload. Expected { appName, appIcon, primaryColour, secondaryColour, favicon }',
        });
    }
    try {
        const result = await database_1.default.query(`INSERT INTO organization_branding (id, config, created_at, updated_at)
       VALUES (1, $1::jsonb, NOW(), NOW())
       ON CONFLICT (id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
       RETURNING config`, [JSON.stringify(brandingConfig)]);
        logger_1.logger.info('Organization branding updated', { userId: req.user?.id });
        return res.json(result.rows[0].config);
    }
    catch (error) {
        const err = error;
        if (err?.code === '42P01') {
            await ensureBrandingTable();
            const result = await database_1.default.query(`INSERT INTO organization_branding (id, config, created_at, updated_at)
         VALUES (1, $1::jsonb, NOW(), NOW())
         ON CONFLICT (id)
         DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
         RETURNING config`, [JSON.stringify(brandingConfig)]);
            return res.json(result.rows[0].config);
        }
        logger_1.logger.error('Failed to update organization branding', { error, userId: req.user?.id });
        return res.status(500).json({ error: 'Failed to update branding' });
    }
};
exports.putBranding = putBranding;
//# sourceMappingURL=adminBrandingController.js.map