/**
 * Image Optimization Service
 * Handles image resizing, compression, and format conversion for published sites
 */
export interface ImageOptimizationOptions {
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'original';
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    lazy?: boolean;
}
export interface ResponsiveBreakpoint {
    width: number;
    suffix: string;
}
export interface OptimizedImage {
    url: string;
    srcset?: string;
    sizes?: string;
    width?: number;
    height?: number;
    placeholder?: string;
    webpUrl?: string;
    avifUrl?: string;
}
export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    size: number;
    hash: string;
}
export declare class ImageOptimizationService {
    private breakpoints;
    constructor(breakpoints?: ResponsiveBreakpoint[]);
    /**
     * Generate optimized image URL with transformation parameters
     * Uses URL-based image transformation (compatible with Cloudflare, Imgix, etc.)
     */
    getOptimizedUrl(originalUrl: string, options?: ImageOptimizationOptions): string;
    /**
     * Generate responsive srcset for an image
     */
    generateSrcset(originalUrl: string, options?: ImageOptimizationOptions): string;
    /**
     * Generate sizes attribute for responsive images
     */
    generateSizes(containerWidth?: string): string;
    /**
     * Generate full optimized image data for HTML
     */
    getOptimizedImageData(originalUrl: string, options?: ImageOptimizationOptions): OptimizedImage;
    /**
     * Generate HTML for an optimized image with picture element
     */
    generateOptimizedImageHtml(originalUrl: string, alt: string, options?: ImageOptimizationOptions, className?: string): string;
    /**
     * Generate a blur placeholder data URL (LQIP - Low Quality Image Placeholder)
     * In production, this would use actual image processing
     */
    generatePlaceholder(originalUrl: string): string;
    /**
     * Get preload link for critical images (above the fold)
     */
    getPreloadLink(originalUrl: string, options?: ImageOptimizationOptions): string;
    /**
     * Escape HTML special characters
     */
    private escapeHtml;
}
export declare const imageOptimizationService: ImageOptimizationService;
export default imageOptimizationService;
//# sourceMappingURL=imageOptimizationService.d.ts.map