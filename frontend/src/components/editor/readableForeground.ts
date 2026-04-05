const HEX_LENGTH = 6;
const SHORT_HEX_LENGTH = 3;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function expandHex(hex: string) {
  if (hex.length !== SHORT_HEX_LENGTH) {
    return hex;
  }

  return hex
    .split('')
    .map((char) => `${char}${char}`)
    .join('');
}

function parseHexColor(color: string): RgbColor | null {
  const normalized = color.trim();
  if (!normalized.startsWith('#')) {
    return null;
  }

  const hex = expandHex(normalized.slice(1));
  if (hex.length !== HEX_LENGTH || !/^[\da-f]{6}$/i.test(hex)) {
    return null;
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function toLinearChannel(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color: RgbColor) {
  const r = toLinearChannel(color.r);
  const g = toLinearChannel(color.g);
  const b = toLinearChannel(color.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(background: RgbColor, foreground: RgbColor) {
  const backgroundLuminance = getRelativeLuminance(background);
  const foregroundLuminance = getRelativeLuminance(foreground);

  const lighter = Math.max(backgroundLuminance, foregroundLuminance);
  const darker = Math.min(backgroundLuminance, foregroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

interface ReadableTextColorOptions {
  lightTextColor?: string;
  darkTextColor?: string;
}

export function getReadableTextColor(
  backgroundColor: string,
  {
    lightTextColor = '#ffffff',
    darkTextColor = '#0f172a',
  }: ReadableTextColorOptions = {}
) {
  const background = parseHexColor(backgroundColor);
  const lightCandidate = parseHexColor(lightTextColor);
  const darkCandidate = parseHexColor(darkTextColor);

  if (background && lightCandidate && darkCandidate) {
    const lightContrast = getContrastRatio(background, lightCandidate);
    const darkContrast = getContrastRatio(background, darkCandidate);

    return darkContrast >= lightContrast ? darkTextColor : lightTextColor;
  }

  if (!background) {
    return lightTextColor;
  }

  return getRelativeLuminance(background) > 0.4 ? darkTextColor : lightTextColor;
}
