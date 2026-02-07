import type { TemplateTheme, TemplateGlobalSettings } from '../../types/websiteBuilder';

export const defaultTheme: TemplateTheme = {
  colors: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    headingFontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    baseFontSize: '16px',
    lineHeight: '1.5',
    headingLineHeight: '1.2',
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
};

export const defaultGlobalSettings: TemplateGlobalSettings = {
  language: 'en',
  header: {
    navigation: [],
    sticky: true,
    transparent: false,
  },
  footer: {
    columns: [],
    copyright: `© ${new Date().getFullYear()} Your Organization. All rights reserved.`,
  },
};
