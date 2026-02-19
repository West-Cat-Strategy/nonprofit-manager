# Security Decisions Archive

**Last Updated:** February 18, 2026  
**Compiled From:** PHASE_1_FINAL_SUMMARY.md, PHASE_2_COMPLETION_SUMMARY.md, agents.md  
**Relevant Code:** [backend/src security](../../backend/src/middleware/), [backend/src/services](../../backend/src/services/)

---

## Overview

This document consolidates security-related architectural decisions made during Phase 1 and Phase 2. These decisions protect against common web vulnerabilities and establish the security baseline for the nonprofit-manager platform.

---

## 1. SSRF Protection: URL Validation Before External Requests

### Decision
**Never make outbound HTTP requests to user-provided URLs without validation.** Validate all webhook URLs and external API endpoints against a whitelist of allowed IP ranges.

### Problem: Server-Side Request Forgery (SSRF)

Attackers can exploit services that make requests to arbitrary URLs to:
- Access internal services (localhost:6379 for Redis)
- Scan internal networks (10.0.0.0/8 private networks)
- Perform port enumeration on internal services
- Trigger actions on internal APIs

### SSRF Protection Implementation

**Blocked IP Ranges:**
```typescript
// Private networks (RFC 1918)
10.0.0.0/8        // 10.0.0.0 to 10.255.255.255

// Localhost
127.0.0.1/32      // 127.0.0.1

// Link-local
169.254.0.0/16    // 169.254.0.0 to 169.254.255.255

// Private networks (RFC 1918)
172.16.0.0/12     // 172.16.0.0 to 172.31.255.255

// Private networks (RFC 1918)
192.168.0.0/16    // 192.168.0.0 to 192.168.255.255
```

**Validation Locations:**

1. **Webhook Service** (`services/webhookService.ts`)
   ```typescript
   // Before sending webhook, validate URL
   const isValidUrl = await validateWebhookUrl(webhookUrl);
   if (!isValidUrl) {
     throw new Error('Webhook URL points to private IP range');
   }
   
   // Send request with 30s timeout
   await axios.post(webhookUrl, payload, { timeout: 30000 });
   ```

2. **External Service Integrations** (`services/externalServiceProviderService.ts`)
   ```typescript
   // When storing provider configuration
   const provider = await validateProviderConfig(config);
   if (provider.type === 'webhook' && !isPublicUrl(provider.url)) {
     throw new Error('Provider URL must be publicly accessible');
   }
   ```

### Usage Pattern

```typescript
// Example: User provides webhook URL during setup
const webhookUrl = req.body.webhookUrl; // "https://internal.local"

// Validation happens automatically
const validated = await validateWebhookUrl(webhookUrl);
if (!validated) {
  return res.status(400).json({
    error: 'Webhook URL must be publicly accessible (not private IP)'
  });
}

// Only proceed if validation passes
await webhookService.registerWebhook(webhookUrl);
```

### Decision Impact
- All external URLs validated before use
- Clear error messages when URLs are blocked
- Protection against internal network scanning
- Webhook registrations fail safely rather than silently

---

## 2. Permission System: Granular Access Control

### Decision
**Check permissions at both route and service levels** rather than relying on a single authorization point.

### Defense in Depth Pattern

```
HTTP Request
    ↓
Route-Level Check (middleware)
    ├─ Permission exists?
    └─ User has permission? → 403 Forbidden if not
       ↓
Controller → Service
    ↓
Service-Level Check (double-check)
    ├─ User still authenticated?
    └─ User owns this resource?
       ↓
Database Operation
```

### Why Double-Check

**Scenario:** A route-level check passes, but the controller calls a service function that's also used by other routes

**Without service-level check:** Service assumes authorization already done
```typescript
// userService.ts
async deleteUser(userId: string) {
  // No check! Assumes caller verified permission
  await db.user.delete({ where: { id: userId } });
}

// If another route forgets the permission check, this still deletes
```

