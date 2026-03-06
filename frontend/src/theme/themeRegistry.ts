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
    label: 'Editorial Ops',
    description: 'Neutral workspace surfaces, dark-ink actions, and refined hierarchy',
    preview: {
      bg: '#f4f1eb',
      surface: '#fffdf9',
      text: '#16202d',
      accent: '#17365d',
      border: '#bcc7d4',
      borderStyle: '1px solid',
    },
  },
  'sea-breeze': {
    id: 'sea-breeze',
    label: 'Sea Breeze',
    description: 'Calm marine tones for service-heavy intake and portal work',
    bodyClass: 'theme-sea-breeze',
    preview: {
      bg: '#e8f6f3',
      surface: '#f8fffd',
      text: '#113d3b',
      accent: '#0d8b80',
      border: '#9fcfc9',
      borderStyle: '1px solid',
    },
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate',
    description: 'Operational clarity with a restrained enterprise palette',
    bodyClass: 'theme-corporate',
    preview: {
      bg: '#f4f6fa',
      surface: '#ffffff',
      text: '#172234',
      accent: '#1a4d8f',
      border: '#c4cfdd',
      borderStyle: '1px solid',
    },
  },
  'clean-modern': {
    id: 'clean-modern',
    label: 'Clean Modern',
    description: 'Balanced geometry with soft structure and no purple bias',
    bodyClass: 'theme-clean-modern',
    preview: {
      bg: '#eef4f2',
      surface: '#ffffff',
      text: '#16212b',
      accent: '#0f766e',
      border: '#c7d8d3',
      borderStyle: '1px solid',
    },
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    description: 'Translucent panels with cooler ink tones and tighter contrast',
    bodyClass: 'theme-glass',
    preview: {
      bg: '#d8dde8',
      surface: 'rgba(255,255,255,0.78)',
      text: '#132033',
      accent: '#0f6b7d',
      border: '#a5b6cb',
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
