/**
 * Publishing Services Index
 * Barrel exports and facade for publishing functionality
 */

import { Pool } from 'pg';
import pool from '@config/database';

// Export individual service classes
export { SiteManagementService } from './siteManagementService';
export { PublishService } from './publishService';
export { CustomDomainService } from './customDomainService';
export { SslService } from './sslService';
export { SiteAnalyticsService } from './siteAnalyticsService';
export { VersionService } from './versionService';
export { WebsiteSiteSettingsService } from './siteSettingsService';
export { FormRegistryService } from './formRegistryService';
export { SiteOperationsService } from './siteOperationsService';

// Import service classes for facade
import { SiteManagementService } from './siteManagementService';
import { PublishService } from './publishService';
import { CustomDomainService } from './customDomainService';
import { SslService } from './sslService';
import { SiteAnalyticsService } from './siteAnalyticsService';
import { VersionService } from './versionService';
import { SiteOperationsService } from './siteOperationsService';

// Re-export types for convenience
export type {
  PublishedSite,
  PublishedContent,
  CreatePublishedSiteDTO,
  UpdatePublishedSiteDTO,
  PublishTarget,
  PublishResult,
  SiteDeploymentInfo,
  PublishedSiteSearchParams,
  PublishedSiteSearchResult,
  SiteAnalyticsSummary,
  SiteAnalyticsRecord,
  AnalyticsEventType,
  WebsiteFormDefinition,
  WebsiteIntegrationStatus,
  WebsiteOverviewSummary,
  WebsiteRouteSummary,
  WebsiteSiteSettings,
  WebsiteSiteSummary,
  WebsiteConversionMetrics,
  WebsiteConversionFunnel,
  WebsiteConversionFunnelStep,
  WebsiteConversionEventRecord,
  WebsiteFormPublicRuntime,
  CustomDomainConfig,
  DomainVerificationResult,
  DnsRecord,
  SslCertificateInfo,
  SslProvisionResult,
  SiteVersion,
  SiteVersionHistory,
  RollbackResult,
} from '@app-types/publishing';

/**
 * Publishing Service Facade
 * Provides a unified interface for all publishing functionality
 * This is the main class used by controllers
 */
export class PublishingService {
  private siteManagement: SiteManagementService;
  private publishService: PublishService;
  private customDomainService: CustomDomainService;
  private sslService: SslService;
  private siteAnalytics: SiteAnalyticsService;
  private versionService: VersionService;
  private siteOperations: SiteOperationsService;

  constructor(pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
    this.publishService = new PublishService(pool);
    this.customDomainService = new CustomDomainService(pool);
    this.sslService = new SslService(pool);
    this.siteAnalytics = new SiteAnalyticsService(pool);
    this.versionService = new VersionService(pool);
    this.siteOperations = new SiteOperationsService(pool);
  }

  // Site Management Methods
  async createSite(...args: Parameters<SiteManagementService['createSite']>) {
    return this.siteManagement.createSite(...args);
  }

  async getSite(...args: Parameters<SiteManagementService['getSite']>) {
    return this.siteManagement.getSite(...args);
  }

  async getSiteBySubdomain(...args: Parameters<SiteManagementService['getSiteBySubdomain']>) {
    return this.siteManagement.getSiteBySubdomain(...args);
  }

  async getSiteBySubdomainForPreview(
    ...args: Parameters<SiteManagementService['getSiteBySubdomainForPreview']>
  ) {
    return this.siteManagement.getSiteBySubdomainForPreview(...args);
  }

  async getSiteByDomain(...args: Parameters<SiteManagementService['getSiteByDomain']>) {
    return this.siteManagement.getSiteByDomain(...args);
  }

  async getSiteByDomainForPreview(
    ...args: Parameters<SiteManagementService['getSiteByDomainForPreview']>
  ) {
    return this.siteManagement.getSiteByDomainForPreview(...args);
  }

  async getPublicSiteById(...args: Parameters<SiteManagementService['getPublicSiteById']>) {
    return this.siteManagement.getPublicSiteById(...args);
  }

  async getPublicSiteByIdForPreview(
    ...args: Parameters<SiteManagementService['getPublicSiteByIdForPreview']>
  ) {
    return this.siteManagement.getPublicSiteByIdForPreview(...args);
  }

  async updateSite(...args: Parameters<SiteManagementService['updateSite']>) {
    return this.siteManagement.updateSite(...args);
  }