**With service-level check:** Service validates independently
```typescript
// userService.ts
async deleteUser(userId: string, requesterUser: User) {
  // Check: Is requester an admin?
  if (!hasPermission(requesterUser, 'manage_users')) {
    throw new UnauthorizedError('Cannot delete users');
  }
  
  await db.user.delete({ where: { id: userId } });
}

// Now protected even if route-level check missed
```

### Permission Categories (45+ total)

**Volunteer Management:**
- `create_volunteer` — Create new volunteer records
- `edit_volunteer` — Modify volunteer information
- `delete_volunteer` — Remove volunteer records
- `assign_hours` — Assign volunteer hours (anyone)
- `approve_hours` — Approve volunteer hours (manager only)

**Events:**
- `create_event` — Create new events
- `edit_event` — Modify event details
- `delete_event` — Remove events
- `manage_registrations` — Add/remove event attendees

**Finances:**
- `create_donation` — Create donation records
- `edit_donation` — Modify donation information
- `view_reports` — Access financial reports
- `export_reports` — Export report data

**System Administration:**
- `manage_users` — Create/edit/delete users
- `manage_webhooks` — Create/edit/delete webhooks
- `view_audit_logs` — Access activity logs
- `manage_settings` — Change system settings

### Permission Matrix by Role

| Feature | Admin | Manager | Staff | Member | Volunteer |
|---------|-------|---------|-------|--------|-----------|
| Create volunteer | ✓ | ✓ | ✓ | | |
| Approve hours | ✓ | ✓ | | | |
| View reports | ✓ | ✓ | ✓ | ✓ | |
| Export reports | ✓ | ✓ | | | |
| Manage webhooks | ✓ | | | | |
| View audit logs | ✓ | ✓ | | | |
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ |

### Decision Impact
- Services can't be accidentally called with insufficient authorization
- Permissions are enforceable at multiple layers
- Adding new routes with service calls doesn't reduce security

---

## 3. Authentication: Session + API Keys

### Decision
Support **two authentication methods** for different use cases:

1. **Session-Based Authentication** — Browser users (portal)
2. **API Key Authentication** — External integrations

### Session-Based (Browser Users)

```typescript
// Login endpoint
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}

// Response sets secure cookie
Set-Cookie: session_id=abc123; 
  HttpOnly;           // Not accessible to JavaScript
  Secure;             // HTTPS only
  SameSite=Strict;    // CSRF protection
  Max-Age=86400       // 24 hour expiry
```

**Browser Behavior:**
- Cookie automatically sent with every request
- No JavaScript access (prevents XSS theft)
- No CSRF attacks possible (browsers enforce SameSite)
- Automatic expiry after 24 hours

### API Key Authentication (External Integrations)

```typescript
// Third-party service makes request
GET /api/imports/records
Authorization: Bearer sk_live_abc123def456

// Validation in middleware
const apiKey = extractApiKeyFromHeader(req);
const keyRecord = await db.apiKey.findUnique({
  where: { key: apiKey }
});

if (!keyRecord || keyRecord.revoked) {
  return res.status(401).json({ error: 'Invalid API key' });
}

// Attach organization context
req.organizationId = keyRecord.organizationId;
```

**API Key Behavior:**
- Never expires (vs. sessions which expire)
- Can be revoked manually
- Rate-limited per key
- Logged separately for audit trail
- Can be scoped to specific permissions

### Session Expiration & Refresh

```typescript
// Sessions expire after 24 hours
// For long-session scenarios, implement refresh tokens

POST /api/auth/refresh
{
  "refreshToken": "rt_abc123"
}

// Response with new session cookie
Set-Cookie: session_id=xyz789; ...
```

### Decision Impact
- Browser users get automatic session management
- External integrations have persistent API access
- Each authentication method has independent rate limiting
- Session theft via XSS prevented (HttpOnly cookies)

---

## 4. Sensitive Data: PII Field Access Control

