export type ThemeId =
  | 'neobrutalist'
  | 'sea-breeze'
  | 'corporate'
  | 'clean-modern'
  | 'glass'
  | 'high-contrast';

export interface ThemePreview {
  bg: string;
  surface: string;
  text: string;
  accent: string;
  border: string;
  borderStyle: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  bodyClass?: `theme-${ThemeId}`;
  preview: ThemePreview;
}

export const THEME_IDS: ThemeId[] = [
  'neobrutalist',
  'sea-breeze',
  'corporate',
  'clean-modern',
  'glass',
  'high-contrast',
];

export const THEME_REGISTRY: Record<ThemeId, ThemeDefinition> = {
  neobrutalist: {
    id: 'neobrutalist',
    label: 'Neobrutalist',
    description: 'Punchy blocks, hard edges, editorial contrast',
    preview: {
      bg: '#f4efe7',
      surface: '#fff9ef',
      text: '#1d1b16',
      accent: '#ff7a00',
      border: '#1d1b16',
      borderStyle: '3px solid',
    },
  },
  'sea-breeze': {
    id: 'sea-breeze',
    label: 'Sea Breeze',
    description: 'Calm marine tones with breathable spacing',
    bodyClass: 'theme-sea-breeze',
    preview: {
      bg: '#e9f8f5',
      surface: '#f8fffd',
      text: '#0e3d3a',
      accent: '#0d8b80',
      border: '#4aa79f',
      borderStyle: '2px solid',
    },
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate',
    description: 'Operational clarity with restrained hierarchy',
    bodyClass: 'theme-corporate',
    preview: {
      bg: '#f4f6fa',
      surface: '#ffffff',
      text: '#1f2937',
      accent: '#1d4ed8',
      border: '#b6c0d1',
      borderStyle: '1px solid',
    },
  },
  'clean-modern': {
    id: 'clean-modern',
    label: 'Clean Modern',
    description: 'Balanced geometry with subtle depth',
    bodyClass: 'theme-clean-modern',
    preview: {
      bg: '#eef3ff',
      surface: '#ffffff',
      text: '#0f172a',
      accent: '#5b4dff',
      border: '#c7d2fe',
      borderStyle: '1px solid',
    },
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    description: 'Translucent panels and high-contrast highlights',
    bodyClass: 'theme-glass',
    preview: {
      bg: '#d8dde8',
      surface: 'rgba(255,255,255,0.78)',
      text: '#132033',
      accent: '#00a2ff',
      border: '#8fa3bf',
      borderStyle: '1px solid',
    },
  },
  'high-contrast': {
    id: 'high-contrast',
    label: 'High Contrast',
    description: 'WCAG-first visibility and interaction affordance',
    bodyClass: 'theme-high-contrast',
    preview: {
      bg: '#ffffff',
      surface: '#ffffff',
      text: '#000000',
      accent: '#0049d6',
      border: '#000000',
      borderStyle: '3px solid',
    },
  },
};

export function isThemeId(input: string | null | undefined): input is ThemeId {
  if (!input) return false;
  return THEME_IDS.includes(input as ThemeId);
}
