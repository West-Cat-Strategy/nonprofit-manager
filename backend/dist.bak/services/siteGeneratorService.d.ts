/**
 * Site Generator Service
 * Generates static HTML/CSS for published websites
 */
import type { PublishedContent, PublishedPage, GeneratedPage } from '../types/publishing';
export declare class SiteGeneratorService {
    /**
     * Generate all pages for a published site
     */
    generateSite(content: PublishedContent): GeneratedPage[];
    /**
     * Generate a single page
     */
    generatePage(page: PublishedPage, content: PublishedContent): GeneratedPage;
    /**
     * Generate the full HTML document
     */
    private generateHTML;
    /**
     * Generate Google Analytics script
     */
    private generateGoogleAnalytics;
    /**
     * Generate navigation HTML
     */
    private generateNavigation;
    /**
     * Generate a navigation item
     */
    private generateNavItem;
    /**
     * Generate footer HTML
     */
    private generateFooter;
    /**
     * Generate a section HTML
     */
    private generateSection;
    /**
     * Generate a component HTML
     */
    private generateComponent;
    /**
     * Generate heading component
     */
    private generateHeading;
    /**
     * Generate text component
     */
    private generateText;
    /**
     * Generate button component
     */
    private generateButton;
    /**
     * Generate image component with optimization
     */
    private generateImage;
    /**
     * Generate divider component
     */
    private generateDivider;
    /**
     * Generate spacer component
     */
    private generateSpacer;
    /**
     * Generate stats component
     */
    private generateStats;
    /**
     * Generate testimonial component
     */
    private generateTestimonial;
    /**
     * Generate gallery component with optimized images
     */
    private generateGallery;
    /**
     * Generate video component
     */
    private generateVideo;
    /**
     * Generate contact form component
     */
    private generateContactForm;
    /**
     * Generate newsletter signup component
     */
    private generateNewsletterSignup;
    /**
     * Generate donation form component
     */
    private generateDonationForm;
    /**
     * Generate social links component
     */
    private generateSocialLinks;
    /**
     * Get social icon SVG
     */
    private getSocialIcon;
    /**
     * Generate theme CSS
     */
    private generateThemeCSS;
    /**
     * Escape HTML special characters
     */
    private escapeHtml;
}
export declare const siteGeneratorService: SiteGeneratorService;
export default siteGeneratorService;
//# sourceMappingURL=siteGeneratorService.d.ts.map