### Decision
**Flag sensitive fields** (personally identifiable information) and **require explicit permission** before including them in API responses.

### Sensitive Field Categories

**Personal Information:**
- Email addresses
- Phone numbers
- Home addresses
- Social security numbers (if collected)
- Date of birth

**Financial Information:**
- Bank account numbers
- Payment method details
- Salary/compensation
- Donation amounts (context-specific)

**Health/Legal:**
- Medical conditions
- Legal case details
- Background check results

### Access Control Pattern

```typescript
// When fetching user data
const user = await db.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    // email NOT selected by default
    // phone NOT selected by default
  }
});

// To include sensitive data, explicitly request
const userWithEmail = await db.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,  // Explicit inclusion
  }
});

// And check permission
if (!hasPermission(req.user, 'view_contact_info')) {
  delete userWithEmail.email;
}
```

### Middleware Protection

```typescript
// Middleware: piiFieldAccessControl.ts
// Prevents sending PII without permission checks

export const checkPiiAccess = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const forbiddenFields = fields.filter(
      field => !hasPermission(req.user, `view_${field}`)
    );
    
    if (forbiddenFields.length > 0) {
      return res.status(403).json({
        error: `Cannot access: ${forbiddenFields.join(', ')}`
      });
    }
    
    next();
  };
};

// Usage in routes
app.get('/api/users/:id',
  checkPiiAccess(['email', 'phone']),
  getUserController
);
```

### Logging Policy

**Rule: Never log PII**

```typescript
// ❌ WRONG - logs email
logger.info(`User login: ${user.email}`);

// ✓ CORRECT - logs ID only
logger.info(`User login attempt`, { userId: user.id });

// ❌ WRONG - logs card number
logger.error(`Payment failed: ${payment.cardNumber}`);

// ✓ CORRECT - logs masked card
logger.error(`Payment failed`, { cardLast4: payment.cardNumber.slice(-4) });
```

### Decision Impact
- PII exposure prevented at controller level
- Clear audit trail of who accessed sensitive data
- Logs safe to analyze without privacy concerns
- Easy to modify which fields are considered sensitive

---

## 5. Webhook Delivery: Signature Verification

### Decision
**Sign all webhook payloads** with HMAC-SHA256 to allow recipients to verify authenticity and prevent replay attacks.

### Implementation

**Webhook Registration:**
```typescript
const webhook = await db.webhook.create({
  data: {
    url: 'https://external-service.com/webhook',
    secret: crypto.randomBytes(32).toString('hex'),  // Generated secret
    events: ['donation_received', 'event_registered']
  }
});
```

**Signature Generation:**
```typescript
import { createHmac } from 'crypto';

const payload = {
  timestamp: new Date().toISOString(),
  eventType: 'donation_received',
  organizationId: 'org_123',
  data: { amount: 10000, donor: 'John Doe' }
};

const signature = createHmac('sha256', webhook.secret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Send with header
axios.post(webhook.url, payload, {
  headers: {
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': Date.now()
  }
});
```

**Client-Side Verification:**
```typescript
// External service verifies webhook
const { verifyWebhookSignature } = require('@nonprofit/webhook-sdk');

app.post('/webhook', (req, res) => {
  // Verify signature
  const isValid = verifyWebhookSignature(
    req.body,
    req.headers['x-webhook-signature'],
    process.env.WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  handleDonationReceived(req.body.data);
  res.sendStatus(200);
});
```

### Replay Attack Prevention

**Timestamp Validation:**
```typescript
const timestamp = parseInt(req.headers['x-webhook-timestamp']);
const now = Date.now();
const maxAge = 5 * 60 * 1000;  // 5 minutes

if (Math.abs(now - timestamp) > maxAge) {
  return res.status(400).json({ error: 'Request is too old' });
}

// Also track delivered webhooks to prevent reprocessing
const isDuplicate = await db.webhookDelivery.findFirst({
  where: {
    signature: signature,
    createdAt: { gte: new Date(timestamp - maxAge) }
  }
});

if (isDuplicate) {
  return res.status(409).json({ error: 'Duplicate delivery' });
}
```

