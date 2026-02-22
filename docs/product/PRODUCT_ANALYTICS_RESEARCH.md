# Product Analytics Integration Research

## Overview

This document evaluates privacy-focused analytics solutions for the Nonprofit Manager application. Given the sensitive nature of nonprofit data and the importance of donor trust, we prioritize solutions that are privacy-first, GDPR/CCPA compliant, and provide meaningful insights without compromising user privacy.

## Requirements

### Must-Have Features
- **Privacy-first**: No cookies, no personal data collection, GDPR/CCPA compliant
- **Self-hosted option**: Full data ownership and control
- **Lightweight**: Minimal impact on page load times
- **Simple dashboard**: Easy to understand metrics for nonprofit staff
- **Event tracking**: Custom events for key actions (donations, volunteer signups, etc.)
- **Real-time data**: Current visitor information
- **API access**: Integration with our existing analytics dashboard

### Nice-to-Have Features
- **Funnel analysis**: Track donation and signup flows
- **Goal tracking**: Monitor conversion rates
- **Geographic data**: Understand donor demographics (anonymized)
- **Referrer tracking**: Know where visitors come from
- **Custom dimensions**: Tag events with additional context

## Evaluated Solutions

### 1. Plausible Analytics ⭐ RECOMMENDED

**Overview**: Lightweight, open-source, privacy-friendly alternative to Google Analytics.

**Pros**:
- ✅ Tiny script size (<1 KB) - negligible performance impact
- ✅ Self-hosted Community Edition (AGPL license) available
- ✅ No cookies, fully GDPR/CCPA/PECR compliant
- ✅ Simple, clean dashboard - perfect for nonprofit users
- ✅ Open-source with active development
- ✅ Event tracking and custom properties
- ✅ API access for integration
- ✅ Real-time dashboard
- ✅ Hosted in EU or self-hosted

**Cons**:
- ⚠️ Self-hosted version released twice per year (slower updates)
- ⚠️ Requires ClickHouse database (adds infrastructure complexity)
- ⚠️ Limited funnel analysis compared to traditional analytics

**Pricing**:
- Self-hosted: Free (AGPL license)
- Cloud: Starting at $9/month for 10k monthly pageviews

**Technical Stack**:
- Elixir backend
- ClickHouse database
- JavaScript tracking script
- REST API

**Integration Approach**:
```javascript
// Simple script tag in frontend
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>

// Custom event tracking
plausible('Donation', { props: { amount: 100, frequency: 'monthly' } });
plausible('Volunteer Signup', { props: { role: 'tutor' } });
```

