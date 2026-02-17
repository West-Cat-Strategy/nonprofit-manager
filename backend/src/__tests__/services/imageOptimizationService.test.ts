/**
 * Image Optimization Service Tests
 */

import {
  ImageOptimizationService,
  imageOptimizationService,
} from '@services';

describe('ImageOptimizationService', () => {
  let service: ImageOptimizationService;

  beforeEach(() => {
    service = new ImageOptimizationService();
  });

  describe('getOptimizedUrl', () => {
    it('should return original URL when optimization is disabled', () => {
      const originalUrl = 'https://example.com/image.jpg';
      // When no CDN is configured, it appends query params
      const result = service.getOptimizedUrl(originalUrl);
      expect(result).toContain(originalUrl);
    });

    it('should add quality parameter', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedUrl(originalUrl, { quality: 75 });
      expect(result).toContain('q=75');
    });

    it('should add width parameter', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedUrl(originalUrl, { width: 800 });
      expect(result).toContain('w=800');
    });

    it('should add height parameter', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedUrl(originalUrl, { height: 600 });
      expect(result).toContain('h=600');
    });

    it('should add format parameter for webp', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedUrl(originalUrl, { format: 'webp' });
      expect(result).toContain('f=webp');
    });

    it('should not add format parameter for original', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedUrl(originalUrl, { format: 'original' });
      expect(result).not.toContain('f=');
    });

    it('should add fit parameter', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedUrl(originalUrl, { fit: 'contain' });
      expect(result).toContain('fit=contain');
    });

    it('should return empty string for empty URL', () => {
      const result = service.getOptimizedUrl('');
      expect(result).toBe('');
    });
  });

  describe('generateSrcset', () => {
    it('should generate srcset with multiple widths', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateSrcset(originalUrl);

      expect(result).toContain('320w');
      expect(result).toContain('640w');
      expect(result).toContain('768w');
      expect(result).toContain('1024w');
      expect(result).toContain('1280w');
      expect(result).toContain('1920w');
    });

    it('should return empty string for empty URL', () => {
      const result = service.generateSrcset('');
      expect(result).toBe('');
    });

    it('should apply options to all srcset entries', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateSrcset(originalUrl, { quality: 90 });
      expect(result).toContain('q=90');
    });
  });

  describe('generateSizes', () => {
    it('should generate default sizes', () => {
      const result = service.generateSizes();
      expect(result).toContain('100vw');
      expect(result).toContain('50vw');
    });

    it('should use custom container width', () => {
      const result = service.generateSizes('80vw');
      expect(result).toContain('80vw');
    });
  });

  describe('getOptimizedImageData', () => {
    it('should return complete image data object', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedImageData(originalUrl);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('srcset');
      expect(result).toHaveProperty('sizes');
      expect(result).toHaveProperty('webpUrl');
      expect(result).toHaveProperty('avifUrl');
    });

    it('should include width and height when provided', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.getOptimizedImageData(originalUrl, {
        width: 800,
        height: 600,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });
  });

  describe('generateOptimizedImageHtml', () => {
    it('should generate picture element with sources', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateOptimizedImageHtml(originalUrl, 'Test image');

      expect(result).toContain('<picture>');
      expect(result).toContain('</picture>');
      expect(result).toContain('<source type="image/avif"');
      expect(result).toContain('<source type="image/webp"');
      expect(result).toContain('<img');
    });

    it('should include alt text', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateOptimizedImageHtml(originalUrl, 'My alt text');

      expect(result).toContain('alt="My alt text"');
    });

    it('should include lazy loading by default', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateOptimizedImageHtml(originalUrl, 'Test');

      expect(result).toContain('loading="lazy"');
    });

    it('should not include lazy loading when disabled', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateOptimizedImageHtml(originalUrl, 'Test', {
        lazy: false,
      });

      expect(result).not.toContain('loading="lazy"');
    });

    it('should include class when provided', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateOptimizedImageHtml(
        originalUrl,
        'Test',
        {},
        'my-image-class'
      );

      expect(result).toContain('class="my-image-class"');
    });

    it('should include width and height attributes', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateOptimizedImageHtml(originalUrl, 'Test', {
        width: 800,
        height: 600,
      });

      expect(result).toContain('width="800"');
      expect(result).toContain('height="600"');
    });

    it('should return empty string for empty URL', () => {
      const result = service.generateOptimizedImageHtml('', 'Test');
      expect(result).toBe('');
    });

    it('should escape HTML in alt text', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = service.generateOptimizedImageHtml(
        originalUrl,
        '<script>alert("xss")</script>'
      );

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('generatePlaceholder', () => {
    it('should generate SVG data URL', () => {
      const result = service.generatePlaceholder('https://example.com/image.jpg');

      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('should generate consistent placeholder for same URL', () => {
      const url = 'https://example.com/image.jpg';
      const result1 = service.generatePlaceholder(url);
      const result2 = service.generatePlaceholder(url);

      expect(result1).toBe(result2);
    });

    it('should generate different placeholders for different URLs', () => {
      const result1 = service.generatePlaceholder('https://example.com/image1.jpg');
      const result2 = service.generatePlaceholder('https://example.com/image2.jpg');

      expect(result1).not.toBe(result2);
    });
  });

  describe('getPreloadLink', () => {
    it('should generate preload link tag', () => {
      const result = service.getPreloadLink('https://example.com/image.jpg');

      expect(result).toContain('<link rel="preload"');
      expect(result).toContain('as="image"');
      expect(result).toContain('type="image/webp"');
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(imageOptimizationService).toBeInstanceOf(ImageOptimizationService);
    });
  });
});
