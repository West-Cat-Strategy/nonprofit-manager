/**
 * Theme Preset Service
 * Provides access to color palettes and font pairings for templates.
 */
import type { ColorPalette, Typography } from '../types/websiteBuilder';
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
export declare function listColorPalettes(activeOnly?: boolean): Promise<ThemeColorPalette[]>;
export declare function listFontPairings(activeOnly?: boolean): Promise<ThemeFontPairing[]>;
export declare function getColorPaletteById(id: string): Promise<ThemeColorPalette | null>;
export declare function getFontPairingById(id: string): Promise<ThemeFontPairing | null>;
export declare const applyPaletteToTypography: (typography: Typography, font: ThemeFontPairing) => Typography;
//# sourceMappingURL=themePresetService.d.ts.map