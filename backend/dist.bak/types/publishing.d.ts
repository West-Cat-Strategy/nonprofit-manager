/**
 * Publishing Types
 * Types for the website publishing and hosting system
 */
export type SiteStatus = 'draft' | 'published' | 'maintenance' | 'suspended';
export interface PublishedSite {
    id: string;
    userId: string;
    templateId: string;
    name: string;
    subdomain: string | null;
    customDomain: string | null;
    sslEnabled: boolean;
    sslCertificateExpiresAt: Date | null;
    status: SiteStatus;
    publishedVersion: string | null;
    publishedAt: Date | null;
    publishedContent: PublishedContent | null;
    analyticsEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface PublishedContent {
    templateId: string;
    templateName: string;
    theme: PublishedTheme;
    pages: PublishedPage[];
    navigation: PublishedNavigation;
    footer: PublishedFooter;
    seoDefaults: PublishedSEO;
    publishedAt: string;
    version: string;
}
export interface PublishedTheme {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
        textMuted: string;
        border: string;
        error: string;
        success: string;
        warning: string;
    };
    typography: {
        fontFamily: string;
        headingFontFamily: string;
        baseFontSize: string;
        lineHeight: string;
        headingLineHeight: string;
        fontWeightNormal: number;
        fontWeightMedium: number;
        fontWeightBold: number;
    };
    borderRadius: {
        sm: string;
        md: string;
        lg: string;
        full: string;
    };
    shadows: {
        sm: string;
        md: string;
        lg: string;
    };
}
export interface PublishedPage {
    id: string;
    slug: string;
    name: string;
    isHomepage: boolean;
    sections: PublishedSection[];
    seo: PublishedPageSEO;
}
export interface PublishedSection {
    id: string;
    name: string;
    components: PublishedComponent[];
    backgroundColor?: string;
    backgroundImage?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    maxWidth?: string;
}
export interface PublishedComponent {
    id: string;
    type: string;
    [key: string]: unknown;
}
export interface PublishedNavigation {
    items: PublishedNavItem[];
    logo?: string;
    logoAlt?: string;
    style: 'horizontal' | 'vertical' | 'dropdown';
    sticky: boolean;
    transparent: boolean;
}
export interface PublishedNavItem {
    id: string;
    label: string;
    url: string;
    children?: PublishedNavItem[];
    openInNewTab?: boolean;
}
export interface PublishedFooter {
    columns: PublishedFooterColumn[];
    copyright: string;
    socialLinks?: PublishedSocialLink[];
    showNewsletter?: boolean;
    newsletterTitle?: string;
    newsletterDescription?: string;
    backgroundColor?: string;
    textColor?: string;
}
export interface PublishedFooterColumn {
    id: string;
    title: string;
    links: PublishedFooterLink[];
}
export interface PublishedFooterLink {
    id: string;
    label: string;
    url: string;
}
export interface PublishedSocialLink {
    platform: string;
    url: string;
}
export interface PublishedSEO {
    title: string;
    description: string;
    keywords?: string[];
    ogImage?: string;
    favicon?: string;
    googleAnalyticsId?: string;
    customHeadCode?: string;
}
export interface PublishedPageSEO {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    noIndex?: boolean;
    canonicalUrl?: string;
}
export type AnalyticsEventType = 'pageview' | 'click' | 'form_submit' | 'donation' | 'event_register';
export interface SiteAnalyticsRecord {
    id: string;
    siteId: string;
    pagePath: string;
    visitorId: string | null;
    sessionId: string | null;
    userAgent: string | null;
    referrer: string | null;
    country: string | null;
    city: string | null;
    deviceType: string | null;
    browser: string | null;
    os: string | null;
    eventType: AnalyticsEventType;
    eventData: Record<string, unknown> | null;
    createdAt: Date;
}
export interface CreatePublishedSiteDTO {
    templateId: string;
    name: string;
    subdomain?: string;
    customDomain?: string;
}
export interface UpdatePublishedSiteDTO {
    name?: string;
    subdomain?: string;
    customDomain?: string;
    analyticsEnabled?: boolean;
    status?: SiteStatus;
}
export interface PublishSiteDTO {
    templateId: string;
    siteId?: string;
    subdomain?: string;
    customDomain?: string;
}
export interface PublishResult {
    siteId: string;
    url: string;
    previewUrl?: string;
    publishedAt: Date;
    version: string;
    status: 'success' | 'failed';
    error?: string;
}
export interface PreviewRequest {
    templateId: string;
    pageSlug?: string;
}
export interface GeneratedPage {
    slug: string;
    html: string;
    css: string;
}
export interface SiteDeploymentInfo {
    siteId: string;
    subdomain: string | null;
    customDomain: string | null;
    primaryUrl: string;
    status: SiteStatus;
    lastPublished: Date | null;
    version: string | null;
    sslEnabled: boolean;
    sslExpiresAt: Date | null;
}
export interface SiteAnalyticsSummary {
    totalPageviews: number;
    uniqueVisitors: number;
    topPages: {
        path: string;
        views: number;
    }[];
    trafficByDevice: {
        device: string;
        count: number;
    }[];
    trafficByCountry: {
        country: string;
        count: number;
    }[];
    recentEvents: SiteAnalyticsRecord[];
    periodStart: Date;
    periodEnd: Date;
}
export interface PublishedSiteSearchParams {
    status?: SiteStatus;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'createdAt' | 'publishedAt' | 'status';
    sortOrder?: 'asc' | 'desc';
}
export interface PublishedSiteSearchResult {
    sites: PublishedSite[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export type DomainVerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';
export interface CustomDomainConfig {
    domain: string;
    verificationStatus: DomainVerificationStatus;
    verificationToken: string;
    verificationMethod: 'cname' | 'txt';
    verifiedAt: Date | null;
    lastCheckedAt: Date | null;
    dnsRecords: DnsRecord[];
}
export interface DnsRecord {
    type: 'CNAME' | 'TXT' | 'A' | 'AAAA';
    name: string;
    value: string;
    ttl?: number;
    verified: boolean;
}
export interface DomainVerificationResult {
    domain: string;
    verified: boolean;
    status: DomainVerificationStatus;
    records: DnsRecord[];
    instructions: string[];
    error?: string;
}
export interface AddCustomDomainDTO {
    domain: string;
    verificationMethod?: 'cname' | 'txt';
}
export type SslStatus = 'none' | 'pending' | 'active' | 'expiring_soon' | 'expired' | 'failed';
export interface SslCertificateInfo {
    siteId: string;
    domain: string;
    status: SslStatus;
    issuer?: string;
    issuedAt?: Date;
    expiresAt?: Date;
    daysUntilExpiry?: number;
    autoRenew: boolean;
    lastRenewalAttempt?: Date;
    renewalError?: string;
}
export interface SslProvisionRequest {
    siteId: string;
    domain: string;
    autoRenew?: boolean;
}
export interface SslProvisionResult {
    success: boolean;
    status: SslStatus;
    message: string;
    certificateId?: string;
    expiresAt?: Date;
}
export interface SiteVersion {
    id: string;
    siteId: string;
    version: string;
    publishedContent: PublishedContent;
    publishedAt: Date;
    publishedBy: string;
    changeDescription?: string;
    isCurrent: boolean;
}
export interface SiteVersionHistory {
    siteId: string;
    versions: SiteVersion[];
    currentVersion: string | null;
    total: number;
}
export interface RollbackRequest {
    siteId: string;
    targetVersion: string;
}
export interface RollbackResult {
    success: boolean;
    siteId: string;
    previousVersion: string;
    currentVersion: string;
    rolledBackAt: Date;
    message: string;
}
export type CdnProvider = 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'bunny' | 'none';
export interface CdnConfig {
    provider: CdnProvider;
    enabled: boolean;
    baseUrl?: string;
    zoneId?: string;
    purgeApiKey?: string;
    imageOptimization: boolean;
    minification: boolean;
    compression: boolean;
}
export interface ImageOptimizationSettings {
    enabled: boolean;
    defaultQuality: number;
    defaultFormat: 'webp' | 'avif' | 'auto' | 'original';
    lazyLoading: boolean;
    responsiveImages: boolean;
    maxWidth: number;
    placeholders: boolean;
}
export interface SitePerformanceSettings {
    cdn: CdnConfig;
    imageOptimization: ImageOptimizationSettings;
    caching: {
        htmlTtl: number;
        assetsTtl: number;
        apiTtl: number;
    };
    compression: {
        gzip: boolean;
        brotli: boolean;
    };
    preloading: {
        criticalCss: boolean;
        prefetchLinks: boolean;
        preloadFonts: boolean;
    };
}
export interface SitePerformanceMetrics {
    siteId: string;
    timestamp: Date;
    lighthouse?: {
        performance: number;
        accessibility: number;
        bestPractices: number;
        seo: number;
    };
    webVitals?: {
        lcp: number;
        fid: number;
        cls: number;
        ttfb: number;
        fcp: number;
    };
    pageWeight: {
        total: number;
        html: number;
        css: number;
        js: number;
        images: number;
        fonts: number;
    };
}
export interface CdnPurgeRequest {
    siteId: string;
    paths?: string[];
    tags?: string[];
}
export interface CdnPurgeResult {
    success: boolean;
    provider: CdnProvider;
    purgedPaths: string[];
    message: string;
}
//# sourceMappingURL=publishing.d.ts.map