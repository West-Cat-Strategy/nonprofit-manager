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
  shortLabel: string;
  label: string;
  description: string;
  menuDescription: string;
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
    shortLabel: 'EO',
    label: 'Editorial Ops',
    description: 'Paper-toned editorial rhythm with ink-first hierarchy',
    menuDescription: 'Warm operational surfaces, serif headlines, and firmer chrome.',
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
    shortLabel: 'SB',
    label: 'Sea Breeze',
    description: 'Rounded marine palette with airy intake-friendly calm',
    menuDescription: 'Soft teal gradients and relaxed geometry for service-heavy work.',
    bodyClass: 'theme-sea-breeze',
    preview: {
      bg: '#dff7f3',
      surface: '#f8fffd',
      text: '#113d3b',
      accent: '#0d8b80',
      border: '#6ab8b0',
      borderStyle: '1px solid',
    },
  },
  corporate: {
    id: 'corporate',
    shortLabel: 'CP',
    label: 'Corporate',
    description: 'Crisp enterprise clarity with disciplined cobalt accents',
    menuDescription: 'Tighter geometry, sharper data surfaces, and quiet professionalism.',
    bodyClass: 'theme-corporate',
    preview: {
      bg: '#f3f5fa',
      surface: '#ffffff',
      text: '#142033',
      accent: '#1d4ed8',
      border: '#a7b4c7',
      borderStyle: '1px solid',
    },
  },
  'clean-modern': {
    id: 'clean-modern',
    shortLabel: 'CM',
    label: 'Clean Modern',
    description: 'Sage-forward balance with smoother cards and lighter structure',
    menuDescription: 'A softer contemporary workspace with calm depth and cleaner spacing.',
    bodyClass: 'theme-clean-modern',
    preview: {
      bg: '#eef4f2',
      surface: '#ffffff',
      text: '#17252a',
      accent: '#0f766e',
      border: '#9bb8ad',
      borderStyle: '1px solid',
    },
  },
  glass: {
    id: 'glass',
    shortLabel: 'GL',
    label: 'Glass',
    description: 'Luminous glass layers with neon detail and crisp contrast',
    menuDescription: 'Frosted panels, electric accents, and the boldest night mode.',
    bodyClass: 'theme-glass',
    preview: {
      bg: '#dbe3f4',
      surface: 'rgba(248,251,255,0.8)',
      text: '#112138',
      accent: '#00a2ff',
      border: '#8aa8d1',
      borderStyle: '1px solid',
    },
  },
  'high-contrast': {
    id: 'high-contrast',
    shortLabel: 'HC',
    label: 'High Contrast',
    description: 'Maximum readability with uncompromising borders and focus',
    menuDescription: 'Accessibility-first mode with zero blur and the clearest states.',
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
