import { ImageOptimizationService } from '../../../services/imageOptimizationService';
import type { ImageOptimizationOptions, ResponsiveBreakpoint } from '../../../services/imageOptimizationService';

describe('ImageOptimizationService', () => {
  let service: ImageOptimizationService;

  beforeEach(() => {
    service = new ImageOptimizationService();
    // Reset environment variables
    process.env.IMAGE_OPTIMIZATION_ENABLED = 'true';
    process.env.CDN_BASE_URL = '';
  });

  afterEach(() => {
    delete process.env.CDN_BASE_URL;
    delete process.env.IMAGE_OPTIMIZATION_ENABLED;
  });

  describe('getOptimizedUrl', () => {
    const originalUrl = 'https://example.com/images/photo.jpg';

    it('should return original URL when optimization is disabled', () => {
      process.env.IMAGE_OPTIMIZATION_ENABLED = 'false';
      service = new ImageOptimizationService();

      const result = service.getOptimizedUrl(originalUrl);
      expect(result).toBe(originalUrl);
    });

    it('should return original URL when URL is empty', () => {
      const result = service.getOptimizedUrl('');
      expect(result).toBe('');
    });

    it('should append transformation parameters to URL', () => {
      const options: ImageOptimizationOptions = {
        quality: 85,
        format: 'webp',
        width: 800,
        height: 600,
        fit: 'cover',
      };

      const result = service.getOptimizedUrl(originalUrl, options);

      expect(result).toContain('q=85');
      expect(result).toContain('f=webp');
      expect(result).toContain('w=800');
      expect(result).toContain('h=600');
      expect(result).toContain('fit=cover');
    });

    it('should use default quality when not specified', () => {
      const result = service.getOptimizedUrl(originalUrl, {});

      expect(result).toContain('q=80');
    });

    it('should not add format parameter when format is "original"', () => {
      const result = service.getOptimizedUrl(originalUrl, { format: 'original' });

      expect(result).not.toContain('f=');
    });

    it('should use Cloudflare format when CDN_BASE_URL is set', () => {
      process.env.CDN_BASE_URL = 'https://cdn.example.com';
      service = new ImageOptimizationService();

      const options: ImageOptimizationOptions = {
        width: 800,
        quality: 90,
        format: 'webp',
      };

      const result = service.getOptimizedUrl(originalUrl, options);

      expect(result).toContain('https://cdn.example.com/cdn-cgi/image/');
      expect(result).toContain('width=800');
      expect(result).toContain('quality=90');
      expect(result).toContain('format=webp');
      expect(result).toContain(encodeURIComponent(originalUrl));
    });

    it('should handle URLs that already have query parameters', () => {
      const urlWithParams = 'https://example.com/image.jpg?existing=param';
      const result = service.getOptimizedUrl(urlWithParams, { width: 500 });

      expect(result).toContain('&');
      expect(result).toContain('w=500');
    });

    it('should handle URLs without query parameters', () => {
      const result = service.getOptimizedUrl(originalUrl, { width: 500 });

      expect(result).toContain('?');
      expect(result).toContain('w=500');
    });
  });

  describe('generateSrcset', () => {
    const originalUrl = 'https://example.com/images/photo.jpg';

    it('should return empty string when optimization is disabled', () => {
      process.env.IMAGE_OPTIMIZATION_ENABLED = 'false';
      service = new ImageOptimizationService();

      const result = service.generateSrcset(originalUrl);
      expect(result).toBe('');
    });

    it('should return empty string when URL is empty', () => {
      const result = service.generateSrcset('');
      expect(result).toBe('');
    });

    it('should generate srcset for all breakpoints', () => {
      const result = service.generateSrcset(originalUrl);

      // Should contain entries for all default breakpoints
      expect(result).toContain('320w');
      expect(result).toContain('640w');
      expect(result).toContain('768w');
      expect(result).toContain('1024w');
      expect(result).toContain('1280w');
      expect(result).toContain('1920w');

      // Should have comma-separated format
      const parts = result.split(', ');
      expect(parts.length).toBe(6); // 6 default breakpoints
    });

    it('should apply options to all breakpoint URLs', () => {
      const options: ImageOptimizationOptions = {
        quality: 90,
        format: 'webp',
      };

      const result = service.generateSrcset(originalUrl, options);

      expect(result).toContain('q=90');
      expect(result).toContain('f=webp');
    });

    it('should use custom breakpoints if provided', () => {
      const customBreakpoints: ResponsiveBreakpoint[] = [
        { width: 400, suffix: '-s' },
        { width: 800, suffix: '-m' },
      ];

      service = new ImageOptimizationService(customBreakpoints);
      const result = service.generateSrcset(originalUrl);

      expect(result).toContain('400w');
      expect(result).toContain('800w');

      const parts = result.split(', ');
      expect(parts.length).toBe(2);
    });
  });

  describe('generateSizes', () => {
    it('should generate default sizes attribute', () => {
      const result = service.generateSizes();

      expect(result).toContain('(max-width: 640px) 100vw');
      expect(result).toContain('(max-width: 768px) 100vw');
      expect(result).toContain('(max-width: 1024px) 50vw');
      expect(result).toContain('100vw');
    });

    it('should use custom container width', () => {
      const result = service.generateSizes('50vw');

      expect(result).toContain('50vw');
      expect(result).not.toContain('100vw, 100vw'); // Should not have duplicate 100vw
    });

    it('should handle percentage container width', () => {
      const result = service.generateSizes('75%');

      expect(result).toContain('75%');
    });

    it('should handle pixel container width', () => {
      const result = service.generateSizes('800px');

      expect(result).toContain('800px');
    });
  });

  describe('getOptimizedImageData', () => {
    const originalUrl = 'https://example.com/images/photo.jpg';

    it('should return comprehensive optimized image data', () => {
      const options: ImageOptimizationOptions = {
        width: 1000,
        height: 800,
        quality: 85,
      };

      const result = service.getOptimizedImageData(originalUrl, options);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('srcset');
      expect(result).toHaveProperty('sizes');
      expect(result).toHaveProperty('webpUrl');
      expect(result).toHaveProperty('avifUrl');
      expect(result.width).toBe(1000);
      expect(result.height).toBe(800);
    });

    it('should generate WebP variant URL', () => {
      const result = service.getOptimizedImageData(originalUrl);

      expect(result.webpUrl).toContain('f=webp');
    });

    it('should generate AVIF variant URL', () => {
      const result = service.getOptimizedImageData(originalUrl);

      expect(result.avifUrl).toContain('f=avif');
    });

    it('should include srcset for responsive images', () => {
      const result = service.getOptimizedImageData(originalUrl);

      expect(result.srcset).toBeTruthy();
      expect(result.srcset).toContain('320w');
      expect(result.srcset).toContain('1920w');
    });

    it('should include sizes attribute', () => {
      const result = service.getOptimizedImageData(originalUrl);

      expect(result.sizes).toBeTruthy();
      expect(result.sizes).toContain('100vw');
    });

    it('should handle options without dimensions', () => {
      const result = service.getOptimizedImageData(originalUrl, { quality: 90 });

      expect(result.url).toBeTruthy();
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
    });
  });

  describe('generateOptimizedImageHtml', () => {
    const originalUrl = 'https://example.com/images/photo.jpg';
    const altText = 'Test image';

    it('should return empty string for empty URL', () => {
      const result = service.generateOptimizedImageHtml('', altText);

      expect(result).toBe('');
    });

    it('should generate picture element with source elements', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText);

      expect(result).toContain('<picture>');
      expect(result).toContain('</picture>');
      expect(result).toContain('<source');
      expect(result).toContain('<img');
    });

    it('should include AVIF source', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText);

      expect(result).toContain('type="image/avif"');
    });

    it('should include WebP source', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText);

      expect(result).toContain('type="image/webp"');
    });

    it('should include alt text on img element', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText);

      expect(result).toContain(`alt="${altText}"`);
    });

    it('should add lazy loading by default', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText);

      expect(result).toContain('loading="lazy"');
    });

    it('should not add lazy loading when disabled', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText, { lazy: false });

      expect(result).not.toContain('loading="lazy"');
    });

    it('should include CSS class when provided', () => {
      const className = 'my-image-class';
      const result = service.generateOptimizedImageHtml(originalUrl, altText, {}, className);

      expect(result).toContain(`class="${className}"`);
    });

    it('should not include class attribute when no className', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText);

      // Should not have an empty class attribute
      expect(result).not.toContain('class=""');
    });

    it('should include width and height attributes when provided', () => {
      const options: ImageOptimizationOptions = {
        width: 800,
        height: 600,
      };

      const result = service.generateOptimizedImageHtml(originalUrl, altText, options);

      expect(result).toContain('width="800"');
      expect(result).toContain('height="600"');
    });

    it('should generate valid HTML structure', () => {
      const result = service.generateOptimizedImageHtml(originalUrl, altText, {
        width: 1000,
        height: 750,
        quality: 90,
      });

      // Check for proper nesting
      const pictureStart = result.indexOf('<picture>');
      const pictureEnd = result.indexOf('</picture>');
      const imgTag = result.indexOf('<img');

      expect(pictureStart).toBeLessThan(imgTag);
      expect(imgTag).toBeLessThan(pictureEnd);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in URL', () => {
      const urlWithSpecialChars = 'https://example.com/images/photo with spaces.jpg';
      const result = service.getOptimizedUrl(urlWithSpecialChars, { width: 500 });

      expect(result).toBeTruthy();
    });

    it('should handle very small quality values', () => {
      const result = service.getOptimizedUrl('https://example.com/image.jpg', { quality: 1 });

      expect(result).toContain('q=1');
    });

    it('should handle maximum quality value', () => {
      const result = service.getOptimizedUrl('https://example.com/image.jpg', { quality: 100 });

      expect(result).toContain('q=100');
    });

    it('should handle very large dimensions', () => {
      const result = service.getOptimizedUrl('https://example.com/image.jpg', {
        width: 10000,
        height: 10000,
      });

      expect(result).toContain('w=10000');
      expect(result).toContain('h=10000');
    });

    it('should handle empty breakpoints array', () => {
      service = new ImageOptimizationService([]);
      const result = service.generateSrcset('https://example.com/image.jpg');

      expect(result).toBe('');
    });

    it('should handle single breakpoint', () => {
      const singleBreakpoint: ResponsiveBreakpoint[] = [{ width: 500, suffix: '-single' }];
      service = new ImageOptimizationService(singleBreakpoint);

      const result = service.generateSrcset('https://example.com/image.jpg');

      expect(result).toContain('500w');
      expect(result).not.toContain(', '); // No commas for single item
    });
  });

  describe('CDN integration', () => {
    beforeEach(() => {
      process.env.CDN_BASE_URL = 'https://cdn.example.com';
      service = new ImageOptimizationService();
    });

    it('should use CDN URL format for all transformations', () => {
      const url = 'https://example.com/image.jpg';
      const options: ImageOptimizationOptions = {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
        fit: 'contain',
      };

      const result = service.getOptimizedUrl(url, options);

      expect(result).toStartWith('https://cdn.example.com/cdn-cgi/image/');
      expect(result).toContain('width=800');
      expect(result).toContain('height=600');
      expect(result).toContain('quality=85');
      expect(result).toContain('format=webp');
      expect(result).toContain('fit=contain');
    });

    it('should properly encode original URL in CDN format', () => {
      const urlWithQuery = 'https://example.com/image.jpg?v=123&token=abc';
      const result = service.getOptimizedUrl(urlWithQuery, { width: 500 });

      expect(result).toContain(encodeURIComponent(urlWithQuery));
    });
  });
});
