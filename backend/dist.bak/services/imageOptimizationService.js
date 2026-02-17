"use strict";
/**
 * Image Optimization Service
 * Handles image resizing, compression, and format conversion for published sites
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageOptimizationService = exports.ImageOptimizationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
// Default responsive breakpoints
const DEFAULT_BREAKPOINTS = [
    { width: 320, suffix: '-xs' },
    { width: 640, suffix: '-sm' },
    { width: 768, suffix: '-md' },
    { width: 1024, suffix: '-lg' },
    { width: 1280, suffix: '-xl' },
    { width: 1920, suffix: '-2xl' },
];
// CDN base URL (configurable)
const CDN_BASE_URL = process.env.CDN_BASE_URL || '';
const IMAGE_OPTIMIZATION_ENABLED = process.env.IMAGE_OPTIMIZATION_ENABLED !== 'false';
class ImageOptimizationService {
    constructor(breakpoints) {
        this.breakpoints = breakpoints || DEFAULT_BREAKPOINTS;
    }
    /**
     * Generate optimized image URL with transformation parameters
     * Uses URL-based image transformation (compatible with Cloudflare, Imgix, etc.)
     */
    getOptimizedUrl(originalUrl, options = {}) {
        if (!IMAGE_OPTIMIZATION_ENABLED || !originalUrl) {
            return originalUrl;
        }
        const { quality = 80, format = 'webp', width, height, fit = 'cover', } = options;
        // Build transformation parameters
        const params = new URLSearchParams();
        params.set('q', quality.toString());
        if (format !== 'original') {
            params.set('f', format);
        }
        if (width) {
            params.set('w', width.toString());
        }
        if (height) {
            params.set('h', height.toString());
        }
        params.set('fit', fit);
        // If we have a CDN configured, use its transformation URL format
        if (CDN_BASE_URL) {
            // Cloudflare Images format: /cdn-cgi/image/width=800,quality=80,format=webp/original-url
            const transformations = [];
            if (width)
                transformations.push(`width=${width}`);
            if (height)
                transformations.push(`height=${height}`);
            transformations.push(`quality=${quality}`);
            if (format !== 'original')
                transformations.push(`format=${format}`);
            transformations.push(`fit=${fit}`);
            return `${CDN_BASE_URL}/cdn-cgi/image/${transformations.join(',')}/${encodeURIComponent(originalUrl)}`;
        }
        // Fallback: append params to URL
        const separator = originalUrl.includes('?') ? '&' : '?';
        return `${originalUrl}${separator}${params.toString()}`;
    }
    /**
     * Generate responsive srcset for an image
     */
    generateSrcset(originalUrl, options = {}) {
        if (!IMAGE_OPTIMIZATION_ENABLED || !originalUrl) {
            return '';
        }
        const srcsetParts = this.breakpoints.map((bp) => {
            const url = this.getOptimizedUrl(originalUrl, {
                ...options,
                width: bp.width,
            });
            return `${url} ${bp.width}w`;
        });
        return srcsetParts.join(', ');
    }
    /**
     * Generate sizes attribute for responsive images
     */
    generateSizes(containerWidth = '100vw') {
        // Generate media queries for common container widths
        const sizes = [
            '(max-width: 640px) 100vw',
            '(max-width: 768px) 100vw',
            '(max-width: 1024px) 50vw',
            containerWidth,
        ];
        return sizes.join(', ');
    }
    /**
     * Generate full optimized image data for HTML
     */
    getOptimizedImageData(originalUrl, options = {}) {
        const optimizedUrl = this.getOptimizedUrl(originalUrl, options);
        const srcset = this.generateSrcset(originalUrl, options);
        const sizes = this.generateSizes();
        // Generate WebP and AVIF variants
        const webpUrl = this.getOptimizedUrl(originalUrl, { ...options, format: 'webp' });
        const avifUrl = this.getOptimizedUrl(originalUrl, { ...options, format: 'avif' });
        return {
            url: optimizedUrl,
            srcset,
            sizes,
            webpUrl,
            avifUrl,
            width: options.width,
            height: options.height,
        };
    }
    /**
     * Generate HTML for an optimized image with picture element
     */
    generateOptimizedImageHtml(originalUrl, alt, options = {}, className) {
        if (!originalUrl) {
            return '';
        }
        const imageData = this.getOptimizedImageData(originalUrl, options);
        const lazyAttr = options.lazy !== false ? 'loading="lazy"' : '';
        const classAttr = className ? `class="${className}"` : '';
        const widthAttr = options.width ? `width="${options.width}"` : '';
        const heightAttr = options.height ? `height="${options.height}"` : '';
        // Use picture element for format negotiation
        return `
<picture>
  <source type="image/avif" srcset="${imageData.avifUrl}">
  <source type="image/webp" srcset="${imageData.webpUrl}">
  <img
    src="${imageData.url}"
    srcset="${imageData.srcset}"
    sizes="${imageData.sizes}"
    alt="${this.escapeHtml(alt)}"
    ${lazyAttr}
    ${classAttr}
    ${widthAttr}
    ${heightAttr}
    decoding="async"
  >
</picture>`.trim();
    }
    /**
     * Generate a blur placeholder data URL (LQIP - Low Quality Image Placeholder)
     * In production, this would use actual image processing
     */
    generatePlaceholder(originalUrl) {
        // Generate a consistent placeholder based on URL hash
        const hash = crypto_1.default.createHash('md5').update(originalUrl).digest('hex');
        // Generate a simple gradient placeholder based on hash
        const color1 = `#${hash.slice(0, 6)}`;
        const color2 = `#${hash.slice(6, 12)}`;
        // SVG gradient placeholder
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
      </defs>
      <rect fill="url(#g)" width="100" height="100"/>
    </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }
    /**
     * Get preload link for critical images (above the fold)
     */
    getPreloadLink(originalUrl, options = {}) {
        const webpUrl = this.getOptimizedUrl(originalUrl, { ...options, format: 'webp' });
        return `<link rel="preload" as="image" href="${webpUrl}" type="image/webp">`;
    }
    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
    }
}
exports.ImageOptimizationService = ImageOptimizationService;
exports.imageOptimizationService = new ImageOptimizationService();
exports.default = exports.imageOptimizationService;
//# sourceMappingURL=imageOptimizationService.js.map