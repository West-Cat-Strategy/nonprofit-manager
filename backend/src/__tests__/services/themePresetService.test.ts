import pool from '@config/database';
import { listColorPalettes, getColorPaletteById, listFontPairings } from '@services/themePresetService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('themePresetService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('lists active color palettes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Ocean', colors: {}, is_system: true, is_active: true, description: null }] });
    const result = await listColorPalettes();
    expect(result[0].name).toBe('Ocean');
  });

  it('returns null when palette is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getColorPaletteById('missing')).resolves.toBeNull();
  });

  it('lists font pairings', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'f1', name: 'Classic', heading_font: 'Merriweather', body_font: 'Lato', heading_weights: [], body_weights: [], font_urls: [], is_system: true, is_active: true, description: null, accent_font: null }] });
    const result = await listFontPairings();
    expect(result[0].headingFont).toBe('Merriweather');
  });
});
