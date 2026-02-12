import type { PublishedTheme } from '../../types/publishing';

export function generateThemeCSS(theme: PublishedTheme): string {
  return `
/* Reset and base styles */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  font-family: ${theme.typography.fontFamily};
  font-size: ${theme.typography.baseFontSize};
  line-height: ${theme.typography.lineHeight};
  color: ${theme.colors.text};
  background-color: ${theme.colors.background};
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${theme.typography.headingFontFamily};
  line-height: ${theme.typography.headingLineHeight};
  font-weight: ${theme.typography.fontWeightBold};
  margin-top: 0;
}

a {
  color: ${theme.colors.primary};
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
}

/* Navigation */
.site-nav {
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.border};
  padding: 1rem 0;
}

.site-nav.nav--sticky {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.site-nav.nav--transparent {
  background: transparent;
  border-bottom: none;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo img {
  height: 40px;
  width: auto;
}

.nav-menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 2rem;
}

.nav-item a {
  color: ${theme.colors.text};
  font-weight: ${theme.typography.fontWeightMedium};
}

.nav-item a:hover {
  color: ${theme.colors.primary};
  text-decoration: none;
}

.nav-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.nav-toggle span {
  display: block;
  width: 24px;
  height: 2px;
  background: ${theme.colors.text};
  margin: 5px 0;
  transition: 0.3s;
}

/* Footer */
.site-footer {
  background: ${theme.colors.surface};
  border-top: 1px solid ${theme.colors.border};
  padding: 3rem 0 1.5rem;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.footer-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-column h4 {
  margin-bottom: 1rem;
  font-size: 1rem;
}

.footer-column ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.footer-column li {
  margin-bottom: 0.5rem;
}

.footer-column a {
  color: ${theme.colors.textMuted};
}

.footer-column a:hover {
  color: ${theme.colors.primary};
}

.footer-social {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.footer-social a {
  color: ${theme.colors.textMuted};
}

.footer-social a:hover {
  color: ${theme.colors.primary};
}

.footer-newsletter {
  text-align: center;
  max-width: 400px;
  margin: 0 auto 2rem;
}

.footer-copyright {
  text-align: center;
  color: ${theme.colors.textMuted};
  font-size: 0.875rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${theme.colors.border};
}

/* Sections */
.site-section {
  padding: 4rem 0;
}

.section-container {
  padding: 0 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: ${theme.colors.surface};
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    border-bottom: 1px solid ${theme.colors.border};
  }

  .nav-menu.open {
    display: flex;
  }

  .nav-toggle {
    display: block;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .gallery-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .footer-columns {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr !important;
  }

  .gallery-grid {
    grid-template-columns: 1fr !important;
  }
}
`;
}
