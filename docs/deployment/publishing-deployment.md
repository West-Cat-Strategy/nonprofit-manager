# Website Publishing & Deployment Guide

**Last Updated:** 2026-04-18

This guide covers the website publishing system, including custom domains, SSL certificates, and version management.

This document covers the publishing API surface mounted under `/api/v2/sites/*`. For a live route inventory, verify against [../../backend/src/modules/publishing/routes/index.ts](../../backend/src/modules/publishing/routes/index.ts).

Base URL choices for local testing:
- Direct backend runtime: `http://localhost:3000/api/v2`
- Docker dev backend: `http://localhost:8004/api/v2`
- Same-origin browser/public-site proxy: `/api/v2`

## Overview

The publishing system allows users to:
- Publish templates as live websites
- Configure custom domains with DNS verification
- Manage SSL certificates
- Rollback to previous versions

## API Endpoints

Examples below show relative paths. Prepend the base URL for the runtime you are using.

### Site Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/sites` | GET | List all sites (paginated) |
| `/api/v2/sites` | POST | Create a new site |
| `/api/v2/sites/:siteId` | GET | Get site details |
| `/api/v2/sites/:siteId` | PUT | Update site |
| `/api/v2/sites/:siteId` | DELETE | Delete site |
| `/api/v2/sites/publish` | POST | Publish a template |
| `/api/v2/sites/:siteId/unpublish` | POST | Unpublish (set to draft) |
| `/api/v2/sites/:siteId/deployment` | GET | Get deployment info |

### Custom Domain

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/sites/:siteId/domain` | POST | Add custom domain |
| `/api/v2/sites/:siteId/domain` | GET | Get domain config |
| `/api/v2/sites/:siteId/domain/verify` | POST | Verify DNS records |
| `/api/v2/sites/:siteId/domain` | DELETE | Remove custom domain |

### SSL Certificates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/sites/:siteId/ssl` | GET | Get SSL info |
| `/api/v2/sites/:siteId/ssl/provision` | POST | Provision SSL certificate |

### Version History

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/sites/:siteId/versions` | GET | Get version history |
| `/api/v2/sites/:siteId/versions/:version` | GET | Get specific version |
| `/api/v2/sites/:siteId/rollback` | POST | Rollback to version |
| `/api/v2/sites/:siteId/versions` | DELETE | Prune old versions |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/sites/:siteId/analytics` | GET | Get analytics summary (compatibility alias) |
| `/api/v2/sites/:siteId/analytics/summary` | GET | Get analytics summary |
| `/api/v2/sites/:siteId/track` | POST | Record analytics event (public) |

Additional site-console routes also live under `/api/v2/sites/:siteId/*`, including overview, forms, newsletters, and integrations management. This guide stays focused on deployment-facing publishing flows.

## Custom Domain Setup

### 1. Add Domain

```bash
POST /api/v2/sites/:siteId/domain
Content-Type: application/json

{
  "domain": "www.westcat.ca",
  "verificationMethod": "cname"  // or "txt"
}
```

Response:
```json
{
  "domain": "www.westcat.ca",
  "verificationStatus": "pending",
  "verificationToken": "abc123...",
  "verificationMethod": "cname",
  "dnsRecords": [
    {
      "type": "CNAME",
      "name": "www.westcat.ca",
      "value": "mysite-abc123.sites.westcat.ca",
      "verified": false
    }
  ]
}
```

### 2. Configure DNS

Add the required DNS records with your domain registrar:

**CNAME Method:**
- Name: `www.westcat.ca`
- Type: CNAME
- Value: `<subdomain>.sites.westcat.ca`

**TXT Method (for verification):**
- Name: `_npmverify.www.westcat.ca`
- Type: TXT
- Value: `npm-verify=<verification-token>`

Plus the CNAME record above.

### 3. Verify Domain

```bash
POST /api/v2/sites/:siteId/domain/verify
```

Response:
```json
{
  "domain": "www.westcat.ca",
  "verified": true,
  "status": "verified",
  "records": [...],
  "instructions": []
}
```

## SSL Certificate Management

### Automatic SSL

Once a domain is verified, SSL certificates are automatically provisioned using Let's Encrypt.

### Check SSL Status

```bash
GET /api/v2/sites/:siteId/ssl
```

Response:
```json
{
  "siteId": "uuid...",
  "domain": "www.westcat.ca",
  "status": "active",
  "issuer": "Let's Encrypt",
  "expiresAt": "2026-05-01T00:00:00Z",
  "daysUntilExpiry": 89,
  "autoRenew": true
}
```