  async deleteSite(...args: Parameters<SiteManagementService['deleteSite']>) {
    return this.siteManagement.deleteSite(...args);
  }

  async searchSites(...args: Parameters<SiteManagementService['searchSites']>) {
    return this.siteManagement.searchSites(...args);
  }

  // Publish Methods
  async publish(...args: Parameters<PublishService['publish']>) {
    return this.publishService.publish(...args);
  }

  async publishSite(...args: Parameters<PublishService['publish']>) {
    return this.publishService.publish(...args);
  }

  async unpublish(...args: Parameters<PublishService['unpublish']>) {
    return this.publishService.unpublish(...args);
  }

  async getDeploymentInfo(...args: Parameters<PublishService['getDeploymentInfo']>) {
    return this.publishService.getDeploymentInfo(...args);
  }

  // Custom Domain Methods
  async addCustomDomain(...args: Parameters<CustomDomainService['addCustomDomain']>) {
    return this.customDomainService.addCustomDomain(...args);
  }

  async verifyCustomDomain(...args: Parameters<CustomDomainService['verifyCustomDomain']>) {
    return this.customDomainService.verifyCustomDomain(...args);
  }

  async removeCustomDomain(...args: Parameters<CustomDomainService['removeCustomDomain']>) {
    return this.customDomainService.removeCustomDomain(...args);
  }

  async getCustomDomainConfig(...args: Parameters<CustomDomainService['getCustomDomainConfig']>) {
    return this.customDomainService.getCustomDomainConfig(...args);
  }

  // SSL Methods
  async getSslInfo(...args: Parameters<SslService['getSslInfo']>) {
    return this.sslService.getSslInfo(...args);
  }

  async provisionSsl(...args: Parameters<SslService['provisionSsl']>) {
    return this.sslService.provisionSsl(...args);
  }

  async checkAndRenewSslCertificates() {
    return this.sslService.checkAndRenewSslCertificates();
  }

  // Analytics Methods
  async recordAnalyticsEvent(...args: Parameters<SiteAnalyticsService['recordAnalyticsEvent']>) {
    return this.siteAnalytics.recordAnalyticsEvent(...args);
  }

  async getAnalyticsSummary(...args: Parameters<SiteAnalyticsService['getAnalyticsSummary']>) {
    return this.siteAnalytics.getAnalyticsSummary(...args);
  }

  async getConversionMetrics(...args: Parameters<SiteOperationsService['getConversionMetrics']>) {
    return this.siteOperations.getConversionMetrics(...args);
  }

  async getConversionFunnel(...args: Parameters<SiteOperationsService['getConversionFunnel']>) {
    return this.siteOperations.getConversionFunnel(...args);
  }

  // Version Methods
  async getVersionHistory(...args: Parameters<VersionService['getVersionHistory']>) {
    return this.versionService.getVersionHistory(...args);
  }

  async saveVersion(...args: Parameters<VersionService['saveVersion']>) {
    return this.versionService.saveVersion(...args);
  }

  async rollback(...args: Parameters<VersionService['rollback']>) {
    return this.versionService.rollback(...args);
  }

  async getVersion(...args: Parameters<VersionService['getVersion']>) {
    return this.versionService.getVersion(...args);
  }

  async getPublicVersion(...args: Parameters<VersionService['getPublicVersion']>) {
    return this.versionService.getPublicVersion(...args);
  }

  async pruneVersions(...args: Parameters<VersionService['pruneVersions']>) {
    return this.versionService.pruneVersions(...args);
  }

  async listSitesForConsole(...args: Parameters<SiteOperationsService['listSites']>) {
    return this.siteOperations.listSites(...args);
  }

  async getSiteOverview(...args: Parameters<SiteOperationsService['getOverview']>) {
    return this.siteOperations.getOverview(...args);
  }

  async getSiteForms(...args: Parameters<SiteOperationsService['getForms']>) {
    return this.siteOperations.getForms(...args);
  }

  async updateSiteForm(...args: Parameters<SiteOperationsService['updateForm']>) {
    return this.siteOperations.updateForm(...args);
  }

  async getSiteIntegrationStatus(...args: Parameters<SiteOperationsService['getIntegrationStatus']>) {
    return this.siteOperations.getIntegrationStatus(...args);
  }
}

// Default instance for backwards compatibility
export const publishingService = new PublishingService(pool);
export default publishingService;
