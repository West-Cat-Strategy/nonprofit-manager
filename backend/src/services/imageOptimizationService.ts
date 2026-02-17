/**
 * Image Optimization Service
 * Handles image resizing, compression, and format conversion for published sites
 */

import crypto from 'crypto';

// Image optimization settings
export interface ImageOptimizationOptions {
  quality?: number; // 1-100, default 80
  format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'original';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  lazy?: boolean;
}

// Responsive image breakpoints
export interface ResponsiveBreakpoint {
  width: number;
  suffix: string;
}

// Optimized image result
export interface OptimizedImage {
  url: string;
  srcset?: string;
  sizes?: string;
  width?: number;
  height?: number;
  placeholder?: string; // Base64 blur placeholder
  webpUrl?: string;
  avifUrl?: string;
}

// Image metadata
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hash: string;
}

// Default responsive breakpoints
const DEFAULT_BREAKPOINTS: ResponsiveBreakpoint[] = [
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

export class ImageOptimizationService {
  private breakpoints: ResponsiveBreakpoint[];

  constructor(breakpoints?: ResponsiveBreakpoint[]) {
    this.breakpoints = breakpoints || DEFAULT_BREAKPOINTS;
  }

  /**
   * Generate optimized image URL with transformation parameters
   * Uses URL-based image transformation (compatible with Cloudflare, Imgix, etc.)
   */
  getOptimizedUrl(
    originalUrl: string,
    options: ImageOptimizationOptions = {}
  ): string {
    if (!IMAGE_OPTIMIZATION_ENABLED || !originalUrl) {
      return originalUrl;
    }

    const {
      quality = 80,
      format = 'webp',
      width,
      height,
      fit = 'cover',
    } = options;

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
      if (width) transformations.push(`width=${width}`);
      if (height) transformations.push(`height=${height}`);
      transformations.push(`quality=${quality}`);
      if (format !== 'original') transformations.push(`format=${format}`);
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
  generateSrcset(
    originalUrl: string,
    options: ImageOptimizationOptions = {}
  ): string {
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
  generateSizes(containerWidth: string = '100vw'): string {
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
  getOptimizedImageData(
    originalUrl: string,
    options: ImageOptimizationOptions = {}
  ): OptimizedImage {
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
  generateOptimizedImageHtml(
    originalUrl: string,
    alt: string,
    options: ImageOptimizationOptions = {},
    className?: string
  ): string {
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
  generatePlaceholder(originalUrl: string): string {
    // Generate a consistent placeholder based on URL hash
    const hash = crypto.createHash('md5').update(originalUrl).digest('hex');

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
  getPreloadLink(originalUrl: string, options: ImageOptimizationOptions = {}): string {
    const webpUrl = this.getOptimizedUrl(originalUrl, { ...options, format: 'webp' });

    return `<link rel="preload" as="image" href="${webpUrl}" type="image/webp">`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

export const imageOptimizationService = new ImageOptimizationService();
export default imageOptimizationService;
