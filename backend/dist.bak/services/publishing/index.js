"use strict";
/**
 * Publishing Services Index
 * Barrel exports and facade for publishing functionality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishingService = exports.PublishingService = exports.VersionService = exports.SiteAnalyticsService = exports.SslService = exports.CustomDomainService = exports.PublishService = exports.SiteManagementService = void 0;
const database_1 = __importDefault(require("../../config/database"));
// Export individual service classes
var siteManagementService_1 = require("./siteManagementService");
Object.defineProperty(exports, "SiteManagementService", { enumerable: true, get: function () { return siteManagementService_1.SiteManagementService; } });
var publishService_1 = require("./publishService");
Object.defineProperty(exports, "PublishService", { enumerable: true, get: function () { return publishService_1.PublishService; } });
var customDomainService_1 = require("./customDomainService");
Object.defineProperty(exports, "CustomDomainService", { enumerable: true, get: function () { return customDomainService_1.CustomDomainService; } });
var sslService_1 = require("./sslService");
Object.defineProperty(exports, "SslService", { enumerable: true, get: function () { return sslService_1.SslService; } });
var siteAnalyticsService_1 = require("./siteAnalyticsService");
Object.defineProperty(exports, "SiteAnalyticsService", { enumerable: true, get: function () { return siteAnalyticsService_1.SiteAnalyticsService; } });
var versionService_1 = require("./versionService");
Object.defineProperty(exports, "VersionService", { enumerable: true, get: function () { return versionService_1.VersionService; } });
// Import service classes for facade
const siteManagementService_2 = require("./siteManagementService");
const publishService_2 = require("./publishService");
const customDomainService_2 = require("./customDomainService");
const sslService_2 = require("./sslService");
const siteAnalyticsService_2 = require("./siteAnalyticsService");
const versionService_2 = require("./versionService");
/**
 * Publishing Service Facade
 * Provides a unified interface for all publishing functionality
 * This is the main class used by controllers
 */
class PublishingService {
    constructor(pool) {
        this.siteManagement = new siteManagementService_2.SiteManagementService(pool);
        this.publishService = new publishService_2.PublishService(pool);
        this.customDomainService = new customDomainService_2.CustomDomainService(pool);
        this.sslService = new sslService_2.SslService(pool);
        this.siteAnalytics = new siteAnalyticsService_2.SiteAnalyticsService(pool);
        this.versionService = new versionService_2.VersionService(pool);
    }
    // Site Management Methods
    async createSite(...args) {
        return this.siteManagement.createSite(...args);
    }
    async getSite(...args) {
        return this.siteManagement.getSite(...args);
    }
    async getSiteBySubdomain(...args) {
        return this.siteManagement.getSiteBySubdomain(...args);
    }
    async getSiteByDomain(...args) {
        return this.siteManagement.getSiteByDomain(...args);
    }
    async updateSite(...args) {
        return this.siteManagement.updateSite(...args);
    }
    async deleteSite(...args) {
        return this.siteManagement.deleteSite(...args);
    }
    async searchSites(...args) {
        return this.siteManagement.searchSites(...args);
    }
    // Publish Methods
    async publish(...args) {
        return this.publishService.publish(...args);
    }
    async publishSite(...args) {
        return this.publishService.publish(...args);
    }
    async unpublish(...args) {
        return this.publishService.unpublish(...args);
    }
    async getDeploymentInfo(...args) {
        return this.publishService.getDeploymentInfo(...args);
    }
    // Custom Domain Methods
    async addCustomDomain(...args) {
        return this.customDomainService.addCustomDomain(...args);
    }
    async verifyCustomDomain(...args) {
        return this.customDomainService.verifyCustomDomain(...args);
    }
    async removeCustomDomain(...args) {
        return this.customDomainService.removeCustomDomain(...args);
    }
    async getCustomDomainConfig(...args) {
        return this.customDomainService.getCustomDomainConfig(...args);
    }
    // SSL Methods
    async getSslInfo(...args) {
        return this.sslService.getSslInfo(...args);
    }
    async provisionSsl(...args) {
        return this.sslService.provisionSsl(...args);
    }
    async checkAndRenewSslCertificates() {
        return this.sslService.checkAndRenewSslCertificates();
    }
    // Analytics Methods
    async recordAnalyticsEvent(...args) {
        return this.siteAnalytics.recordAnalyticsEvent(...args);
    }
    async getAnalyticsSummary(...args) {
        return this.siteAnalytics.getAnalyticsSummary(...args);
    }
    // Version Methods
    async getVersionHistory(...args) {
        return this.versionService.getVersionHistory(...args);
    }
    async saveVersion(...args) {
        return this.versionService.saveVersion(...args);
    }
    async rollback(...args) {
        return this.versionService.rollback(...args);
    }
    async getVersion(...args) {
        return this.versionService.getVersion(...args);
    }
    async pruneVersions(...args) {
        return this.versionService.pruneVersions(...args);
    }
}
exports.PublishingService = PublishingService;
// Default instance for backwards compatibility
exports.publishingService = new PublishingService(database_1.default);
exports.default = exports.publishingService;
//# sourceMappingURL=index.js.map