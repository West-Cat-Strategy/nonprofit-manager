"use strict";
/**
 * Theme Preset Service
 * Provides access to color palettes and font pairings for templates.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPaletteToTypography = void 0;
exports.listColorPalettes = listColorPalettes;
exports.listFontPairings = listFontPairings;
exports.getColorPaletteById = getColorPaletteById;
exports.getFontPairingById = getFontPairingById;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const mapPaletteRow = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description || null,
    colors: row.colors,
    isSystem: row.is_system,
    isActive: row.is_active,
});
const mapFontRow = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description || null,
    headingFont: row.heading_font,
    bodyFont: row.body_font,
    accentFont: row.accent_font || null,
    headingWeights: row.heading_weights || [],
    bodyWeights: row.body_weights || [],
    fontUrls: row.font_urls || [],
    isSystem: row.is_system,
    isActive: row.is_active,
});
async function listColorPalettes(activeOnly = true) {
    try {
        const result = await database_1.default.query(`SELECT * FROM theme_color_palettes ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY is_system DESC, name ASC`);
        return result.rows.map(mapPaletteRow);
    }
    catch (error) {
        logger_1.logger.error('Failed to list color palettes', { error });
        throw new Error('Failed to list color palettes');
    }
}
async function listFontPairings(activeOnly = true) {
    try {
        const result = await database_1.default.query(`SELECT * FROM theme_font_pairings ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY is_system DESC, name ASC`);
        return result.rows.map(mapFontRow);
    }
    catch (error) {
        logger_1.logger.error('Failed to list font pairings', { error });
        throw new Error('Failed to list font pairings');
    }
}
async function getColorPaletteById(id) {
    try {
        const result = await database_1.default.query('SELECT * FROM theme_color_palettes WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return null;
        return mapPaletteRow(result.rows[0]);
    }
    catch (error) {
        logger_1.logger.error('Failed to get color palette', { error, id });
        throw new Error('Failed to get color palette');
    }
}
async function getFontPairingById(id) {
    try {
        const result = await database_1.default.query('SELECT * FROM theme_font_pairings WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return null;
        return mapFontRow(result.rows[0]);
    }
    catch (error) {
        logger_1.logger.error('Failed to get font pairing', { error, id });
        throw new Error('Failed to get font pairing');
    }
}
const applyPaletteToTypography = (typography, font) => {
    return {
        ...typography,
        fontFamily: font.bodyFont,
        headingFontFamily: font.headingFont,
    };
};
exports.applyPaletteToTypography = applyPaletteToTypography;
//# sourceMappingURL=themePresetService.js.map