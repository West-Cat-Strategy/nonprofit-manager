# API Integration Guide

**Nonprofit Manager - Payment Reconciliation & Integration APIs**
**Version:** 1.0
**Last Updated:** 2026-04-18

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Payment Reconciliation API](#payment-reconciliation-api)
4. [Stripe Integration](#stripe-integration)
5. [Mailchimp Integration](#mailchimp-integration)
6. [Webhook System](#webhook-system)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Overview

The Nonprofit Manager API provides comprehensive endpoints for managing payment reconciliation, Stripe integration, Mailchimp campaigns, and webhook notifications. This guide covers integration patterns, authentication, and best practices for all API endpoints.

Examples in this guide focus on the payload inside the canonical success envelope. Live JSON responses from `/api` routes return `{ "success": true, "data": ... }` on success and `{ "success": false, "error": ... }` on failure unless an endpoint explicitly documents an exception.

**Base URLs:**
```
Production same-origin API: https://westcat.ca/api/v2
Direct backend runtime: http://localhost:3000/api/v2
Docker dev backend: http://localhost:8004/api/v2
Frontend/browser proxy: /api/v2
```

**API Version:** v2

`VITE_API_URL=/api` is the frontend proxy base, not the mounted application route family. Active app endpoints remain `/api/v2/*`, with health aliases documented separately.

---

## Authentication

### Browser Sessions And Bearer Tokens

Browser shells authenticate primarily with HttpOnly session cookies. API and test clients can still use bearer tokens when the runtime explicitly exposes them.

**Browser flow:**
- `POST /api/v2/auth/login` or `POST /api/v2/portal/auth/login` establishes the session cookie.
- `GET /api/v2/auth/bootstrap` or `GET /api/v2/portal/auth/bootstrap` returns the startup auth context for the signed-in shell.
- Postman or browser-based tooling can keep using the session cookie after login.

**Bearer header format:**
```
Authorization: Bearer <your_jwt_token>
```

**Token exposure note:**
- `data.token` is only returned when the backend runtime enables `EXPOSE_AUTH_TOKENS_IN_RESPONSE=true`.
- If token exposure is disabled, login still succeeds through cookies; use the session cookie flow instead of expecting a bearer token in the response body.

**Login request:**
```bash
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response shape:**
```json
{
  "success": true,
  "data": {
    "csrfToken": "csrf-token",
    "organizationId": "uuid",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin"
    },
    "token": "optional-when-token-exposure-is-enabled"
  }
}
```

**Session/token lifecycle:** Re-authenticate when the session or test token expires.

---

## Payment Reconciliation API

### Overview

The reconciliation system matches Stripe transactions with internal donation records, identifies discrepancies, and generates reports.

### Endpoints

#### 1. Create Reconciliation Run

**POST** `/api/v2/reconciliation`

Creates a new reconciliation run for a specified date range.

**Request:**
```json
{
  "reconciliation_type": "manual",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "notes": "Monthly reconciliation for January"
}
```

**Parameters:**
- `reconciliation_type`: `"manual"` | `"automatic"` | `"scheduled"`
- `start_date`: ISO 8601 date string (YYYY-MM-DD)
- `end_date`: ISO 8601 date string (YYYY-MM-DD)
- `notes`: Optional notes

**Response (201 Created):**
```json
{
  "id": "uuid",
  "reconciliation_number": "REC-260201-1234",
  "status": "completed",
  "matched_count": 45,
  "unmatched_stripe_count": 2,
  "unmatched_donations_count": 1,
  "discrepancy_count": 3,
  "stripe_balance_amount": 12500.00,
  "donations_total_amount": 12450.00,
  "stripe_total_fees": 363.75,
  "started_at": "2026-02-01T10:00:00Z",
  "completed_at": "2026-02-01T10:05:23Z"
}
```

#### 2. Get Reconciliation Dashboard

**GET** `/api/v2/reconciliation/dashboard`

Returns summary statistics for all reconciliations.

**Response (200 OK):**
```json
{
  "latest_reconciliation": { ... },
  "stats": {
    "total_reconciliations": 12,
    "completed_reconciliations": 11,
    "in_progress_reconciliations": 1,
    "total_matched": 523,
    "total_discrepancies": 15,
    "total_open_discrepancies": 3,
    "critical_discrepancies": 1,
    "high_discrepancies": 2,
    "unreconciled_donations": 8
  }
}
```

#### 3. Get Reconciliation Details

**GET** `/api/v2/reconciliation/:id`

Returns detailed information about a specific reconciliation run.

**Response (200 OK):**
```json
{
  "reconciliation": {
    "id": "uuid",
    "reconciliation_number": "REC-260201-1234",
    "status": "completed",
    ...
  },
  "summary": {
    "total_donations": 48,
    "total_donation_amount": 12450.00,
    "total_stripe_charges": 47,
    "total_stripe_amount": 12500.00,
    "total_stripe_fees": 363.75,
    "matched_transactions": 45,
    "unmatched_donations": 1,
    "unmatched_stripe": 2,
    "discrepancies": 3,
    "open_discrepancies": 2,
    "resolved_discrepancies": 1
  }
}
```

#### 4. Get Reconciliation Items

**GET** `/api/v2/reconciliation/:id/items?match_status=unmatched_donation`

Returns individual transaction matches for a reconciliation.

**Query Parameters:**
- `match_status`: (Optional) Filter by `matched` | `unmatched_donation` | `unmatched_stripe` | `amount_mismatch`
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "uuid",
      "reconciliation_id": "uuid",
      "donation_id": "uuid",
      "stripe_payment_intent_id": "pi_xxx",
      "stripe_charge_id": "ch_xxx",
      "stripe_amount": 100.00,
      "donation_amount": 100.00,
      "match_status": "matched",
      "match_confidence": "high",
      "has_discrepancy": false
    }
  ],
  "pagination": {
    "total": 48,
    "page": 1,
    "limit": 50,
    "total_pages": 1
  }
}
```

#### 5. Get Discrepancies

**GET** `/api/v2/reconciliation/discrepancies/all?status=open&severity=high`

Returns all payment discrepancies with filtering.

**Query Parameters:**
- `status`: Filter by `open` | `investigating` | `resolved` | `closed` | `ignored`
- `severity`: Filter by `low` | `medium` | `high` | `critical`
- `discrepancy_type`: Type of discrepancy
- `assigned_to`: User ID
- `page`: Page number
- `limit`: Items per page

**Response (200 OK):**
```json
{
  "discrepancies": [
    {
      "id": "uuid",
      "discrepancy_type": "amount_mismatch",
      "severity": "high",
      "description": "Amount mismatch: Donation 100.00 vs Stripe 99.50 (difference: 0.50)",
      "expected_amount": 100.00,
      "actual_amount": 99.50,
      "difference_amount": 0.50,
      "status": "open",
      "donation_id": "uuid",
      "stripe_payment_intent_id": "pi_xxx",
      "created_at": "2026-02-01T10:05:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### 6. Manually Match Transaction

**POST** `/api/v2/reconciliation/match`

Manually links a donation to a Stripe transaction.

**Request:**
```json
{
  "donation_id": "uuid",
  "stripe_payment_intent_id": "pi_xxx",
  "notes": "Manual match after verification"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Transaction matched successfully"
}
```

#### 7. Resolve Discrepancy

**PUT** `/api/v2/reconciliation/discrepancies/:id/resolve`

Marks a discrepancy as resolved.

**Request:**
```json
{
  "status": "resolved",
  "resolution_notes": "Verified with bank statement - amount difference due to foreign exchange fee"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Discrepancy resolved successfully"
}
```

#### 8. Assign Discrepancy

**PUT** `/api/v2/reconciliation/discrepancies/:id/assign`

Assigns a discrepancy to a user for investigation.

**Request:**
```json
{
  "assigned_to": "user-uuid",
  "due_date": "2026-02-15"
}
```

---

## Stripe Integration

### Configuration

Set environment variables:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Create Payment Intent

**POST** `/api/v2/payments/intents`

**Request:**
```json
{
  "amount": 5000,
  "currency": "usd",
  "description": "Donation to Annual Fund",
  "donationId": "uuid",
  "receiptEmail": "donor@example.com",
  "metadata": {
    "campaign": "Annual Fund 2026"
  }
}
```

**Response:**
```json
{
  "paymentIntentId": "pi_xxx",
  "clientSecret": "pi_xxx_secret_yyy",
  "amount": 5000,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

### Webhook Handling

Stripe sends webhooks to:
```
POST /api/v2/payments/webhook
```

**Supported Events:**
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed

**Webhook Signature Verification:**
Automatically verified using `STRIPE_WEBHOOK_SECRET`.

---

## Mailchimp Integration

### Sync Contacts

**POST** `/api/v2/mailchimp/sync`

Syncs contact data to Mailchimp audience.

**Request:**
```json
{
  "contact_ids": ["uuid1", "uuid2"],
  "audience_id": "mailchimp_audience_id",
  "tags": ["donor", "2026-campaign"]
}
```

### Create Campaign

**POST** `/api/v2/mailchimp/campaigns`

**Request:**
```json
{
  "type": "regular",
  "subject": "Thank you for your support!",
  "from_name": "Nonprofit Name",
  "reply_to": "info@nonprofit.org",
  "audience_id": "audience_id",
  "content": "<html>...</html>"
}
```

## Mautic Integration

### Sync Contacts

**POST** `/api/v2/sites/:siteId/integrations/newsletter`

Use the site-console integrations endpoint to choose `mautic` as the active newsletter provider and persist the Mautic API settings for that site.

**Request:**
```json
{
  "provider": "mautic",
  "mautic": {
    "baseUrl": "https://mautic.example.org",
    "segmentId": "segment-id",
    "username": "api-user",
    "password": "api-password",
    "defaultTags": ["newsletter", "members"],
    "syncEnabled": true
  }
}
```

**Notes:**
- Mautic must have its API enabled.
- The app uses the configured base URL and basic-auth credentials to sync contacts into the selected segment.
- New newsletter form submissions still create the local CRM contact first, then mirror the subscriber into Mautic when the provider is active.

---

## Webhook System

### Register Webhook

**POST** `/api/v2/webhooks`

**Request:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["donation.created", "reconciliation.completed"],
  "secret": "your_webhook_secret"
}
```

### Webhook Payload Format

All webhooks follow this structure:

```json
{
  "id": "webhook_event_uuid",
  "event": "reconciliation.completed",
  "timestamp": "2026-02-01T10:05:23Z",
  "data": {
    "reconciliation_id": "uuid",
    "matched_count": 45,
    "discrepancy_count": 3
  },
  "signature": "sha256_hmac_signature"
}
```

### Signature Verification

Verify webhook authenticity:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Error message description",
    "details": {
      "field": "additional context"
    }
  }
}
```

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Common Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Human-readable error message"
  }
}
```

Common generic codes include `validation_error`, `bad_request`, `unauthorized`, `forbidden`, `not_found`, and `rate_limit_exceeded`. Module-specific error codes may add more detail.

---

## Rate Limiting

**Limits:** Rate limits depend on the active runtime configuration. Check the response headers and the backend env values for the current contract.

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643760000
```

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Too many requests, please try again later."
  }
}
```

---

## Best Practices

### 1. Error Handling
Always check HTTP status codes and handle errors gracefully:

```javascript
try {
  const response = await fetch('/api/v2/reconciliation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('API Error:', result.error || result);
    // Handle error appropriately
    return;
  }

  const payload = result.data ?? result;
  // Process successful response payload
} catch (error) {
  console.error('Network error:', error);
}
```

### 2. Pagination
Always handle paginated responses:

```javascript
async function fetchAllReconciliations() {
  let page = 1;
  const allReconciliations = [];

  while (true) {
    const response = await fetch(
      `/api/v2/reconciliation?page=${page}&limit=20`
    );
    const data = await response.json();
    const payload = data.data ?? data;

    allReconciliations.push(...payload.reconciliations);

    if (page >= payload.pagination.total_pages) break;
    page++;
  }

  return allReconciliations;
}
```

### 3. Idempotency
Use idempotency keys for critical operations:

```javascript
const idempotencyKey = `reconciliation-${Date.now()}`;

