"use strict";
/**
 * Site Generator Service
 * Generates static HTML/CSS for published websites
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteGeneratorService = exports.SiteGeneratorService = void 0;
const imageOptimizationService_1 = require("./imageOptimizationService");
class SiteGeneratorService {
    /**
     * Generate all pages for a published site
     */
    generateSite(content) {
        return content.pages.map((page) => this.generatePage(page, content));
    }
    /**
     * Generate a single page
     */
    generatePage(page, content) {
        const css = this.generateThemeCSS(content.theme);
        const html = this.generateHTML(page, content, css);
        return {
            slug: page.slug,
            html,
            css,
        };
    }
    /**
     * Generate the full HTML document
     */
    generateHTML(page, content, css) {
        const title = page.seo?.title || page.name || content.seoDefaults.title;
        const description = page.seo?.description || content.seoDefaults.description;
        const favicon = content.seoDefaults.favicon || '/favicon.ico';
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <meta name="description" content="${this.escapeHtml(description)}">
  ${page.seo?.keywords?.length ? `<meta name="keywords" content="${this.escapeHtml(page.seo.keywords.join(', '))}">` : ''}
  ${page.seo?.noIndex ? '<meta name="robots" content="noindex">' : ''}
  ${page.seo?.canonicalUrl ? `<link rel="canonical" href="${this.escapeHtml(page.seo.canonicalUrl)}">` : ''}
  <link rel="icon" href="${this.escapeHtml(favicon)}">

  <!-- Open Graph -->
  <meta property="og:title" content="${this.escapeHtml(title)}">
  <meta property="og:description" content="${this.escapeHtml(description)}">
  ${page.seo?.ogImage || content.seoDefaults.ogImage ? `<meta property="og:image" content="${this.escapeHtml(page.seo?.ogImage || content.seoDefaults.ogImage || '')}">` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${this.escapeHtml(title)}">
  <meta name="twitter:description" content="${this.escapeHtml(description)}">

  <!-- Google Analytics -->
  ${content.seoDefaults.googleAnalyticsId ? this.generateGoogleAnalytics(content.seoDefaults.googleAnalyticsId) : ''}

  <!-- Custom Head Code -->
  ${content.seoDefaults.customHeadCode || ''}

  <style>
${css}
  </style>
</head>
<body>
  ${this.generateNavigation(content)}

  <main>
    ${page.sections.map((section) => this.generateSection(section, content.theme)).join('\n')}
  </main>

  ${this.generateFooter(content)}

  <!-- Site Analytics -->
  <script>
    (function() {
      var siteId = '${content.templateId}';
      var visitorId = localStorage.getItem('npm_visitor_id') || (function() {
        var id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('npm_visitor_id', id);
        return id;
      })();
      var sessionId = sessionStorage.getItem('npm_session_id') || (function() {
        var id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        sessionStorage.setItem('npm_session_id', id);
        return id;
      })();

      fetch('/api/sites/' + siteId + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'pageview',
          pagePath: window.location.pathname,
          visitorId: visitorId,
          sessionId: sessionId
        })
      }).catch(function() {});
    })();
  </script>
