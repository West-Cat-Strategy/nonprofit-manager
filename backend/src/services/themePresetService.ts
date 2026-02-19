/**
 * Theme Preset Service
 * Provides access to color palettes and font pairings for templates.
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import type { ColorPalette, Typography } from '@app-types/websiteBuilder';

export type ThemeColorPalette = {
  id: string;
  name: string;
  description: string | null;
  colors: ColorPalette;
  isSystem: boolean;
  isActive: boolean;
};

export type ThemeFontPairing = {
  id: string;
  name: string;
  description: string | null;
  headingFont: string;
  bodyFont: string;
  accentFont: string | null;
  headingWeights: string[];
  bodyWeights: string[];
  fontUrls: string[];
  isSystem: boolean;
  isActive: boolean;
};

const mapPaletteRow = (row: Record<string, unknown>): ThemeColorPalette => ({
  id: row.id as string,
  name: row.name as string,
  description: (row.description as string) || null,
  colors: row.colors as ColorPalette,
  isSystem: row.is_system as boolean,
  isActive: row.is_active as boolean,
});

const mapFontRow = (row: Record<string, unknown>): ThemeFontPairing => ({
  id: row.id as string,
  name: row.name as string,
  description: (row.description as string) || null,
  headingFont: row.heading_font as string,
  bodyFont: row.body_font as string,
  accentFont: (row.accent_font as string) || null,
  headingWeights: (row.heading_weights as string[]) || [],
  bodyWeights: (row.body_weights as string[]) || [],
  fontUrls: (row.font_urls as string[]) || [],
  isSystem: row.is_system as boolean,
  isActive: row.is_active as boolean,
});

export async function listColorPalettes(activeOnly = true): Promise<ThemeColorPalette[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM theme_color_palettes ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY is_system DESC, name ASC`
    );
    return result.rows.map(mapPaletteRow);
  } catch (error) {
    logger.error('Failed to list color palettes', { error });
    throw Object.assign(new Error('Failed to list color palettes'), { cause: error });
  }
}

export async function listFontPairings(activeOnly = true): Promise<ThemeFontPairing[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM theme_font_pairings ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY is_system DESC, name ASC`
    );
    return result.rows.map(mapFontRow);
  } catch (error) {
    logger.error('Failed to list font pairings', { error });
    throw Object.assign(new Error('Failed to list font pairings'), { cause: error });
  }
}

export async function getColorPaletteById(id: string): Promise<ThemeColorPalette | null> {
  try {
    const result = await pool.query('SELECT * FROM theme_color_palettes WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return mapPaletteRow(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get color palette', { error, id });
    throw Object.assign(new Error('Failed to get color palette'), { cause: error });
  }
}

export async function getFontPairingById(id: string): Promise<ThemeFontPairing | null> {
  try {
    const result = await pool.query('SELECT * FROM theme_font_pairings WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return mapFontRow(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get font pairing', { error, id });
    throw Object.assign(new Error('Failed to get font pairing'), { cause: error });
  }
}

export const applyPaletteToTypography = (typography: Typography, font: ThemeFontPairing): Typography => {
  return {
    ...typography,
    fontFamily: font.bodyFont,
    headingFontFamily: font.headingFont,
  };
};
