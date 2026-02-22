# API Documentation Index

**Last Updated**: 2026-02-18

Master index for all nonprofit-manager API endpoints and integration documentation.

---

## Table of Contents

- [Quick Navigation](#quick-navigation)
- [API Reference by Feature](#api-reference-by-feature)
- [Integration Guides](#integration-guides)
- [Testing & Tools](#testing--tools)
- [API Status & Versioning](#api-status--versioning)

---

## Quick Navigation

Looking for a specific endpoint? Use this table:

| Feature Area | What's Documented | Read This |
|---|---|---|
| **Dashboard & Alerts** | Dashboard config, alert management | [API_REFERENCE_DASHBOARD_ALERTS.md](API_REFERENCE_DASHBOARD_ALERTS.md) |
| **Events** | Event CRUD, registrations, management | [API_REFERENCE_EVENTS.md](API_REFERENCE_EVENTS.md) |
| **Reporting & Export** | Report generation, CSV/Excel export, analytics | [API_REFERENCE_EXPORT.md](API_REFERENCE_EXPORT.md) |
| **Backup & Restore** | Database backup, restore, data recovery | [API_REFERENCE_BACKUP.md](API_REFERENCE_BACKUP.md) |
| **Payments & Integrations** | Stripe integration, Mailchimp sync, webhooks | [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) |
| **OpenAPI Spec** | Machine-readable API definition | [openapi.yaml](openapi.yaml) |
| **Postman** | Interactive API testing | [postman/README.md](postman/README.md) |

---

## API Reference by Feature

### Core Features

#### Dashboard & Alerts

Complete API for dashboard customization and alert configuration.

- **File**: [API_REFERENCE_DASHBOARD_ALERTS.md](API_REFERENCE_DASHBOARD_ALERTS.md)
- **Endpoints**:
  - `GET /api/dashboards` — List user dashboards
  - `POST /api/dashboards` — Create new dashboard
  - `PUT /api/dashboards/:id` — Update dashboard configuration
  - `DELETE /api/dashboards/:id` — Delete dashboard
  - `GET /api/alerts` — List configured alerts  
  - `POST /api/alerts` — Create alert rule
  - `PUT /api/alerts/:id` — Update alert configuration
- **Example Use Cases**:
  - User creating custom dashboard with widgets
  - Setting up fundraising goal alerts
  - Configuring email notifications

#### Events

Event management endpoints for creating, updating, and managing events.

- **File**: [API_REFERENCE_EVENTS.md](API_REFERENCE_EVENTS.md)
- **Endpoints**:
  - `GET /api/events` — List all events
  - `GET /api/events/:id` — Get event details
  - `POST /api/events` — Create new event
  - `PUT /api/events/:id` — Update event
  - `DELETE /api/events/:id` — Delete event
  - `POST /api/events/:id/register` — Register attendee
  - `GET /api/events/:id/registrations` — List registrations
- **Example Use Cases**:
  - Creating a volunteer orientation event
  - Updating event date and location
  - Exporting attendee list
  - Managing registrations and check-ins

#### Reporting & Analytics

Generate reports, export data to CSV/Excel, and analyze trends.

- **File**: [API_REFERENCE_EXPORT.md](API_REFERENCE_EXPORT.md)
- **Endpoints**:
  - `GET /api/reports` — List available reports
  - `POST /api/reports/generate` — Generate custom report
  - `GET /api/reports/:id/export` — Export report as CSV/Excel
  - `GET /api/analytics/trends` — Get trend data
  - `GET /api/analytics/metrics` — Get key metrics
- **Export Formats**: CSV, Excel (.xlsx), PDF
- **Example Use Cases**:
  - Annual impact report generation
  - Donor analytics export
  - Volunteer hour tracking
  - Board meeting presentations

#### Backup & Restore

Database backup and recovery procedures.

- **File**: [API_REFERENCE_BACKUP.md](API_REFERENCE_BACKUP.md)
- **Endpoints**:
  - `POST /api/backup` — Create database backup
  - `GET /api/backup/status` — Check backup status
  - `POST /api/restore` — Restore from backup
  - `GET /api/backup/list` — List available backups
- **Example Use Cases**:
  - Daily automated backups
  - Disaster recovery
  - Data migration between environments

---

## Integration Guides

### Third-Party Integrations

#### Payment Processing (Stripe)

Complete guide to payment integration, reconciliation, and webhook handling.

- **File**: [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#stripe-integration)
- **Includes**:
  - Payment flow walkthrough
  - Webhook setup and validation
  - Reconciliation procedures
  - Testing with Stripe test cards
  - Error handling and retries
- **Example Use Cases**:
  - Processing recurring donor subscriptions
  - One-time donation checkout
  - Refund processing
  - Payment verification

#### Email Marketing (Mailchimp)

Mailchimp sync and mailing list management.

- **File**: [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#mailchimp-integration)
- **Includes**:
  - List sync procedures
  - Segment management
  - Campaign integration
  - Contact synchronization
- **Example Use Cases**:
  - Syncing donor list to Mailchimp
  - Creating event attendee segments
  - Automated campaign triggers

#### Webhooks

External service webhooks and event delivery.

- **File**: [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#webhooks)
- **Includes**:
  - Webhook registration and validation
  - Event types and payloads
  - Retry logic and failure handling
  - Security (HMAC signatures)
  - Testing webhook deliveries
- **Supported Events**:
  - Donation received
  - Volunteer sign-up
  - Event registration
  - Organization updates
- **Example Use Cases**:
  - Notify external CRM of new donation
  - Trigger Slack notification on volunteer signup
  - Send webhook to custom analytics platform

---

## Testing & Tools

### OpenAPI Specification

Machine-readable API definition for code generation, documentation, and testing tools.

- **File**: [openapi.yaml](openapi.yaml)
- **Use For**:
  - Auto-generating API client libraries
  - IDE/editor documentation and autocomplete
  - API documentation portals
  - Automated testing tools
  - API schema validation

**To use OpenAPI spec**:
1. Import into [Swagger UI](https://swagger.io/tools/swagger-ui/) online editor
2. Generate client code with [OpenAPI Generator](https://openapi-generator.tech/)
3. Validate requests against spec

### Postman Collections

Interactive API testing with pre-built requests and examples.

- **File**: [postman/README.md](postman/README.md)
- **Includes**:
  - Pre-built request examples
  - Environment variables for different deployments
  - Authentication setup
  - Collection variables and scripts
- **Download**: See [postman/README.md](postman/README.md) for download link

**To use Postman**:
1. Import collection into Postman desktop app
2. Configure environment (local/dev/staging/production)
3. Click request to see example payloads and try endpoint
4. Modify parameters and send request

### cURL Examples

All endpoint documentation includes `curl` command examples.

Example:

```bash
curl -X GET localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You can copy-paste these examples directly into your terminal.

---

## API Status & Versioning

### Current API Version

- **Version**: 1.0
- **Base URL**: `localhost:3000/api` (development)
- **Status**: Stable

### Authentication

All endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
```

See [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#authentication) for auth details.

### Response Format

All endpoints follow standardized response format:

**Success (2xx)**:
```json
{
  "success": true,
  "data": { /* response object */ }
}
```

**Error (4xx/5xx)**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": { /* field-specific errors */ }
  }
}
```

---

## Getting Started

### First-Time API User?

1. **Understand authentication**: See [Postman Collections](#postman-collections) for setup
2. **Try an example**: Pick an endpoint from above table
3. **Use Postman**: Import collection, modify parameters, hit "Send"
4. **Or use cURL**: Copy example from endpoint documentation

### Building an Integration?

1. **Understand the webhook flow**: See [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#webhooks)
2. **Test with Postman first**: Verify endpoint works as expected
3. **Read integration guide**: See [Integration Guides](#integration-guides) section
4. **Handle errors gracefully**: Implement retries and error logging

### Need to Export Data?

1. See [API_REFERENCE_EXPORT.md](API_REFERENCE_EXPORT.md) for export endpoints
2. Use Postman to test export (shows response)
3. Integrate into your workflow

---

## Common Tasks

**"I want to..."**

- **...integrate Stripe payments** → [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#stripe-integration)
- **...sync contacts with Mailchimp** → [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#mailchimp-integration)
- **...set up webhooks to external service** → [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md#webhooks)
- **...test an endpoint quickly** → Use [postman/README.md](postman/README.md) collection
- **...generate a report** → [API_REFERENCE_EXPORT.md](API_REFERENCE_EXPORT.md)
- **...export data as CSV/Excel** → [API_REFERENCE_EXPORT.md](API_REFERENCE_EXPORT.md)
- **...create a custom dashboard** → [API_REFERENCE_DASHBOARD_ALERTS.md](API_REFERENCE_DASHBOARD_ALERTS.md)
- **...manage events and registrations** → [API_REFERENCE_EVENTS.md](API_REFERENCE_EVENTS.md)
- **...restore from backup** → [API_REFERENCE_BACKUP.md](API_REFERENCE_BACKUP.md)

---

## API Client Libraries

### JavaScript/TypeScript

Use Axios to call the API:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'localhost:3000/api',
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// GET request
const events = await api.get('/events');

// POST request
const newEvent = await api.post('/events', {
  name: 'Volunteer Orientation',
  date: '2026-03-15'
});
```

### Python

Using requests library:

```python
import requests

api_url = 'localhost:3000/api'
headers = {'Authorization': f'Bearer {token}'}

# GET request
response = requests.get(f'{api_url}/events', headers=headers)
events = response.json()

# POST request
response = requests.post(
  f'{api_url}/events',
  headers=headers,
  json={'name': 'Volunteer Orientation', 'date': '2026-03-15'}
)
```

### Generate Client Library

Use [OpenAPI Generator](https://openapi-generator.tech/) to auto-generate clients:

```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated-client
```

---

## Troubleshooting

### "401 Unauthorized"

Auth token missing or expired:

```bash
# Check token is included in request
curl -H "Authorization: Bearer YOUR_TOKEN" ...

# Get new token if expired (see CONTRIBUTING.md for auth flow)
```

### "404 Not Found"

Endpoint URL might be wrong:

1. Check endpoint path in documentation
2. Verify base URL is correct (`localhost:3000/api`)
3. Check spelling and HTTP method (GET vs POST, etc.)

### "500 Internal Server Error"

Server error. Check:

1. Backend is running: `curl localhost:3000/api/health`
2. Database is connected
3. Check backend logs for error details

### "CORS Error"

Cross-origin request blocked:

1. Frontend and backend on same machine? Usually not an issue in dev
2. Check `CORS_ORIGINS` environment variable in backend
3. Ensure backend is at `localhost:3000`

---

## See Also

- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Backend setup
- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Testing API endpoints
- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Code standards
- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — API security

---

**Questions about an endpoint?**

Check the specific reference file in the table above, or open a GitHub Issue with label `api-question`.