</body>
</html>`;
    }
    /**
     * Generate Google Analytics script
     */
    generateGoogleAnalytics(gaId) {
        return `
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${this.escapeHtml(gaId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${this.escapeHtml(gaId)}');
  </script>`;
    }
    /**
     * Generate navigation HTML
     */
    generateNavigation(content) {
        const nav = content.navigation;
        if (!nav || !nav.items?.length)
            return '';
        const stickyClass = nav.sticky ? 'nav--sticky' : '';
        const transparentClass = nav.transparent ? 'nav--transparent' : '';
        return `
  <nav class="site-nav ${stickyClass} ${transparentClass}">
    <div class="nav-container">
      ${nav.logo ? `<a href="/" class="nav-logo"><img src="${this.escapeHtml(nav.logo)}" alt="${this.escapeHtml(nav.logoAlt || 'Logo')}"></a>` : ''}
      <button class="nav-toggle" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu">
        ${nav.items.map((item) => this.generateNavItem(item)).join('\n')}
      </ul>
    </div>
  </nav>`;
    }
    /**
     * Generate a navigation item
     */
    generateNavItem(item) {
        const target = item.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
        const hasChildren = item.children && item.children.length > 0;
        if (hasChildren) {
            return `
        <li class="nav-item nav-item--dropdown">
          <a href="${this.escapeHtml(item.url)}"${target}>${this.escapeHtml(item.label)}</a>
          <ul class="nav-dropdown">
            ${item.children.map((child) => `
              <li><a href="${this.escapeHtml(child.url)}"${child.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.escapeHtml(child.label)}</a></li>
            `).join('\n')}
          </ul>
        </li>`;
        }
        return `<li class="nav-item"><a href="${this.escapeHtml(item.url)}"${target}>${this.escapeHtml(item.label)}</a></li>`;
    }
    /**
     * Generate footer HTML
     */
    generateFooter(content) {
        const footer = content.footer;
        if (!footer)
            return '';
        const style = footer.backgroundColor
            ? `style="background-color: ${footer.backgroundColor}; color: ${footer.textColor || 'inherit'}"`
            : '';
        return `
  <footer class="site-footer" ${style}>
    <div class="footer-container">
      ${footer.columns?.length ? `
      <div class="footer-columns">
        ${footer.columns.map((col) => `
          <div class="footer-column">
            <h4>${this.escapeHtml(col.title)}</h4>
            <ul>
              ${col.links.map((link) => `
                <li><a href="${this.escapeHtml(link.url)}">${this.escapeHtml(link.label)}</a></li>
              `).join('\n')}
            </ul>
          </div>
        `).join('\n')}
      </div>
      ` : ''}

      ${footer.socialLinks?.length ? `
      <div class="footer-social">
        ${footer.socialLinks.map((link) => `
          <a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${this.escapeHtml(link.platform)}">
            ${this.getSocialIcon(link.platform)}
          </a>
        `).join('\n')}
      </div>
      ` : ''}

      ${footer.showNewsletter ? `
      <div class="footer-newsletter">
        <h4>${this.escapeHtml(footer.newsletterTitle || 'Subscribe to our newsletter')}</h4>
        ${footer.newsletterDescription ? `<p>${this.escapeHtml(footer.newsletterDescription)}</p>` : ''}
        <form class="newsletter-form">
          <input type="email" placeholder="Enter your email" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
      ` : ''}

      <div class="footer-copyright">
        <p>${this.escapeHtml(footer.copyright)}</p>
      </div>
    </div>
  </footer>`;
    }
    /**
     * Generate a section HTML
     */
    generateSection(section, theme) {
        const style = [];
        if (section.backgroundColor)
            style.push(`background-color: ${section.backgroundColor}`);
        if (section.backgroundImage)
            style.push(`background-image: url('${section.backgroundImage}'); background-size: cover; background-position: center`);
        if (section.paddingTop)
            style.push(`padding-top: ${section.paddingTop}`);
        if (section.paddingBottom)
            style.push(`padding-bottom: ${section.paddingBottom}`);
        if (section.paddingLeft)
            style.push(`padding-left: ${section.paddingLeft}`);
        if (section.paddingRight)
            style.push(`padding-right: ${section.paddingRight}`);
        const styleAttr = style.length ? `style="${style.join('; ')}"` : '';
        const maxWidth = section.maxWidth || '1200px';
        return `
    <section class="site-section" ${styleAttr}>
      <div class="section-container" style="max-width: ${maxWidth}; margin: 0 auto;">
        ${section.components.map((comp) => this.generateComponent(comp, theme)).join('\n')}
      </div>
    </section>`;
    }
    /**
     * Generate a component HTML
     */
    generateComponent(component, theme) {
        switch (component.type) {
            case 'heading':
                return this.generateHeading(component, theme);
            case 'text':
                return this.generateText(component, theme);
            case 'button':
                return this.generateButton(component, theme);
            case 'image':
                return this.generateImage(component);
            case 'divider':
                return this.generateDivider(component, theme);
            case 'spacer':
                return this.generateSpacer(component);
            case 'stats':
                return this.generateStats(component, theme);
            case 'testimonial':
                return this.generateTestimonial(component, theme);
            case 'gallery':
                return this.generateGallery(component);
            case 'video':
                return this.generateVideo(component);
            case 'contact-form':
                return this.generateContactForm(component, theme);
            case 'newsletter-signup':
                return this.generateNewsletterSignup(component, theme);
            case 'donation-form':
                return this.generateDonationForm(component, theme);
            case 'social-links':
                return this.generateSocialLinks(component);
            default:
                return `<!-- Unknown component type: ${component.type} -->`;
        }
    }
    /**
     * Generate heading component
     */
    generateHeading(component, theme) {
        const level = component.level || 2;
        const tag = `h${level}`;
        const align = component.align || 'left';
        const color = component.color || theme.colors.text;
        const content = component.content;
        return `<${tag} style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.headingFontFamily}">${this.escapeHtml(content)}</${tag}>`;
    }
    /**
     * Generate text component
     */
    generateText(component, theme) {
        const align = component.align || 'left';
        const color = component.color || theme.colors.text;
        const content = component.content;
        return `<p style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.fontFamily}; line-height: ${theme.typography.lineHeight}">${this.escapeHtml(content)}</p>`;
    }
    /**
     * Generate button component
     */
    generateButton(component, theme) {
        const text = component.text || 'Button';
        const url = component.url || '#';
        const variant = component.variant || 'primary';
        const size = component.size || 'md';
        const fullWidth = component.fullWidth;
        const variantStyles = {
            primary: `background: ${theme.colors.primary}; color: white; border: none`,
            secondary: `background: ${theme.colors.secondary}; color: white; border: none`,
            outline: `background: transparent; color: ${theme.colors.primary}; border: 2px solid ${theme.colors.primary}`,
        };
        const sizeStyles = {
            sm: 'padding: 0.5rem 1rem; font-size: 0.875rem',
            md: 'padding: 0.75rem 1.5rem; font-size: 1rem',
            lg: 'padding: 1rem 2rem; font-size: 1.125rem',
        };
        const style = `${variantStyles[variant] || variantStyles.primary}; ${sizeStyles[size] || sizeStyles.md}; border-radius: ${theme.borderRadius.md}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none${fullWidth ? '; width: 100%' : ''}`;
        return `<a href="${this.escapeHtml(url)}" class="btn" style="${style}">${this.escapeHtml(text)}</a>`;
    }
    /**
     * Generate image component with optimization
     */
    generateImage(component) {
        const src = component.src || '';
        const alt = component.alt || '';
        const width = component.width || '100%';
        const height = component.height || 'auto';
        const caption = component.caption;
        const priority = component.priority; // Above-the-fold images
        if (!src) {
            return '<div class="image-placeholder" style="background: #f3f4f6; padding: 2rem; text-align: center; color: #9ca3af;">Image placeholder</div>';
        }
        // Parse numeric width for optimization
        const numericWidth = parseInt(width, 10);
        const optimizationOptions = {
            width: !isNaN(numericWidth) ? numericWidth : 1200,
            quality: 80,
            format: 'webp',
            lazy: !priority,
        };
        // Generate optimized image HTML with picture element
        const optimizedImageHtml = imageOptimizationService_1.imageOptimizationService.generateOptimizedImageHtml(src, alt, optimizationOptions, 'component-image');
        // Add preload link for priority images
        const preloadHint = priority
            ? `<!-- Preload: ${imageOptimizationService_1.imageOptimizationService.getPreloadLink(src, optimizationOptions)} -->`
            : '';
        return `
      ${preloadHint}
      <figure style="margin: 0;">
        <div style="width: ${width}; height: ${height}; overflow: hidden; border-radius: 0.5rem;">
          ${optimizedImageHtml}
        </div>
        ${caption ? `<figcaption style="text-align: center; font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem">${this.escapeHtml(caption)}</figcaption>` : ''}
      </figure>`;
    }
    /**
     * Generate divider component
     */
    generateDivider(component, theme) {
        const color = component.color || theme.colors.border;
        const thickness = component.thickness || '1px';
        const width = component.width || '100%';
        return `<hr style="border: none; border-top: ${thickness} solid ${color}; width: ${width}; margin: 1rem auto;">`;
    }
    /**
     * Generate spacer component
     */
    generateSpacer(component) {
        const height = component.height || '2rem';
        return `<div style="height: ${height}"></div>`;
    }
    /**
     * Generate stats component
     */
    generateStats(component, theme) {
        const items = component.items || [];
        const columns = component.columns || 4;
        if (!items.length)
            return '';
        return `
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 2rem; text-align: center;">
        ${items.map((item) => `
          <div class="stat-item">
            <div style="font-size: 2rem; font-weight: bold; color: ${theme.colors.primary}">${this.escapeHtml(item.value)}</div>
            <div style="color: ${theme.colors.textMuted}">${this.escapeHtml(item.label)}</div>
          </div>
        `).join('\n')}
      </div>`;
    }
    /**
     * Generate testimonial component
     */
    generateTestimonial(component, theme) {
        const quote = component.quote || '';
        const author = component.author || '';
        const title = component.title;
        const avatar = component.avatar;
        return `
      <blockquote style="text-align: center; margin: 0;">
        <p style="font-size: 1.25rem; font-style: italic; color: ${theme.colors.text}">"${this.escapeHtml(quote)}"</p>
        ${avatar ? `<img src="${this.escapeHtml(avatar)}" alt="${this.escapeHtml(author)}" style="width: 3rem; height: 3rem; border-radius: 50%; margin: 1rem auto;">` : ''}
        <footer>
          <strong style="color: ${theme.colors.text}">${this.escapeHtml(author)}</strong>
          ${title ? `<br><span style="color: ${theme.colors.textMuted}">${this.escapeHtml(title)}</span>` : ''}
        </footer>
      </blockquote>`;
    }
    /**
     * Generate gallery component with optimized images
     */
    generateGallery(component) {
        const items = component.items || [];
        const columns = component.columns || 3;
        if (!items.length)
            return '<div class="gallery-placeholder">Gallery - add images in editor</div>';
        // Calculate optimal thumbnail width based on columns
        const thumbnailWidth = Math.ceil(1200 / columns);
        return `
      <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 1rem;">
        ${items.map((item) => {
            const optimizedImageHtml = imageOptimizationService_1.imageOptimizationService.generateOptimizedImageHtml(item.src, item.alt || '', { width: thumbnailWidth, quality: 75, lazy: true }, 'gallery-image');
            return `
          <div class="gallery-item" style="position: relative; overflow: hidden; border-radius: 0.5rem; aspect-ratio: 1;">
            ${optimizedImageHtml}
            ${item.caption ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); color: white; padding: 0.5rem; font-size: 0.875rem;">${this.escapeHtml(item.caption)}</div>` : ''}
          </div>`;
        }).join('\n')}
      </div>`;
    }
    /**
     * Generate video component
     */
    generateVideo(component) {
        const src = component.src || '';
        const provider = component.provider || 'youtube';
        const aspectRatio = component.aspectRatio || '16/9';
        if (!src) {
            return '<div class="video-placeholder" style="background: #1f2937; padding: 4rem; text-align: center; color: #9ca3af; border-radius: 0.5rem;">Video - add URL in editor</div>';
        }
        let embedUrl = src;
        if (provider === 'youtube') {
            const match = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
            if (match)
                embedUrl = `https://www.youtube.com/embed/${match[1]}`;
        }
        else if (provider === 'vimeo') {
            const match = src.match(/vimeo\.com\/(\d+)/);
            if (match)
                embedUrl = `https://player.vimeo.com/video/${match[1]}`;
        }
        return `
      <div style="position: relative; aspect-ratio: ${aspectRatio}; overflow: hidden; border-radius: 0.5rem;">
        <iframe src="${this.escapeHtml(embedUrl)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>`;
    }
    /**
     * Generate contact form component
     */
    generateContactForm(component, theme) {
        const submitText = component.submitText || 'Send Message';
        const includePhone = component.includePhone !== false;
        const includeMessage = component.includeMessage !== false;
        return `
      <form class="contact-form" style="max-width: 500px; margin: 0 auto;">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Name</label>
          <input type="text" name="name" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Email</label>
          <input type="email" name="email" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        ${includePhone ? `
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Phone</label>
          <input type="tel" name="phone" style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        ` : ''}
        ${includeMessage ? `
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Message</label>
          <textarea name="message" rows="4" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md}; resize: vertical;"></textarea>
        </div>
        ` : ''}
        <button type="submit" style="width: 100%; padding: 0.75rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 500;">${this.escapeHtml(submitText)}</button>
      </form>`;
    }
    /**
     * Generate newsletter signup component
     */
    generateNewsletterSignup(component, theme) {
        const buttonText = component.buttonText || 'Subscribe';
        return `
      <form class="newsletter-form" style="display: flex; gap: 0.5rem; max-width: 400px; margin: 0 auto;">
        <input type="email" name="email" placeholder="Enter your email" required style="flex: 1; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        <button type="submit" style="padding: 0.75rem 1.5rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 500; white-space: nowrap;">${this.escapeHtml(buttonText)}</button>
      </form>`;
    }
    /**
     * Generate donation form component
     */
    generateDonationForm(component, theme) {
        const amounts = component.suggestedAmounts || [25, 50, 100, 250];
        const allowCustom = component.allowCustomAmount !== false;
        return `
      <form class="donation-form" style="max-width: 400px; margin: 0 auto; text-align: center;">
        <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap;">
          ${amounts.map((amount) => `
            <button type="button" class="amount-btn" data-amount="${amount}" style="padding: 0.75rem 1.5rem; background: white; border: 2px solid ${theme.colors.primary}; border-radius: ${theme.borderRadius.md}; cursor: pointer; color: ${theme.colors.primary}; font-weight: 500;">$${amount}</button>
          `).join('\n')}
        </div>
        ${allowCustom ? `
        <div style="margin-bottom: 1rem;">
          <input type="number" name="custom_amount" placeholder="Custom amount" style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md}; text-align: center;">
        </div>
        ` : ''}
        <button type="submit" style="width: 100%; padding: 1rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 600; font-size: 1.125rem;">Donate Now</button>
      </form>`;
    }
    /**
     * Generate social links component
     */
    generateSocialLinks(component) {
        const links = component.links || [];
        const align = component.align || 'center';
        if (!links.length)
            return '';
        const justifyMap = {
            left: 'flex-start',
            center: 'center',
            right: 'flex-end',
        };
        return `
      <div class="social-links" style="display: flex; gap: 1rem; justify-content: ${justifyMap[align] || 'center'}; flex-wrap: wrap;">
        ${links.map((link) => `
          <a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${this.escapeHtml(link.platform)}" style="color: inherit; transition: opacity 0.2s;">
            ${this.getSocialIcon(link.platform)}
          </a>
        `).join('\n')}
      </div>`;
    }
    /**
     * Get social icon SVG
     */
    getSocialIcon(platform) {
        const icons = {
            facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
            twitter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
            instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
            linkedin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
            youtube: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
            email: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
        };
        return icons[platform] || icons.email;
    }
    /**
     * Generate theme CSS
     */
    generateThemeCSS(theme) {
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
    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
    }
}
exports.SiteGeneratorService = SiteGeneratorService;
exports.siteGeneratorService = new SiteGeneratorService();
exports.default = exports.siteGeneratorService;
//# sourceMappingURL=siteGeneratorService.js.map