### SSL Status Values

| Status | Description |
|--------|-------------|
| `none` | No certificate configured |
| `pending` | Certificate being provisioned |
| `active` | Certificate valid and active |
| `expiring_soon` | Certificate expires within 30 days |
| `expired` | Certificate has expired |
| `failed` | Certificate provisioning failed |

### Manual Provisioning

```bash
POST /api/v2/sites/:siteId/ssl/provision
```

## Version History & Rollback

### How It Works

Every time a site is published, a version snapshot is automatically saved. You can view the history and rollback to any previous version.

### View Version History

```bash
GET /api/v2/sites/:siteId/versions?limit=10
```

Response:
```json
{
  "siteId": "uuid...",
  "versions": [
    {
      "id": "uuid...",
      "version": "v1706123456789",
      "publishedAt": "2026-02-01T10:00:00Z",
      "publishedBy": "user-uuid",
      "changeDescription": "Published via API",
      "isCurrent": true
    },
    {
      "id": "uuid...",
      "version": "v1706123400000",
      "publishedAt": "2026-02-01T09:00:00Z",
      "publishedBy": "user-uuid",
      "changeDescription": "Published via API",
      "isCurrent": false
    }
  ],
  "currentVersion": "v1706123456789",
  "total": 5
}
```

### Rollback to Previous Version

```bash
POST /api/v2/sites/:siteId/rollback
Content-Type: application/json

{
  "version": "v1706123400000"
}
```

Response:
```json
{
  "success": true,
  "siteId": "uuid...",
  "previousVersion": "v1706123456789",
  "currentVersion": "v1706123400000",
  "rolledBackAt": "2026-02-01T11:00:00Z",
  "message": "Successfully rolled back from v1706123456789 to v1706123400000"
}
```

### Prune Old Versions

Remove old versions to save storage:

```bash
DELETE /api/v2/sites/:siteId/versions?keep=10
```

Response:
```json
{
  "deleted": 5
}
```

## Database Migration

Run the migration to add version history support:

```sql
-- Run migration 007_publishing_enhancements.sql
psql -d nonprofit_manager -f database/migrations/007_publishing_enhancements.sql
```

This creates:
- `site_versions` table for version history
- `domain_config` JSONB column on `published_sites`
- Automatic version pruning trigger (keeps last 50 versions)
- `site_activity_summary` view for dashboards

## Environment Variables

```bash
## Base URL for published sites
SITE_BASE_URL=https://sites.westcat.ca

## SSL provisioning (for production with Let's Encrypt)
ACME_EMAIL=admin@westcat.ca
ACME_DIRECTORY=https://acme-v02.api.letsencrypt.org/directory
```

## Production Considerations

### DNS Provider Integration

For automated DNS verification, consider integrating with:
- Cloudflare API
- AWS Route 53
- Google Cloud DNS
- DigitalOcean DNS

### SSL Certificate Automation

For production SSL:

1. **Let's Encrypt Integration**
   - Use `acme-client` or `greenlock` npm packages
   - Set up automated certificate renewal (cron job every 60 days)

2. **Cloudflare SSL**
   - Use Cloudflare as reverse proxy
   - Enable "Full (strict)" SSL mode

3. **AWS Certificate Manager**
   - For sites hosted on AWS infrastructure

### CDN Integration

For production performance:

1. Configure CDN (Cloudflare, AWS CloudFront, Fastly)
2. Set appropriate cache headers
3. Enable asset compression
4. Implement cache invalidation on publish

### Monitoring

Set up monitoring for:
- SSL certificate expiration (alert 14 days before)
- Domain verification failures
- Publishing errors
- Site availability

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Domain is already in use" | Another site uses this domain | Use a different domain or contact support |
| "Domain must be verified before SSL" | DNS not configured | Verify DNS records are correct |
| "Target version not found" | Invalid version ID | Check version history for valid versions |
| "Site has no published version" | Site is in draft | Publish the site first |

## Analytics Tracking

Published sites automatically collect analytics when enabled:

```javascript
// Tracking script (injected into published pages)
fetch('/api/v2/sites/{siteId}/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'pageview',
    pagePath: window.location.pathname,
    visitorId: getVisitorId(),
    sessionId: getSessionId()
  })
});
```

Disable analytics per-site:
```bash
PUT /api/v2/sites/:siteId
Content-Type: application/json

{
  "analyticsEnabled": false
}
```
