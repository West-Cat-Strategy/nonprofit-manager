# API Integration Guide

**Nonprofit Manager - Payment Reconciliation & Integration APIs**
**Version:** 1.0
**Last Updated:** February 1, 2026

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

**Base URL:**
```
Production: api.your-nonprofit.org
Development: localhost:3000
```

**API Version:** v1

---

## Authentication

### JWT Bearer Token

All API requests (except webhooks) require authentication via JWT Bearer tokens.

**Header Format:**
```
Authorization: Bearer <your_jwt_token>
```

**Obtaining a Token:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Token Expiration:** 24 hours
**Refresh:** Re-authenticate to obtain a new token

---

## Payment Reconciliation API

### Overview

The reconciliation system matches Stripe transactions with internal donation records, identifies discrepancies, and generates reports.

### Endpoints

#### 1. Create Reconciliation Run

**POST** `/api/reconciliation`

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

**GET** `/api/reconciliation/dashboard`

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

**GET** `/api/reconciliation/:id`

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

**GET** `/api/reconciliation/:id/items?match_status=unmatched_donation`

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

**GET** `/api/reconciliation/discrepancies/all?status=open&severity=high`

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

**POST** `/api/reconciliation/match`

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

**PUT** `/api/reconciliation/discrepancies/:id/resolve`

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

**PUT** `/api/reconciliation/discrepancies/:id/assign`

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

**POST** `/api/payments/intents`

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
POST /api/payments/webhook
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

**POST** `/api/mailchimp/sync`

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

**POST** `/api/mailchimp/campaigns`

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

---

## Webhook System

### Register Webhook

**POST** `/api/webhooks`

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
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional context"
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

### Common Error Codes

- `INVALID_REQUEST` - Malformed request
- `AUTHENTICATION_REQUIRED` - No auth token provided
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `STRIPE_NOT_CONFIGURED` - Stripe integration not set up
- `RECONCILIATION_FAILED` - Reconciliation process failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Rate Limiting

**Limits:**
- 100 requests per minute per IP
- 1000 requests per hour per user

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643760000
```

**Rate Limit Exceeded Response:**
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

---

## Best Practices

### 1. Error Handling
Always check HTTP status codes and handle errors gracefully:

```javascript
try {
  const response = await fetch('/api/reconciliation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    // Handle error appropriately
  }

  const result = await response.json();
  // Process successful response
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
      `/api/reconciliation?page=${page}&limit=20`
    );
    const data = await response.json();

    allReconciliations.push(...data.reconciliations);

    if (page >= data.pagination.total_pages) break;
    page++;
  }

  return allReconciliations;
}
```

### 3. Idempotency
Use idempotency keys for critical operations:

```javascript
const idempotencyKey = `reconciliation-${Date.now()}`;

fetch('/api/reconciliation', {
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

### 5. Token Management
- Store tokens securely (never in localStorage for production)
- Refresh tokens before expiration
- Implement token rotation

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
  `/api/reconciliation/${reconciliation.id}/discrepancies`
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
const { clientSecret } = await fetch('/api/payments/intents', {
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
- **Documentation:** https://github.com/West-Cat-Strategy/nonprofit-manager/tree/main/docs/api
- **Issues:** https://github.com/West-Cat-Strategy/nonprofit-manager/issues
- **Email:** info@westcat.ca

---

**Document Version:** 1.0
**Last Updated:** February 1, 2026
**Generated by:** Nonprofit Manager API Team