**Resources**:
- [GitHub Repository](https://github.com/plausible/analytics)
- [Self-Hosted Documentation](https://plausible.io/self-hosted-web-analytics)
- [Main Website](https://plausible.io/)

### 2. Matomo

**Overview**: Comprehensive open-source web analytics platform with full feature parity to Google Analytics.

**Pros**:
- ✅ Most feature-rich option
- ✅ Self-hosted or cloud options
- ✅ GDPR/HIPAA compliant
- ✅ Extensive funnel and goal tracking
- ✅ Mature platform with large community
- ✅ Mobile app analytics support
- ✅ Heatmaps and session recordings available

**Cons**:
- ⚠️ Heavier script (22 KB) - noticeable performance impact
- ⚠️ Complex dashboard - steeper learning curve
- ⚠️ Requires MySQL/MariaDB database
- ⚠️ Self-hosting requires more resources

**Pricing**:
- Self-hosted: Free (GPL license)
- Cloud: Starting at €19/month for 50k monthly actions

**Best For**: Organizations needing enterprise-grade analytics with complete feature set.

**Resources**:
- [Main Website](https://matomo.org/)

### 3. Fathom Analytics

**Overview**: Privacy-first analytics built for simplicity.

**Pros**:
- ✅ Extremely simple interface
- ✅ Fast, lightweight script
- ✅ No cookies, fully compliant
- ✅ Beautiful dashboard design
- ✅ Event tracking
- ✅ Email reports

**Cons**:
- ❌ No self-hosted option (cloud only)
- ⚠️ Higher pricing
- ⚠️ Limited customization
- ⚠️ Closed source

**Pricing**: Starting at $15/month for 100k pageviews

**Best For**: Organizations prioritizing simplicity and willing to pay for managed hosting.

**Resources**:
- [Main Website](https://usefathom.com/)

### 4. Simple Analytics

**Overview**: Clean, straightforward analytics with EU-based hosting.

**Pros**:
- ✅ Very simple interface
- ✅ No cookies
- ✅ Data stored in EU (Netherlands)
- ✅ Fast, lightweight
- ✅ Event tracking

**Cons**:
- ❌ No self-hosted option
- ⚠️ Limited features compared to others
- ⚠️ Closed source

**Pricing**: Starting at €19/month for 100k pageviews

**Best For**: Organizations wanting simplicity with EU data residency.

**Resources**:
- [Main Website](https://www.simpleanalytics.com/)

### 5. Piwik PRO

**Overview**: Enterprise analytics platform focused on healthcare and financial sectors.

**Pros**:
- ✅ GDPR and HIPAA compliant
- ✅ Advanced security features
- ✅ Comprehensive feature set
- ✅ Audience segmentation
- ✅ Tag management

**Cons**:
- ⚠️ Enterprise-focused (may be overkill)
- ⚠️ More complex setup
- ⚠️ Higher resource requirements

**Pricing**: Free tier available, paid plans for enterprise

**Best For**: Large nonprofits with complex compliance requirements.

**Resources**:
- [Contentsquare Guide](https://contentsquare.com/guides/google-analytics-4/alternatives/)

## Comparison Matrix

| Feature | Plausible | Matomo | Fathom | Simple | Piwik PRO |
|---------|-----------|--------|--------|--------|-----------|
| **Self-Hosted** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **Script Size** | <1 KB | 22 KB | ~1 KB | ~6 KB | ~25 KB |
| **Privacy** | Excellent | Excellent | Excellent | Excellent | Excellent |
| **Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Features** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Open Source** | ✅ AGPL | ✅ GPL | ❌ No | ❌ No | ⚠️ Core only |
| **API Access** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Cost (Self)** | Free | Free | N/A | N/A | Free tier |
| **Cost (Cloud)** | $9/mo | €19/mo | $15/mo | €19/mo | Contact |
| **Database** | ClickHouse | MySQL | N/A | N/A | PostgreSQL |

## Recommendation: Plausible Analytics

### Why Plausible?

1. **Perfect Balance**: Combines simplicity with essential features
2. **Self-Hosted Control**: Full data ownership with AGPL license
3. **Performance**: Minimal impact on page load times (<1 KB script)
4. **Privacy-First**: Built with privacy as core principle, not an afterthought
5. **Nonprofit-Friendly**: Simple enough for all staff levels to understand
6. **Open Source**: Transparent, auditable codebase
7. **Active Development**: Regular updates and improvements
8. **Cost-Effective**: Free self-hosted or affordable cloud option

### Implementation Plan

#### Phase 1: Setup (Week 4)
1. Deploy self-hosted Plausible instance
   - Docker Compose setup
   - ClickHouse database
   - Nginx reverse proxy
2. Configure domain and SSL
3. Add tracking script to frontend
4. Test basic pageview tracking

#### Phase 2: Custom Events (Week 4)
1. Track key nonprofit actions:
   - Donation started
   - Donation completed
   - Volunteer signup initiated
   - Volunteer signup completed
   - Contact form submitted
   - Case created
   - Event registration
2. Add custom properties:
   - Donation amount range ($1-$99, $100-$499, etc.)
   - User role (visitor, authenticated user)
   - Campaign source (if applicable)

#### Phase 3: Dashboard Integration (Week 5)
1. Build analytics widget for admin dashboard
2. Use Plausible API to fetch:
   - Daily visitors
   - Top pages
   - Conversion rates
   - Key events count
3. Display metrics in existing analytics dashboard
4. Add filtering by date range

#### Phase 4: Reporting (Week 5)
1. Create weekly email reports for admins
2. Highlight key metrics:
   - Website traffic trends
   - Donation funnel performance
   - Volunteer signup rates
   - Most visited pages
3. Compare to previous periods

### Technical Integration

#### Docker Compose Configuration
```yaml
version: '3.8'

services:
  plausible:
    image: plausible/analytics:latest
    restart: always
    command: sh -c "sleep 10 && /entrypoint.sh db createdb && /entrypoint.sh db migrate && /entrypoint.sh run"
    depends_on:
      - plausible_db
      - plausible_events_db
    ports:
      - 8000:8000
    environment:
      - BASE_URL=analytics.yourdomain.com
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - DATABASE_URL=postgres://postgres:postgres@plausible_db:5432/plausible_db
      - CLICKHOUSE_DATABASE_URL=plausible_events_db:8123/plausible_events_db

  plausible_db:
    image: postgres:14-alpine
    restart: always
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=postgres

  plausible_events_db:
    image: clickhouse/clickhouse-server:23.3.7.5-alpine
    restart: always
    volumes:
      - event-data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

volumes:
  db-data:
  event-data:
```

#### Frontend Integration
```typescript
// frontend/src/utils/analytics.ts
declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, any> }) => void;
  }
}

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (window.plausible) {
    window.plausible(eventName, { props: properties });
  }
};

// Usage examples
export const trackDonationStarted = (amount: number) => {
  trackEvent('Donation Started', {
    amount_range: getAmountRange(amount),
  });
};

export const trackDonationCompleted = (amount: number, frequency: string) => {
  trackEvent('Donation Completed', {
    amount_range: getAmountRange(amount),
    frequency,
  });
};

export const trackVolunteerSignup = (role: string) => {
  trackEvent('Volunteer Signup', { role });
};

function getAmountRange(amount: number): string {
  if (amount < 100) return '$1-$99';
  if (amount < 500) return '$100-$499';
  if (amount < 1000) return '$500-$999';
  return '$1000+';
}
```

#### Backend API Integration
```typescript
// backend/src/services/plausibleService.ts
import axios from 'axios';

const PLAUSIBLE_API_BASE = process.env.PLAUSIBLE_API_BASE || 'analytics.yourdomain.com';
const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY;
const SITE_ID = process.env.PLAUSIBLE_SITE_ID;

export class PlausibleService {
  private client = axios.create({
    baseURL: `${PLAUSIBLE_API_BASE}/api/v1`,
    headers: {
      'Authorization': `Bearer ${PLAUSIBLE_API_KEY}`,
    },
  });

  async getRealtimeVisitors(): Promise<number> {
    const response = await this.client.get(`/stats/realtime/visitors`, {
      params: { site_id: SITE_ID },
    });
    return response.data;
  }

  async getAggregate(period: string, metrics: string[]): Promise<any> {
    const response = await this.client.get(`/stats/aggregate`, {
      params: {
        site_id: SITE_ID,
        period,
        metrics: metrics.join(','),
      },
    });
    return response.data.results;
  }

  async getTimeseries(period: string, metrics: string[]): Promise<any> {
    const response = await this.client.get(`/stats/timeseries`, {
      params: {
        site_id: SITE_ID,
        period,
        metrics: metrics.join(','),
      },
    });
    return response.data.results;
  }
}
```

### Security Considerations

1. **API Key Management**: Store Plausible API key in environment variables
2. **CORS Configuration**: Restrict Plausible instance to accept requests from your domain only
3. **Data Retention**: Configure appropriate retention period (default: 2 years)
4. **Access Control**: Limit dashboard access to authorized staff only
5. **SSL/TLS**: Always use HTTPS for tracking script and API calls

### Cost Analysis

#### Self-Hosted Option
- **Infrastructure**: ~$20-40/month (DigitalOcean, AWS, etc.)
- **Maintenance**: 2-4 hours/month
- **Storage**: Grows ~1-2 GB/month for typical nonprofit traffic
- **Total**: ~$20-40/month + staff time

#### Cloud Option
- **Plausible Cloud**: $9/month (10k pageviews) to $69/month (1M pageviews)
- **No maintenance required**
- **Automatic updates and backups**
- **Total**: $9-69/month (zero staff time)

**Recommendation**: Start with cloud option for simplicity, migrate to self-hosted if traffic grows significantly or if data sovereignty becomes critical.

## Alternative Consideration: Hybrid Approach

For maximum flexibility, consider using Plausible for public-facing website analytics while keeping our custom analytics system for internal application metrics (donation trends, volunteer hours, case analytics).

**Benefits**:
- Plausible tracks visitor behavior on public pages (marketing site, donation forms)
- Custom analytics tracks authenticated user actions and business metrics
- Each system optimized for its specific use case
- Privacy maintained across both systems

## Next Steps

1. ✅ Complete research and documentation
2. ⏭️ Decision: Self-hosted vs cloud Plausible
3. ⏭️ Set up Plausible instance (Phase 1)
4. ⏭️ Implement custom event tracking (Phase 2)
5. ⏭️ Build dashboard integration (Phase 3)
6. ⏭️ Configure reporting (Phase 4)

## Sources

- [Plausible Analytics](https://plausible.io/)
- [GitHub - Plausible Analytics](https://github.com/plausible/analytics)
- [Plausible Self-Hosted Documentation](https://plausible.io/self-hosted-web-analytics)
- [Matomo Analytics](https://matomo.org/)
- [Fathom Analytics](https://usefathom.com/)
- [Simple Analytics](https://www.simpleanalytics.com/)
- [Best Privacy-Compliant Analytics Tools for 2026](https://www.mitzu.io/post/best-privacy-compliant-analytics-tools-for-2026)
- [Best Google Analytics Alternatives 2026](https://contentsquare.com/guides/google-analytics-4/alternatives/)
- [Privacy-Focused Analytics Alternatives](https://sealos.io/blog/google-analytics-alternative)
