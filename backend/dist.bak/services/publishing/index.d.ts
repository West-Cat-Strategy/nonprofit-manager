/**
 * Publishing Services Index
 * Barrel exports and facade for publishing functionality
 */
import { Pool } from 'pg';
export { SiteManagementService } from './siteManagementService';
export { PublishService } from './publishService';
export { CustomDomainService } from './customDomainService';
export { SslService } from './sslService';
export { SiteAnalyticsService } from './siteAnalyticsService';
export { VersionService } from './versionService';
import { SiteManagementService } from './siteManagementService';
import { PublishService } from './publishService';
import { CustomDomainService } from './customDomainService';
import { SslService } from './sslService';
import { SiteAnalyticsService } from './siteAnalyticsService';
import { VersionService } from './versionService';
export type { PublishedSite, PublishedContent, CreatePublishedSiteDTO, UpdatePublishedSiteDTO, PublishResult, SiteDeploymentInfo, PublishedSiteSearchParams, PublishedSiteSearchResult, SiteAnalyticsSummary, SiteAnalyticsRecord, AnalyticsEventType, CustomDomainConfig, DomainVerificationResult, DnsRecord, SslCertificateInfo, SslProvisionResult, SiteVersion, SiteVersionHistory, RollbackResult, } from '../../types/publishing';
/**
 * Publishing Service Facade
 * Provides a unified interface for all publishing functionality
 * This is the main class used by controllers
 */
export declare class PublishingService {
    private siteManagement;
    private publishService;
    private customDomainService;
    private sslService;
    private siteAnalytics;
    private versionService;
    constructor(pool: Pool);
    createSite(...args: Parameters<SiteManagementService['createSite']>): Promise<import("../../types/publishing").PublishedSite>;
    getSite(...args: Parameters<SiteManagementService['getSite']>): Promise<import("../../types/publishing").PublishedSite | null>;
    getSiteBySubdomain(...args: Parameters<SiteManagementService['getSiteBySubdomain']>): Promise<import("../../types/publishing").PublishedSite | null>;
    getSiteByDomain(...args: Parameters<SiteManagementService['getSiteByDomain']>): Promise<import("../../types/publishing").PublishedSite | null>;
    updateSite(...args: Parameters<SiteManagementService['updateSite']>): Promise<import("../../types/publishing").PublishedSite | null>;
    deleteSite(...args: Parameters<SiteManagementService['deleteSite']>): Promise<boolean>;
    searchSites(...args: Parameters<SiteManagementService['searchSites']>): Promise<import("../../types/publishing").PublishedSiteSearchResult>;
    publish(...args: Parameters<PublishService['publish']>): Promise<import("../../types/publishing").PublishResult>;
    publishSite(...args: Parameters<PublishService['publish']>): Promise<import("../../types/publishing").PublishResult>;
    unpublish(...args: Parameters<PublishService['unpublish']>): Promise<import("../../types/publishing").PublishedSite | null>;
    getDeploymentInfo(...args: Parameters<PublishService['getDeploymentInfo']>): Promise<import("../../types/publishing").SiteDeploymentInfo | null>;
    addCustomDomain(...args: Parameters<CustomDomainService['addCustomDomain']>): Promise<import("../../types/publishing").CustomDomainConfig>;
    verifyCustomDomain(...args: Parameters<CustomDomainService['verifyCustomDomain']>): Promise<import("../../types/publishing").DomainVerificationResult>;
    removeCustomDomain(...args: Parameters<CustomDomainService['removeCustomDomain']>): Promise<boolean>;
    getCustomDomainConfig(...args: Parameters<CustomDomainService['getCustomDomainConfig']>): Promise<import("../../types/publishing").CustomDomainConfig | null>;
    getSslInfo(...args: Parameters<SslService['getSslInfo']>): Promise<import("../../types/publishing").SslCertificateInfo | null>;
    provisionSsl(...args: Parameters<SslService['provisionSsl']>): Promise<import("../../types/publishing").SslProvisionResult>;
    checkAndRenewSslCertificates(): Promise<{
        renewed: number;
        failed: number;
    }>;
    recordAnalyticsEvent(...args: Parameters<SiteAnalyticsService['recordAnalyticsEvent']>): Promise<import("../../types/publishing").SiteAnalyticsRecord>;
    getAnalyticsSummary(...args: Parameters<SiteAnalyticsService['getAnalyticsSummary']>): Promise<import("../../types/publishing").SiteAnalyticsSummary>;
    getVersionHistory(...args: Parameters<VersionService['getVersionHistory']>): Promise<import("../../types/publishing").SiteVersionHistory>;
    saveVersion(...args: Parameters<VersionService['saveVersion']>): Promise<import("../../types/publishing").SiteVersion>;
    rollback(...args: Parameters<VersionService['rollback']>): Promise<import("../../types/publishing").RollbackResult>;
    getVersion(...args: Parameters<VersionService['getVersion']>): Promise<import("../../types/publishing").SiteVersion | null>;
    pruneVersions(...args: Parameters<VersionService['pruneVersions']>): Promise<number>;
}
export declare const publishingService: PublishingService;
export default publishingService;
//# sourceMappingURL=index.d.ts.map