### Decision Impact
- External services can verify webhook authenticity
- Replay attacks impossible (timestamp + signature combo)
- Webhook secret is never sent (sent only to registered URL)
- Recipients can safely process webhooks without additional calls

---

## 6. Rate Limiting: Multi-Strategy Protection

### Decision
Implement **6 configurable rate limiting strategies** to prevent abuse:

1. **Global rate limit** — Overall request limit per minute
2. **Per-endpoint limit** — Specific limits for sensitive endpoints
3. **Per-user limit** — Prevent single user flooding
4. **Per-IP limit** — Prevent network-level attacks
5. **Sliding window** — More accurate than fixed buckets
6. **Token bucket** — Smooth traffic distribution

### Strategy Selection by Endpoint

**Authentication endpoints (login, registration, 2FA):**
```typescript
// Strict: 5 attempts per 15 minutes per IP
// Strict: 10 attempts per 15 minutes per user
// Recovers slowly (prevents brute force)
app.post('/api/auth/login',
  rateLimitPerIP('5-per-15m'),
  rateLimitPerUser('10-per-15m'),
  loginController
);
```

**Reporting endpoints (data export):**
```typescript
// Moderate: 50 requests per hour per user
// Prevents data scraping
app.get('/api/reports/export',
  rateLimitPerUser('50-per-1h'),
  exportReportController
);
```

**Public endpoints (event registration):**
```typescript
// Lenient: 100 requests per hour per IP
// Allows legitimate bulk operations
app.post('/api/events/:id/register',
  rateLimitPerIP('100-per-1h'),
  registerForEventController
);
```

**API endpoints:**
```typescript
// Per API key: check quota from token
// Allow burst but enforce overall limit
app.get('/api/imports/records',
  rateLimitPerApiKey(apiKey),  // 1000 requests per month
  getImportedRecordsController
);
```

### Sliding Window Algorithm

```typescript
// More accurate than fixed buckets
// Prevents "hammer at boundary" attacks

// Fixed bucket (bad):
// |------ 1 minute ------| |------ 1 minute ------|
// [5 requests allowed]     [5 requests allowed]
// Problem: attacker hits right at boundary with 10 requests

// Sliding window (good):
// Now: 09:45:32
// Check last 60 seconds: 09:44:32 - 09:45:32
// Count requests in that window: 5
// If new request comes at 09:45:33, window slides to 09:44:33 - 09:45:33
// Prevents boundary attacks
```

### Decision Impact
- Brute force attacks prevented (strict on auth endpoints)
- API key quota enforced (prevents scraping)
- DDoS attacks mitigated (per-IP limiting)
- Legitimate users unaffected (per-user limits accommodate normal use)

---

## 7. Password Policy: Strong Hashing with bcrypt

### Decision
**Hash passwords with bcrypt** using 10+ salt rounds, never store plaintext passwords.

### Implementation

**Password Hashing:**
```typescript
import bcrypt from 'bcrypt';

const password = 'user-provided-password';
const saltRounds = 10;  // ~100ms per hash (slow = secure!)

const hashedPassword = await bcrypt.hash(password, saltRounds);
// Result: $2b$10$abcdefghijklmnopqrstuvwxyz... (60 characters)
```

**Password Verification:**
```typescript
const isValid = await bcrypt.compare(
  'user-provided-password',
  hashedPassword
);

if (isValid) {
  // Password matches
} else {
  // Password incorrect
}
```

**Bcrypt Advantages:**
- Bcrypt automatically handles salt generation
- Built-in work factor (rounds) prevents rainbow tables
- Slow by design (10 rounds = ~100ms per check) — prevents brute force
- Future-proof: rounds can increase as computers get faster

### Password Validation Rules

