/**
 * Publishing Services Index
 * Barrel exports and facade for publishing functionality
 */

import { Pool } from 'pg';
import pool from '../../config/database';

// Export individual service classes
export { SiteManagementService } from './siteManagementService';
export { PublishService } from './publishService';
export { CustomDomainService } from './customDomainService';
export { SslService } from './sslService';
export { SiteAnalyticsService } from './siteAnalyticsService';
export { VersionService } from './versionService';

// Import service classes for facade
import { SiteManagementService } from './siteManagementService';
import { PublishService } from './publishService';
import { CustomDomainService } from './customDomainService';
import { SslService } from './sslService';
import { SiteAnalyticsService } from './siteAnalyticsService';
import { VersionService } from './versionService';

// Re-export types for convenience
export type {
  PublishedSite,
  PublishedContent,
  CreatePublishedSiteDTO,
  UpdatePublishedSiteDTO,
  PublishResult,
  SiteDeploymentInfo,
  PublishedSiteSearchParams,
  PublishedSiteSearchResult,
  SiteAnalyticsSummary,
  SiteAnalyticsRecord,
  AnalyticsEventType,
  CustomDomainConfig,
  DomainVerificationResult,
  DnsRecord,
  SslCertificateInfo,
  SslProvisionResult,
  SiteVersion,
  SiteVersionHistory,
  RollbackResult,
} from '../../types/publishing';

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

  constructor(pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
    this.publishService = new PublishService(pool);
    this.customDomainService = new CustomDomainService(pool);
    this.sslService = new SslService(pool);
    this.siteAnalytics = new SiteAnalyticsService(pool);
    this.versionService = new VersionService(pool);
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

  async getSiteByDomain(...args: Parameters<SiteManagementService['getSiteByDomain']>) {
    return this.siteManagement.getSiteByDomain(...args);
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

  async pruneVersions(...args: Parameters<VersionService['pruneVersions']>) {
    return this.versionService.pruneVersions(...args);
  }
}

// Default instance for backwards compatibility
export const publishingService = new PublishingService(pool);
export default publishingService;
