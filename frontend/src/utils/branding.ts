import type { BrandingConfig } from '../types/branding';

export const applyBrandingToDocument = (branding: BrandingConfig) => {
  // Update document title
  if (branding.appName) {
    document.title = branding.appName;
  }

  // Update favicon
  const faviconHref = branding.favicon || null;
  if (faviconHref) {
    const link =
      (document.querySelector("link[rel*='icon']") as HTMLLinkElement | null) ||
      document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = faviconHref;
    document.head.appendChild(link);
  }

  // Update CSS variables for brand colors
  document.documentElement.style.setProperty('--brand-primary', branding.primaryColour);
  document.documentElement.style.setProperty('--brand-secondary', branding.secondaryColour);
};

