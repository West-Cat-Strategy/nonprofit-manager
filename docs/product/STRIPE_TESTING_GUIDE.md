# Stripe Integration Testing Guide

## Overview

This guide covers testing the Stripe payment integration in sandbox mode, including payment processing, webhooks, and error handling.

## Prerequisites

1. Stripe test account with API keys
2. Stripe CLI installed for webhook testing
3. Backend server running locally or in test environment
4. Postman or similar API testing tool

## Environment Setup

### Required Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Mode Verification

All Stripe test keys begin with:
- Secret keys: `sk_test_`
- Publishable keys: `pk_test_`
- Webhook signing secrets: `whsec_`

## Test Cases

### 1. Payment Configuration

**Endpoint:** `GET /api/payments/config`

**Expected Response:**
```json
{
  "stripe": {
    "configured": true,
    "publishableKey": "pk_test_..."
  }
}
```

**Test Steps:**
1. Call endpoint without authentication
2. Verify publishable key is returned
3. Verify configured status is true

---

### 2. Create Payment Intent

**Endpoint:** `POST /api/payments/intents`

**Test Data:**
```json
{
  "amount": 5000,
  "currency": "usd",
  "description": "Test donation",
  "receiptEmail": "test@example.com",
  "donationId": "uuid-here"
}
```

**Expected Response:**
```json
{
  "id": "pi_...",
  "clientSecret": "pi_..._secret_...",
  "amount": 5000,
  "currency": "usd",
  "status": "requires_payment_method",
  "created": "2024-01-01T00:00:00.000Z"
}
```

**Test Scenarios:**

#### Successful Payment Intent Creation
- Amount: $50.00 (5000 cents)
- Currency: USD
- Description: "Test donation"
- Expected: 201 status with payment intent

#### Minimum Amount Validation
- Amount: $0.49 (49 cents)
- Expected: 400 error - "Minimum amount is $0.50"

#### Invalid Amount
- Amount: 0 or negative
- Expected: 400 error - "Amount must be a positive number"

#### Currency Validation
- Amount: $50.00
- Currency: "invalid"
- Expected: 400 error - "Invalid currency"

#### Missing Required Fields
- Missing amount
- Expected: 400 validation error

---

### 3. Retrieve Payment Intent

**Endpoint:** `GET /api/payments/intents/:id`

**Test Scenarios:**

#### Valid Payment Intent ID
- ID: `pi_...` (from previous test)
- Expected: 200 with payment intent details

#### Invalid Payment Intent ID Format
- ID: "invalid_id"
- Expected: 400 error - "Invalid payment intent ID"

#### Non-existent Payment Intent
- ID: "pi_nonexistent123"
- Expected: 500 error from Stripe

---

### 4. Cancel Payment Intent

**Endpoint:** `POST /api/payments/intents/:id/cancel`

**Test Scenarios:**

#### Cancel Pending Payment
- Create new payment intent
- Call cancel endpoint
- Expected: 200 with status "canceled"

#### Cancel Already Succeeded Payment
- Try to cancel completed payment
- Expected: 500 error - Cannot cancel succeeded payment

---

### 5. Create Refund

**Endpoint:** `POST /api/payments/refunds`

**Test Data:**
```json
{
  "paymentIntentId": "pi_...",
  "amount": 2500,
  "reason": "requested_by_customer"
}
```

**Test Scenarios:**

#### Full Refund
- Omit amount field
- Expected: 201 with full refund

#### Partial Refund
- Amount: 2500 (half of original $50)
- Expected: 201 with partial refund

#### Invalid Refund Reason
- Reason: "invalid_reason"
- Expected: 400 error - "Invalid refund reason"

#### Refund Non-existent Payment
- Payment intent ID: "pi_nonexistent"
- Expected: 500 error

---

### 6. Customer Management

#### Create Customer

**Endpoint:** `POST /api/payments/customers`

**Test Data:**
```json
{
  "email": "customer@example.com",
  "name": "Test Customer",
  "phone": "+1234567890",
  "contactId": "uuid-here"
}
```

**Expected Response:**
```json
{
  "id": "cus_...",
  "email": "customer@example.com",
  "name": "Test Customer",
  "phone": "+1234567890",
  "created": "2024-01-01T00:00:00.000Z"
}
```

**Test Scenarios:**
- Valid customer creation
- Invalid email format
- Missing required email
- Customer with existing email

#### Get Customer

**Endpoint:** `GET /api/payments/customers/:id`

**Test Scenarios:**
- Valid customer ID
- Invalid customer ID format
- Non-existent customer ID

#### List Payment Methods

**Endpoint:** `GET /api/payments/customers/:customerId/payment-methods`

**Test Scenarios:**
- Customer with no payment methods
- Customer with saved card
- Invalid customer ID

---

## Webhook Testing

### Setup Stripe CLI

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

