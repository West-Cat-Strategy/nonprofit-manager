# Plausible Analytics Setup Guide

This guide explains how to set up and use Plausible Analytics with the Nonprofit Manager application.

## Table of Contents

- [Why Plausible?](#why-plausible)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Custom Event Tracking](#custom-event-tracking)
- [Dashboard Widget](#dashboard-widget)
- [Troubleshooting](#troubleshooting)

---

## Why Plausible?

Plausible Analytics was chosen for the Nonprofit Manager for several reasons:

1. **Privacy-First**: No cookies, GDPR/CCPA compliant by default
2. **Lightweight**: <1KB script, doesn't slow down your site
3. **Self-Hosted**: Full data ownership and control
4. **Open Source**: Transparent and auditable code
5. **Simple**: Easy to understand analytics without complexity

---

## Installation

### Prerequisites

- Docker and Docker Compose installed
- Ports 8000 available on your host machine

### Step 1: Generate Secret Keys

Generate the required secret keys:

```bash
# Generate SECRET_KEY_BASE (64 characters)
openssl rand -base64 64

# Generate TOTP_VAULT_KEY (32 characters)
openssl rand -base64 32
```

### Step 2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.plausible.example .env.plausible
```

Edit `.env.plausible` and update:

```bash
# Use the keys generated in Step 1
PLAUSIBLE_SECRET_KEY_BASE=your-generated-64-char-string
PLAUSIBLE_TOTP_VAULT_KEY=your-generated-32-char-string

# Update base URL if not using localhost
PLAUSIBLE_BASE_URL=http://localhost:8000

# Set a secure database password
PLAUSIBLE_DB_PASSWORD=choose-a-secure-password

# Frontend configuration
VITE_PLAUSIBLE_DOMAIN=localhost
VITE_PLAUSIBLE_API_HOST=http://localhost:8000
```

### Step 3: Start Plausible

```bash
docker-compose -f docker-compose.plausible.yml --env-file .env.plausible up -d
```

Wait for the containers to initialize (about 30 seconds).

### Step 4: Create Your Admin Account

1. Open http://localhost:8000 in your browser
2. Click "Register" to create your admin account
3. Verify your email (or skip if SMTP not configured)

### Step 5: Add Your Site

1. Log in to Plausible
2. Click "+ Add a website"
3. Enter your domain (e.g., `localhost` for development)
4. Copy the tracking snippet (you don't need to add it manually - it's already in the code)

### Step 6: Generate API Key

1. In Plausible, go to Settings → API Keys
2. Click "Create API Key"
3. Give it a name (e.g., "Nonprofit Manager")
4. Copy the generated key

### Step 7: Configure Frontend

Copy the frontend environment file:

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local` and add:

```bash
VITE_PLAUSIBLE_DOMAIN=localhost
VITE_PLAUSIBLE_API_HOST=http://localhost:8000
VITE_PLAUSIBLE_API_KEY=your-api-key-from-step-6
```

---

## Configuration

### Production Deployment

For production, update the following in `.env.plausible`:

```bash
# Use your actual domain
PLAUSIBLE_BASE_URL=https://analytics.yourdomain.com
VITE_PLAUSIBLE_DOMAIN=yourdomain.com
VITE_PLAUSIBLE_API_HOST=https://analytics.yourdomain.com

# Disable registration after creating your account
PLAUSIBLE_DISABLE_REGISTRATION=true

# Optional: Configure SMTP for email reports
PLAUSIBLE_MAILER_EMAIL=analytics@yourdomain.com
PLAUSIBLE_SMTP_HOST=smtp.gmail.com
PLAUSIBLE_SMTP_PORT=587
PLAUSIBLE_SMTP_USER=your-email@gmail.com
PLAUSIBLE_SMTP_PASSWORD=your-app-password
PLAUSIBLE_SMTP_SSL=false
```

### SSL/HTTPS Setup

If deploying with SSL, add a reverse proxy (nginx/Caddy) in front of Plausible:

```nginx
# nginx example
server {
    listen 443 ssl;
    server_name analytics.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Usage

### Viewing Analytics

1. Open http://localhost:8000 (or your configured URL)
2. Log in with your admin account
3. Select your site from the dashboard
4. View real-time and historical analytics

### Available Metrics

- **Visitors**: Unique visitors (based on IP + User Agent)
- **Pageviews**: Total page loads
- **Bounce Rate**: % of single-page sessions
- **Visit Duration**: Average time spent on site
- **Top Pages**: Most visited pages
- **Sources**: Traffic sources (referrers)
- **Locations**: Geographic distribution
- **Devices**: Browser, OS, screen size

---

## Custom Event Tracking

The Nonprofit Manager includes built-in event tracking for key actions.

### Using Predefined Events

Import and use the predefined event functions:

```typescript
import { PlausibleEvents } from '../services/plausible';

// Track a donation
PlausibleEvents.donationCreated(100, 'credit_card');

// Track volunteer hours
PlausibleEvents.volunteerHoursLogged(5, 'food_bank');

// Track event registration
PlausibleEvents.eventRegistration('event-123');

// Track dashboard customization
PlausibleEvents.dashboardCustomized();
```

### Available Predefined Events

**Donation Events:**
- `donationCreated(amount, method)` - Track new donation with revenue
- `donationUpdated(amount)` - Track donation update
- `donationDeleted()` - Track donation deletion

**Donor Events:**
- `donorCreated(type)` - Track new donor (individual/organization)
- `donorUpdated()` - Track donor update

**Event Management:**
- `eventCreated(eventType)` - Track new event creation
- `eventRegistration(eventId)` - Track event registration
- `eventCheckIn()` - Track check-in

**Volunteer Management:**
- `volunteerCreated()` - Track new volunteer
- `volunteerHoursLogged(hours, activity)` - Track logged hours

**Case Management:**
- `caseCreated(priority, category)` - Track new case
- `caseUpdated(status)` - Track case update
- `caseAssigned()` - Track case assignment

**Dashboard & Analytics:**
- `dashboardCustomized()` - Track dashboard customization
- `widgetAdded(widgetType)` - Track widget addition
- `reportExported(reportType, format)` - Track report export

**Alert Events:**
- `alertCreated(metricType, severity)` - Track alert creation
- `alertTriggered(alertName)` - Track alert trigger

**User Actions:**
- `login(method)` - Track user login
- `logout()` - Track user logout
- `settingsChanged(section)` - Track settings changes

**Search & Filter:**
- `searchPerformed(searchType, resultsCount)` - Track searches
- `filterApplied(filterType)` - Track filter usage

**Error Tracking:**
- `errorOccurred(errorType, page)` - Track errors

### Custom Event Tracking

For custom events not covered by the predefined functions:

```typescript
import { trackEvent } from '../services/plausible';

// Simple event
trackEvent('Button Clicked');

// Event with properties
trackEvent('Form Submitted', {
  props: {
    form_type: 'contact',
    success: true,
  },
});

// Event with revenue
trackEvent('Purchase', {
  props: {
    product: 'Premium Plan',
  },
  revenue: {
    amount: 99.99,
    currency: 'USD',
  },
});
```

### Manual Page View Tracking

Plausible automatically tracks page views, but for SPAs you might want manual control:

```typescript
import { trackPageView } from '../services/plausible';

// Track current page
trackPageView();

// Track specific URL
trackPageView('/custom-path');
```

---

## Dashboard Widget

The Nonprofit Manager includes a dashboard widget that displays Plausible analytics.

### Adding the Widget

1. Go to Custom Dashboard
2. Click "Edit Dashboard"
3. Click "Add Widget"
4. Select "Website Analytics" from the list
5. Drag to position and resize as needed
6. Click "Save Dashboard"

### Widget Metrics

The widget displays:
- **Unique Visitors** (last 30 days)
- **Total Pageviews** (last 30 days)
- **Bounce Rate** (%)
- **Average Visit Duration** (mm:ss)

Each metric shows the percentage change compared to the previous 30-day period.

### Widget Requirements

The widget requires:
- Plausible API key configured in `.env.local`
- Site added to Plausible and collecting data
- API access enabled in Plausible settings

---

## Troubleshooting

### Plausible Not Loading

**Problem**: Tracking script not loading

**Solutions**:
1. Check that Plausible containers are running:
   ```bash
   docker-compose -f docker-compose.plausible.yml ps
   ```

2. Verify environment variables in `frontend/.env.local`:
   ```bash
   VITE_PLAUSIBLE_DOMAIN=localhost
   VITE_PLAUSIBLE_API_HOST=http://localhost:8000
   ```

3. Check browser console for errors

4. Verify the script tag in `frontend/index.html`

### No Data in Dashboard

**Problem**: Plausible is loading but no data appears

**Solutions**:
1. Verify the site is added in Plausible settings
2. Check that the domain matches exactly (localhost vs 127.0.0.1)
3. Disable ad blockers (they often block analytics scripts)
4. Wait a few minutes for data to appear (there can be a delay)

### Widget Shows "Unable to load analytics data"

**Problem**: Dashboard widget can't fetch data

**Solutions**:
1. Verify API key is set in `frontend/.env.local`:
   ```bash
   VITE_PLAUSIBLE_API_KEY=your-api-key
   ```

2. Check API key has correct permissions in Plausible settings

3. Verify Plausible API is accessible:
   ```bash
   curl http://localhost:8000/api/v1/sites
   ```

4. Check browser console for CORS errors

### Events Not Tracking

**Problem**: Custom events not appearing in Plausible

**Solutions**:
1. Verify event tracking code is executed (add console.log)
2. Check browser console for errors
3. Ensure Plausible script is loaded before tracking events
4. Wait a few minutes for events to appear
5. Check that events appear in browser network tab

### Database Migration Fails

**Problem**: Plausible won't start, migration errors

**Solutions**:
1. Stop all containers:
   ```bash
   docker-compose -f docker-compose.plausible.yml down
   ```

2. Remove volumes and start fresh:
   ```bash
   docker-compose -f docker-compose.plausible.yml down -v
   docker-compose -f docker-compose.plausible.yml up -d
   ```

3. Check logs:
   ```bash
   docker-compose -f docker-compose.plausible.yml logs plausible
   ```

---

## Advanced Configuration

### Excluding Pages from Tracking

To exclude certain pages (e.g., admin pages):

```typescript
// In your router or page component
if (window.location.pathname.startsWith('/admin')) {
  // Don't load Plausible on admin pages
  const script = document.querySelector('script[data-domain]');
  script?.remove();
}
```

### Custom Dimensions

Track additional data with every pageview:

```html
<!-- In index.html, add data attributes -->
<script
  defer
  data-domain="yourdomain.com"
  data-api="http://localhost:8000/api/event"
  src="http://localhost:8000/js/script.js"
  data-user-id="<%= user.id %>"
  data-organization="<%= org.name %>"
></script>
```

### Goals and Funnels

Set up goals in Plausible:

1. Go to Plausible → Settings → Goals
2. Add custom events as goals
3. Track conversion rates for:
   - Donation completions
   - Event registrations
   - Volunteer signups
   - Form submissions

---

## Resources

- [Plausible Documentation](https://plausible.io/docs)
- [Plausible Events API](https://plausible.io/docs/events-api)
- [Plausible Stats API](https://plausible.io/docs/stats-api)
- [Self-Hosting Guide](https://plausible.io/docs/self-hosting)

---

## Support

For issues specific to the Nonprofit Manager Plausible integration:
- Check the [GitHub Issues](https://github.com/yourusername/nonprofit-manager/issues)
- Review the [Product Analytics Research](./PRODUCT_ANALYTICS_RESEARCH.md)

For general Plausible questions:
- [Plausible Community Forum](https://github.com/plausible/analytics/discussions)
- [Plausible Documentation](https://plausible.io/docs)
