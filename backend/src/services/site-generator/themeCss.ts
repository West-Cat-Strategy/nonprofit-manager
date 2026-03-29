import type { PublishedTheme } from '@app-types/publishing';

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
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${theme.typography.headingFontFamily};
  line-height: ${theme.typography.headingLineHeight};
  font-weight: ${theme.typography.fontWeightBold};
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
  scroll-margin-top: 6rem;
}

h1 {
  font-size: clamp(2.5rem, 5vw, 4.25rem);
}

h2 {
  font-size: clamp(2rem, 3vw, 3rem);
}

h3 {
  font-size: clamp(1.35rem, 1.8vw, 1.75rem);
}

p {
  margin: 0 0 1rem;
  max-width: 68ch;
}

a {
  color: ${theme.colors.primary};
  text-decoration: none;
  transition: color 0.2s ease, opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
}

a:hover {
  text-decoration: none;
}

a:focus-visible,
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
summary:focus-visible,
.nav-toggle:focus-visible {
  outline: 3px solid ${theme.colors.primary};
  outline-offset: 2px;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

.btn {
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

/* Navigation */
.site-nav {
  background: ${theme.colors.surface};
  border-bottom: 1px solid ${theme.colors.border};
  padding: 1rem 0;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
}

.site-nav.nav--sticky {
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.site-nav.nav--transparent {
  background: transparent;
  border-bottom: none;
  box-shadow: none;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 1.5rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  position: relative;
}

.nav-logo {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.nav-logo img {
  height: 40px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
}

.nav-menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 1rem 1.5rem;
  flex-wrap: wrap;
}

.nav-item {
  position: relative;
}

.nav-item a {
  color: ${theme.colors.text};
  font-weight: ${theme.typography.fontWeightMedium};
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.1rem;
  border-radius: 9999px;
}

.nav-item a:hover {
  color: ${theme.colors.primary};
  text-decoration: none;
  background: rgba(31, 77, 59, 0.06);
}

.nav-item--cta > a {
  padding: 0.75rem 1.1rem;
  border-radius: 9999px;
  background: ${theme.colors.primary};
  color: white !important;
  box-shadow: ${theme.shadows.sm};
}

.nav-item--cta > a:hover {
  color: white;
  background: ${theme.colors.secondary};
}

.nav-item--dropdown:hover .nav-dropdown,
.nav-item--dropdown:focus-within .nav-dropdown {
  display: grid;
}

.nav-dropdown {
  display: none;
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  min-width: 16rem;
  padding: 0.5rem;
  margin: 0;
  list-style: none;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: 1rem;
  box-shadow: ${theme.shadows.lg};
  z-index: 1000;
  gap: 0.25rem;
}

.nav-dropdown li a {
  width: 100%;
  display: flex;
  padding: 0.6rem 0.8rem;
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
  padding: clamp(2.5rem, 6vw, 3.5rem) 0 1.5rem;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 1.5rem);
}

.footer-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem 2rem;
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
  max-width: 520px;
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
  padding: clamp(2.5rem, 5vw, 4.5rem) 0;
}

.section-container {
  padding: 0 clamp(1rem, 3vw, 1.5rem);
}

.hero-component,
.card-component,
.pricing-tier,
.team-member,
.npm-card,
.npm-detail,
.npm-empty {
  overflow: hidden;
}

.contact-form,
.newsletter-form,
.donation-form {
  width: min(100%, 720px);
  margin: 0 auto;
}

.hero-component {
  box-shadow: ${theme.shadows.lg};
}

.columns-component {
  align-items: stretch;
}

.card-component {
  height: 100%;
}

.map-component iframe {
  width: 100%;
  max-width: 100%;
}

/* Responsive */
@media (max-width: 960px) {
  .columns-component,
  .pricing-grid,
  .team-grid,
  .logo-grid,
  .stats-grid,
  .gallery-grid {
    grid-template-columns: 1fr !important;
  }

  .hero-component {
    padding: 1.5rem !important;
  }

  .nav-menu {
    gap: 0.75rem 1rem;
  }
}

@media (max-width: 768px) {
  .site-nav {
    padding: 0.75rem 0;
  }

  .nav-container {
    align-items: flex-start;
  }

  .nav-menu {
    display: none;
    position: absolute;
    top: calc(100% + 0.75rem);
    left: clamp(1rem, 3vw, 1.5rem);
    right: clamp(1rem, 3vw, 1.5rem);
    background: ${theme.colors.surface};
    flex-direction: column;
    padding: 1rem;
    gap: 0.75rem;
    border: 1px solid ${theme.colors.border};
    border-radius: 1rem;
    box-shadow: ${theme.shadows.lg};
  }

  .nav-menu.open {
    display: flex;
  }

  .nav-toggle {
    display: inline-flex;
    margin-left: auto;
  }

  .nav-item {
    width: 100%;
  }

  .nav-item a {
    width: 100%;
    justify-content: flex-start;
    padding: 0.8rem 1rem;
  }

  .nav-item--cta > a {
    justify-content: center;
  }

  .nav-dropdown {
    position: static;
    display: grid;
    gap: 0.25rem;
    box-shadow: none;
    border: none;
    padding: 0.25rem 0 0 1rem;
    background: transparent;
  }

  .footer-columns {
    grid-template-columns: 1fr;
    text-align: left;
  }

  .footer-social {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .newsletter-form {
    flex-direction: column;
  }

  .newsletter-form input,
  .newsletter-form button,
  .contact-form button,
  .donation-form button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .nav-logo img {
    height: 34px;
  }

  .hero-component {
    padding: 1.25rem !important;
  }

  .nav-menu {
    left: 1rem;
    right: 1rem;
  }
}
`;
}