4. Copy webhook signing secret and update `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhook Test Cases

#### 1. Payment Success Webhook

**Trigger:**
```bash
stripe trigger payment_intent.succeeded
```

**Expected Behavior:**
- Webhook received with 200 response
- Log entry: "Payment succeeded"
- If linked to donation: donation status updated to "completed"

**Verification:**
1. Check server logs for webhook receipt
2. Query donations table for status update
3. Verify audit log entry created

#### 2. Payment Failed Webhook

**Trigger:**
```bash
stripe trigger payment_intent.payment_failed
```

**Expected Behavior:**
- Webhook received with 200 response
- Log entry: "Payment failed"
- If linked to donation: donation status updated to "failed"

#### 3. Charge Refunded Webhook

**Trigger:**
```bash
stripe trigger charge.refunded
```

**Expected Behavior:**
- Webhook received with 200 response
- Log entry: "Charge refunded"

#### 4. Invalid Signature

**Test:**
- Send POST to webhook endpoint with invalid signature
- Expected: 400 error - "Webhook error"

#### 5. Missing Signature Header

**Test:**
- Send POST to webhook endpoint without stripe-signature header
- Expected: 400 error - "Missing stripe-signature header"

---

## Webhook Reliability Testing

### 1. Server Downtime Simulation

**Test:**
1. Stop backend server
2. Trigger webhook event in Stripe
3. Restart server
4. Verify Stripe retries webhook delivery

**Stripe Retry Logic:**
- Retries up to 3 times
- Uses exponential backoff
- 1 hour between retries

**Verification:**
- Check Stripe Dashboard > Developers > Webhooks > Events
- Verify retry attempts logged
- Verify eventual success after server restart

### 2. Database Connection Failure

**Test:**
1. Stop database
2. Trigger webhook
3. Verify graceful handling (200 response, error logged)
4. Restart database
5. Manually process missed webhook

**Expected Behavior:**
- Webhook returns 200 (to prevent retries)
- Error logged: "Failed to update donation status"
- Manual reconciliation needed

### 3. High Volume Load Testing

**Test:**
1. Use Stripe CLI to trigger 100 webhook events rapidly
```bash
for i in {1..100}; do stripe trigger payment_intent.succeeded; done
```
2. Monitor server performance
3. Verify all webhooks processed

**Success Criteria:**
- All webhooks receive 200 response
- No dropped events
- Average response time < 100ms

### 4. Duplicate Webhook Handling

**Test:**
1. Send same webhook event twice
2. Verify idempotent handling

**Expected Behavior:**
- Both webhooks return 200
- Database updated only once
- Event ID logged to prevent duplicate processing

---

## Error Recovery Testing

### 1. Payment Intent Recovery

**Scenario:** User closes browser during payment

**Test Steps:**
1. Create payment intent
2. Store client secret in session
3. Close browser/tab
4. Retrieve payment intent using stored ID
5. Continue payment flow

**Expected:** Payment can be completed with same intent

### 2. Webhook Replay

**Scenario:** Webhook fails due to temporary error

**Test Steps:**
1. Identify failed webhook in Stripe Dashboard
2. Click "Resend" button
3. Verify successful processing

### 3. Manual Reconciliation

**Scenario:** Webhook never delivered due to extended outage

**Process:**
1. Export payment events from Stripe Dashboard
2. Compare with donations table
3. Manually update missing records
4. Document reconciliation in audit log

---

## Test Stripe Cards

Use these test card numbers in sandbox mode:

### Successful Payments
- **Visa:** 4242 4242 4242 4242
- **Visa (debit):** 4000 0566 5566 5556
- **Mastercard:** 5555 5555 5555 4444
- **American Express:** 3782 822463 10005

### Declined Payments
- **Insufficient funds:** 4000 0000 0000 9995
- **Card declined:** 4000 0000 0000 0002
- **Expired card:** 4000 0000 0000 0069
- **Processing error:** 4000 0000 0000 0119

### 3D Secure Authentication
- **Requires auth:** 4000 0027 6000 3184
- **Auth fails:** 4000 0000 0000 0341

**Note:** Use any future expiration date and any 3-digit CVC.

---

## Integration Testing Checklist

### Pre-deployment
- [ ] All test cards work correctly
- [ ] Payment intents create successfully
- [ ] Refunds process correctly
- [ ] Customer creation works
- [ ] Webhooks receive and process events
- [ ] Error handling graceful and logged
- [ ] Audit logs created for all transactions
- [ ] Database transactions atomic
- [ ] Rate limiting tested

### Security
- [ ] Webhook signatures verified
- [ ] API keys stored securely in environment
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production
- [ ] PCI compliance requirements met

### Monitoring
- [ ] Failed payment alerts configured
- [ ] Webhook failure monitoring setup
- [ ] Payment success metrics tracked
- [ ] Refund notifications working
- [ ] Stripe Dashboard alerts configured

---

## Common Issues and Solutions

### Issue: Webhook signature verification fails

**Cause:** Webhook secret mismatch or body parser issue

**Solution:**
1. Verify STRIPE_WEBHOOK_SECRET matches Stripe CLI output
2. Ensure raw body parsing enabled for webhook endpoint
3. Check request body not modified before verification

### Issue: Payment intent succeeds but donation not updated

**Cause:** Webhook delivery failed or donation ID not in metadata

**Solution:**
1. Check webhook delivery in Stripe Dashboard
2. Verify donationId included in payment intent metadata
3. Check database connection during webhook processing
4. Manually reconcile using payment intent ID

### Issue: Test payments work but production fails

**Cause:** Production API keys not configured or incorrect

**Solution:**
1. Verify production keys start with `sk_live_` and `pk_live_`
2. Update environment variables in production
3. Test with small live transaction
4. Monitor logs for errors

---

## Appendix: SQL Queries for Verification

### Check donation payment status
```sql
SELECT id, amount, payment_status, stripe_payment_intent_id, created_at
FROM donations
WHERE stripe_payment_intent_id = 'pi_...';
```

### Check audit logs for payment events
```sql
SELECT action, entity_type, entity_id, details, created_at
FROM audit_logs
WHERE action LIKE '%payment%'
ORDER BY created_at DESC
LIMIT 10;
```

### Find donations with pending payment intents
```sql
SELECT id, amount, payment_status, created_at
FROM donations
WHERE payment_status = 'pending'
AND created_at < NOW() - INTERVAL '1 hour';
```

### Count successful payments by date
```sql
SELECT DATE(created_at) as payment_date, COUNT(*) as count, SUM(amount) as total
FROM donations
WHERE payment_status = 'completed'
GROUP BY DATE(created_at)
ORDER BY payment_date DESC;
```