```typescript
const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .max(128, 'Password too long')
  .refine(
    (pwd) => /[A-Z]/.test(pwd),
    'Must contain uppercase letter'
  )
  .refine(
    (pwd) => /[0-9]/.test(pwd),
    'Must contain number'
  )
  .refine(
    (pwd) => /[^A-Za-z0-9]/.test(pwd),
    'Must contain special character'
  );

// Result: MyPasswordX!
// Error: {password: "Must contain special character"}
```

### Decision Impact
- Passwords never readable even in database
- Default bcrypt settings prevent rainbow table attacks
- Slow hashing prevents online brute force
- Password complexity enforced at validation layer

---

## 8. API Response Errors: Never Leak Internal Details

### Decision
**Sanitize error messages** in API responses to prevent leaking internal system information.

### Wrong Approach (Information Leakage)

```typescript
❌ Database error leaked
try {
  await db.donation.create(data);
} catch (error) {
  res.status(500).json({
    error: `PostgreSQL constraint violation: unique_email_idx`
  });
}
// Attacker now knows: database type, schema details

❌ File path leaked
const file = require(filePath);
// Error: ENOENT: no such file or directory, open '/home/deploy/backend/src/utils/secrets.js'
// Attacker now knows: server filesystem structure

❌ Stack trace leaked
try {
  riskyOperation();
} catch (err) {
  res.status(500).json({
    error: err.stack  // Full JavaScript stack trace
  });
}
```

### Correct Approach (Sanitized)

```typescript
✓ Generic message to client
try {
  await db.donation.create(data);
} catch (error) {
  logger.error('Database error', { 
    error: error.message,
    userId: req.user.id 
  });
  res.status(500).json({
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'Could not process donation. Please try again.'
    }
  });
}

✓ Specific message logged (not sent to client)
try {
  const webhook = await webhookService.send(url, payload);
} catch (error) {
  // Log full error with context
  logger.error('Webhook delivery failed', {
    webhookId: webhook.id,
    url: url,
    error: error.message,
    stack: error.stack
  });
  
  // Send generic message to client
  res.status(500).json({
    success: false,
    error: {
      code: 'WEBHOOK_DELIVERY_FAILED',
      message: 'External service temporarily unavailable'
    }
  });
}
```

### Standard Error Codes

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { "email": "Invalid email format" }
  }
}

{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid credentials"
  }
}

{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Insufficient permissions"
  }
}

{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}

{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An error occurred. Please contact support."
  }
}
```

### Decision Impact
- No internal system information leaks to clients
- Full error info logged for debugging
- Attackers can't use error messages for reconnaissance
- Consistent error format across all endpoints

---

## Security Decision Summary

These decisions establish a **defense-in-depth** security model:

✅ **Input Validation** — Zod schemas validate all inputs
✅ **Authorization** — Multi-layer permission checks (route + service)
✅ **Authentication** — Sessions + API keys for different use cases
✅ **Data Protection** — PII access controlled, secrets never logged
✅ **Integration Security** — Webhook signatures prevent spoofing
✅ **Abuse Prevention** — Rate limiting on sensitive endpoints
✅ **Credential Security** — bcrypt for passwords, secrets in environment
✅ **Error Handling** — Information never leaked in error responses

### Security Audit Checklist

When adding new features:
- ✓ Define required permissions upfront
- ✓ Validate all user inputs with Zod schemas
- ✓ Check permissions at route AND service level
- ✓ Never log PII or sensitive data
- ✓ Rate limit sensitive endpoints appropriately
- ✓ Use HTTPS only (enforce in production)
- ✓ Test authentication/authorization flows
- ✓ Sanitize error messages (no internal details)

---

## See Also

- [Architecture Decisions](./ARCHITECTURE_DECISIONS.md) — Framework/ORM choices
- [Security Monitoring & Incident Response](../../docs/security/SECURITY_MONITORING_GUIDE.md) — Runtime security
- [Planning & Progress](../planning-and-progress.md) — Security-related tasks in development
