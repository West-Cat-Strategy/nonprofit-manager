# Postman Collection Guide

## Overview

This directory contains Postman collection and environment files for testing the Nonprofit Manager API.

## Files

- `Nonprofit-Manager-API.postman_collection.json` - Complete API endpoint collection
- `Nonprofit-Manager.postman_environment.json` - Environment variables for local development

## Setup

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Select both JSON files
4. Collection will appear in your Collections sidebar
5. Environment will appear in environment dropdown

### 2. Select Environment

1. Click environment dropdown in top-right corner
2. Select "Nonprofit Manager - Local"
3. Verify `base_url` is set to `http://localhost:3000/api`

### 3. Start Backend Server

```bash
cd backend
npm run dev
```

## Using the Collection

### Authentication Flow

1. **Login Request**
   - Navigate to `Authentication > Login`
   - Update email/password in request body if needed
   - Click **Send**
   - Access token is automatically saved to `access_token` variable
   - All subsequent requests use this token

### Automated Variable Storage

The collection includes scripts that automatically save IDs for chaining requests:

- Login saves `access_token`
- Create Contact saves `test_contact_id`
- Create Donation saves `test_donation_id`
- Create Payment Intent saves `test_payment_intent_id`
- Create Customer saves `test_customer_id`
- Get Mailchimp Lists saves `mailchimp_list_id`
- Create Campaign saves `mailchimp_campaign_id`

This allows you to:
1. Create a contact
2. Create a donation for that contact
3. Create a payment intent for that donation
4. All without manually copying IDs

### Testing Workflows

#### Complete Payment Flow

1. **Authentication > Login** - Get access token
2. **Contacts > Create Contact** - Creates test contact, saves ID
3. **Donations > Create Donation** - Creates donation for contact, saves ID
4. **Payments > Create Payment Intent** - Creates payment intent for donation, saves ID
5. **Payments > Get Payment Intent** - Verify payment intent created
6. **Payments > Cancel Payment Intent** - Test cancellation (optional)

#### Mailchimp Campaign Flow

1. **Authentication > Login** - Get access token
2. **Mailchimp > Get Mailchimp Status** - Verify Mailchimp configured
3. **Mailchimp > Get Mailchimp Lists** - Get audiences, saves first list ID
4. **Mailchimp > Get List Segments** - Get segments for audience
5. **Mailchimp > Create Campaign** - Create campaign, saves campaign ID
6. **Mailchimp > Send Campaign** - Send the campaign (use with caution!)

#### Refund Flow

1. Complete payment flow above (steps 1-4)
2. Use Stripe test card to complete payment (in frontend)
3. **Payments > Create Refund** - Issue refund using saved payment intent ID

### Request Organization

The collection is organized into folders:

- **Authentication** - Login and register endpoints
- **Payments** - Stripe payment processing
- **Mailchimp** - Email marketing integration
- **Contacts** - Contact management CRUD
- **Donations** - Donation management
- **Cases** - Case management
- **Webhooks** - Webhook endpoints for testing

## Environment Variables

### Collection Variables (Auto-saved)

These are automatically set by test scripts:

- `access_token` - JWT token from login
- `test_contact_id` - Last created contact ID
- `test_donation_id` - Last created donation ID
- `test_payment_intent_id` - Last created payment intent ID
- `test_customer_id` - Last created Stripe customer ID
- `mailchimp_list_id` - First Mailchimp list ID
- `mailchimp_campaign_id` - Last created campaign ID

### Environment Variables (Manual)

Update these in the environment if your setup differs:

- `base_url` - API base URL (default: `http://localhost:3000/api`)

## Testing Webhooks

### Stripe Webhooks

Stripe webhooks require signature verification and are best tested using Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

The Postman webhook request is provided for reference but will fail signature verification unless you:
1. Disable signature verification (not recommended)
2. Generate a valid signature (complex)
3. Use Stripe CLI (recommended)

### Mailchimp Webhooks

Mailchimp webhooks can be tested directly in Postman:

1. Navigate to `Webhooks > Mailchimp Webhook`
2. Update form data with test values
3. Send request
4. Check server logs for webhook processing

## Troubleshooting

### 401 Unauthorized

**Cause:** Access token expired or not set

**Solution:**
1. Run `Authentication > Login` request
2. Verify token saved to `access_token` variable
3. Check collection auth inherits bearer token

### 404 Not Found with Variables

**Cause:** Variable not set (shows as `{{variable_name}}` in URL)

**Solution:**
1. Check environment is selected
2. Run the request that sets that variable first
3. Example: Run `Create Contact` before `Get Contact`

### Stripe Test Mode Errors

**Cause:** Using production API keys or wrong key format

**Solution:**
1. Verify `.env` has test keys (start with `sk_test_` and `pk_test_`)
2. Restart backend server after changing keys
3. Use Stripe test card numbers (4242 4242 4242 4242)

### Mailchimp Not Configured

**Cause:** Mailchimp API keys not set

**Solution:**
1. Add to backend `.env`:
   ```
   MAILCHIMP_API_KEY=your_key_here
   MAILCHIMP_SERVER_PREFIX=us1
   ```
2. Restart backend server
3. Test with `Mailchimp > Get Mailchimp Status`

## Advanced Usage

### Running Collection with Newman

Newman is Postman's command-line collection runner:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run Nonprofit-Manager-API.postman_collection.json \
  -e Nonprofit-Manager.postman_environment.json \
  --reporters cli,json

# Run specific folder
newman run Nonprofit-Manager-API.postman_collection.json \
  -e Nonprofit-Manager.postman_environment.json \
  --folder "Payments"
```

### Creating Test Suites

1. Duplicate collection
2. Add test scripts to requests:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has required fields", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('id');
    pm.expect(response).to.have.property('email');
});
```

3. Run with Newman for CI/CD integration

### Sharing Collection

To share with team:

1. Export collection with variable references
2. Share both collection and environment files
3. Document any required setup (API keys, etc.)
4. Consider using Postman Workspaces for team collaboration

## Best Practices

1. **Always login first** - Run authentication before other requests
2. **Use test data** - Use @example.com emails and test values
3. **Clean up** - Delete test records after testing
4. **Check logs** - Monitor backend logs for errors
5. **Test error cases** - Try invalid data to verify validation
6. **Document changes** - Update collection when API changes

## Resources

- [Postman Documentation](https://learning.postman.com/docs/)
- [Newman CLI Documentation](https://www.npmjs.com/package/newman)
- [Stripe Testing Guide](../STRIPE_TESTING_GUIDE.md)
- [API Documentation](../../README.md)