fetch('/api/v2/reconciliation', {
  method: 'POST',
  headers: {
    'Idempotency-Key': idempotencyKey,
    // other headers...
  },
  body: JSON.stringify(data)
});
```

### 4. Webhook Security
Always verify webhook signatures before processing events.

### 5. Session And Token Management
- Prefer cookie-based sessions for browser clients.
- If you enable bearer-token exposure for Postman or other API tooling, store tokens securely and clear them after use.
- Re-authenticate when the session or token expires instead of relying on undocumented refresh behavior.

---

## Examples

### Complete Reconciliation Workflow

```javascript
// 1. Create reconciliation
const reconciliation = await createReconciliation({
  reconciliation_type: 'manual',
  start_date: '2026-01-01',
  end_date: '2026-01-31'
});

console.log(`Reconciliation ${reconciliation.reconciliation_number} completed`);
console.log(`Matched: ${reconciliation.matched_count}`);
console.log(`Discrepancies: ${reconciliation.discrepancy_count}`);

// 2. Fetch discrepancies
const discrepancies = await fetch(
  `/api/v2/reconciliation/${reconciliation.id}/discrepancies`
).then(r => r.json());

// 3. Handle high-severity discrepancies
for (const disc of discrepancies.discrepancies) {
  if (disc.severity === 'high' || disc.severity === 'critical') {
    // Assign to finance team
    await assignDiscrepancy(disc.id, {
      assigned_to: financeTeamUserId,
      due_date: getNextBusinessDay()
    });

    // Send notification
    await sendNotification({
      user_id: financeTeamUserId,
      message: `High-priority discrepancy: ${disc.description}`
    });
  }
}

// 4. Generate report
const summary = await getReconciliationSummary(reconciliation.id);
await generatePDFReport(summary);
```

### Stripe Payment Flow

```javascript
// Frontend: Create payment intent
const paymentIntentResponse = await fetch('/api/v2/payments/intents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 5000, // $50.00 in cents
    currency: 'usd',
    donationId: donationId,
    receiptEmail: 'donor@example.com'
  })
}).then(r => r.json());

const { clientSecret } = paymentIntentResponse.data ?? paymentIntentResponse;

// Use Stripe.js to confirm payment
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: {
      card: cardElement,
      billing_details: { name: donorName }
    }
  }
);

if (error) {
  console.error('Payment failed:', error.message);
} else if (paymentIntent.status === 'succeeded') {
  console.log('Payment successful!');
  // Webhook will update donation status automatically
}
```

---

## Support

For API support:
- **Documentation:** [API Documentation Index](./README.md)
- **Workboard:** [planning-and-progress.md](../phases/planning-and-progress.md)
- **Contributing:** [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Email:** maintainer@example.com

---

**Document Version:** 1.0
**Last Updated:** 2026-04-18
**Generated by:** Nonprofit Manager API Team
