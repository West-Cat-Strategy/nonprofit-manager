# Agents in Nonprofit Manager

## TL;DR

This codebase uses **"agents"** in three distinct ways:

1. **Developer Agents** — AI assistants (like GitHub Copilot) that contribute code following specific architecture patterns, validation rules, and security guidelines
2. **Multi-Agent Coordination** — A task management protocol enabling multiple developers/agents to work in parallel without conflicts
3. **User-Agent Tracking** — HTTP browser/client identification for analytics, security monitoring, and activity logging

**There are no autonomous AI agents** running independently. The architecture uses traditional service/controller patterns with middleware layers for validation, authentication, and error handling.

---

## Quick Navigation

- [Developer Agent Guidelines](#developer-agent-guidelines) — How AI assistants should work on this project
- [Multi-Agent Coordination Protocol](#multi-agent-coordination-protocol) — Task management and parallel work
- [User-Agent Tracking System](#user-agent-tracking-system) — Browser/client identification for analytics
- [Integration Patterns](#integration-patterns) — Systems that perform autonomous-like actions (webhooks, external services)

---

## Developer Agent Guidelines

### Overview

Developer agents are AI assistants contributing code to the nonprofit-manager project. Full guidelines are in [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md).

### Tech Stack Requirements

**Backend:**
- TypeScript with strict null checking
- Node.js with Express.js
- PostgreSQL with `pg` service-layer queries
- Jest for unit tests
- Zod for runtime validation

**Frontend:**
- React with TypeScript
- Vite for bundling
- Tailwind CSS for styling
- Vitest for unit tests
- Playwright for E2E tests

**DevOps:**
- Docker & Docker Compose for local development
- GitHub Actions for CI/CD
- PostgreSQL + Redis for services

### Code Standards

**Architecture Pattern:**
```
Route → Controller → Service → Database
     ↓       ↓          ↓
Validation  Auth   Business Logic
```

**Directory Structure:**
```
backend/src/
  ├── routes/          # HTTP endpoint definitions
  ├── controllers/     # Request handlers (40+ files)
  ├── services/        # Business logic (40+ files)
  ├── middleware/      # Cross-cutting concerns
  ├── types/           # TypeScript interfaces
  ├── config/          # Configuration management
  ├── utils/           # Shared utilities
  └── __tests__/       # Unit tests
```

### Validation Strategy

- **Framework:** Zod for runtime type validation
- **Location:** Middleware layer before controller execution
- **Status:** 38 Zod schemas defined and in use across auth endpoints. All validation middleware active. Coverage expanding to additional service routes in Phase 2.
- **Coverage:** All inputs must be validated with explicit Zod schemas
- **Error Format:** Standardized validation error responses

**Example:**
```typescript
const updateSettingsSchema = z.object({
  webhookUrl: z.string().url().optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
});

export const updateSettingsHandler = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { data, error } = validateRequest(req.body, updateSettingsSchema);
  if (error) return sendValidationError(res, error);
  // ... handler logic
};
```

### Authentication & Authorization

**Auth Guards Service:** [backend/src/services/authGuardService.ts](backend/src/services/authGuardService.ts)

Helper functions for checking user permissions:
- `requireUserOrError()` — User must be authenticated
- `requireRoleOrError(req, roles...)` — User must have specific role
- `requirePermissionOrError(req, permission)` — User must have permission
- `canAccessOrganization(user, orgId)` — Organization access check

**Permission System:**
- **45+ granular permissions** across 5 roles
- Roles: Admin, Manager, Coordinator, Volunteer, Donor
- Permissions stored in database, checked at request-time
- Middleware: [backend/src/middleware/permissions.ts](backend/src/middleware/permissions.ts)

### Rate Limiting

**Strategy:** Advanced rate limiting with 6 configurable strategies:
1. Global rate limit
2. Per-endpoint limit
3. Per-user limit
4. Per-IP limit
5. Sliding window
6. Token bucket

**Implementation:** [backend/src/middleware/rateLimiter.ts](backend/src/middleware/rateLimiter.ts)

### Testing Requirements

**Unit Tests:**
- Minimum 80% code coverage for services
- Jest configuration: [backend/jest.config.ts](backend/jest.config.ts)
- Run tests: `npm test` in backend/

**E2E Tests:**
- Playwright for end-to-end testing
- Configuration: [e2e/playwright.config.ts](e2e/playwright.config.ts)
- Test coverage: 69 comprehensive E2E tests
- Run tests: `npm test` in e2e/ root

**CI/CD:**
- GitHub Actions: Runs on every PR
- Services: PostgreSQL + Redis + Backend
- Requirements:
  - All unit tests pass
  - All E2E tests pass
  - No lint/TypeScript errors

### API Design Patterns

**Request/Response Format:**
```typescript
// Success Response
{
  success: true,
  data: { /* response data */ }
}

// Error Response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR" | "AUTH_ERROR" | "NOT_FOUND" | ...,
    message: "Human-readable message",
    details?: { /* field-level details */ }
  }
}
```

**Endpoint Naming:**
- `GET /api/resource` — List resources
- `GET /api/resource/:id` — Get one resource
- `POST /api/resource` — Create resource
- `PUT /api/resource/:id` — Update resource
- `DELETE /api/resource/:id` — Delete resource
- `POST /api/resource/:id/action` — Custom action

### Security Guidelines

**SSRF Protection:**
- Validate URLs before making external requests
- Webhook service prevents private IPs (10.0.0.0/8, 127.0.0.1, etc.)
- DNS lookups validated against IP ranges

**PII/Sensitive Data:**
- Middleware: [backend/src/middleware/piiFieldAccessControl.ts](backend/src/middleware/piiFieldAccessControl.ts)
- Sensitive fields require explicit permission checks
- Logs never contain PII (structured logging patterns)

**Secrets Management:**
- Environment variables for all credentials
- Never commit `.env` files
- Use `.env.example` for template documentation

---

## Multi-Agent Coordination Protocol

### Overview

Multiple developers or AI agents can work in parallel on this project using a structured task management system. The **Workboard** in [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) coordinates all work.

### Task Lifecycle

```
Backlog → Ready → In Progress → Blocked/Review → Done
  ↓        ↓         ↓              ↓             ↓
 Needs   Planned   Active Work   Waiting       Complete
 refinement      by one agent    for help/review
```

**Task ID Format:** `P{phase}-T{task}.{subtask}-{code}`

Example: `P2-T8.2-VALID` = Phase 2, Task 8, Subtask 2, Validation work

### Rules of Engagement

#### 1. Sign-Out Tasks Before Starting

Before implementing a task, update [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md):

```markdown
| P2-T8 | Migrate volunteer routes to Zod validation | In Progress | @agent-name | P2-T8 | ... |
```

- Change status to "In Progress"
- Add your agent/developer identifier in assignee column
- Update task ID in git column

#### 2. One Task Per Agent At A Time

- One "In Progress" task per agent by default; coordinated parent+subtask concurrency is allowed when explicitly linked
- Switch tasks only when previous task is "Done" or "Blocked"
- If blocked, document blocker and escalate

#### 3. Use Task IDs in Git

All commits should reference task ID:

```bash
git commit -m "P2-T8: Migrate volunteer routes to Zod validation

- Added zod schemas for volunteer endpoints
- Updated controller handlers with validation middleware
- Added validation tests"
```

PR titles follow format: `[P2-T8] Volunteer routes validation`

#### 4. Update Status Changes

When task status changes:
- Update Workboard immediately in [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md)
- Add comment with status reason if transitioning to "Blocked" or "Review"
- Post update in team communication channel

#### 5. Blocker Escalation

When blocked, document:
- **What:** Specific problem blocking progress
- **Why:** Root cause or dependency
- **Next Step:** What's needed to unblock (answer, approval, other PR to merge first)

Example blocker:
```
| P2-T9 | Standardize error responses | Blocked | @agent | P2-T9 | Waiting on P2-T8 merge |
```

#### 6. Code Review Requirements

Before marking task "Done":
- All unit tests pass locally
- All E2E tests pass locally
- Code follows patterns from [docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md)
- No TypeScript errors or linting issues
- Create PR with task ID in title
- Get approval from project maintainer

### Workboard Navigation

**Current Workboard Location:** [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md)

**Columns:**
- Task ID
- Description
- Status (Backlog / Ready / In Progress / Blocked / Review / Done)
- Assignee
- PR/Commit Reference
- Notes/Blockers

**Current Phase:** Phase 4 - Modularity Refactor (In Progress, with active Phase 3 stream as of March 1, 2026)  
**Workboard Location:** [docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md) (single source of truth)

**Archived Phase documentation:** Old PHASE_1/2 and WEEK completion files have been archived to [docs/phases/archive/](docs/phases/archive/) to reduce confusion. See [docs/phases/archive/README.md](docs/phases/archive/README.md) for details.

**Next Ready Tasks:**
- P2-T11: Migrate event routes to Zod validation
- P2-T12: Migrate task routes to Zod validation
- P2-T13: Migrate account routes to Zod validation
- P2-T14: Migrate remaining routes to Zod (cases, meetings, invitations, etc.)
- P2-T15: Add validation to cases.ts

### Merge Strategy

**Requirements for merge:**
1. All status checks pass (CI/CD pipeline)
2. Code review approval from maintainer
3. Task marked "Review" in Workboard
4. No merge conflicts
5. Commit history is clean (squash if needed)

**Post-Merge:**
- Update task status to "Done" in Workboard
- Close associated PR
- Remove branch

---

## User-Agent Tracking System

### Overview

The application tracks HTTP `User-Agent` headers to understand browser/client behavior for analytics, security monitoring, and quality assurance.

### Where User-Agent Is Tracked

| Service | File | Purpose |
|---------|------|---------|
| Portal Activity | [backend/src/services/portalActivityService.ts](backend/src/services/portalActivityService.ts#L25-L32) | Log user interactions on portal |
| API Key Usage | [backend/src/services/apiKeyService.ts](backend/src/services/apiKeyService.ts#L269) | Track API key consumption by client |
| Auth Activity | [backend/src/controllers/portalAuthController.ts](backend/src/controllers/portalAuthController.ts#L147) | Log authentication attempts and sessions |
| Publishing Events | [backend/src/controllers/publishingController.ts](backend/src/controllers/publishingController.ts#L286) | Track publishing actions |
| Portal Actions | [backend/src/modules/portal/controllers/resources.controller.ts](backend/src/modules/portal/controllers/resources.controller.ts#L96) | Log portal document/resource actions |

### Database Schema

**Table: `portal_activity_logs`**
```sql
CREATE TABLE portal_activity_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type VARCHAR(50),
  user_agent TEXT,  -- ← Browser/Client identification
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Table: `api_key_usage`**
```sql
CREATE TABLE api_key_usage (
  id UUID PRIMARY KEY,
  api_key_id UUID,
  user_agent TEXT,  -- ← Client identification
  bytes_used INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Type Definitions

**WebhookPayload:** [backend/src/types/webhook.ts](backend/src/types/webhook.ts#L190)

```typescript
interface WebhookPayload {
  timestamp: string;
  eventType: string;
  organizationId: string;
  userId: string;
  userAgent?: string;  // ← Optional field for delivery tracking
  data: Record<string, unknown>;
}
```

### Usage Examples

**Capturing User-Agent:**
```typescript
// In controller handler
const userAgent = req.headers['user-agent'] || 'Unknown';

await portalActivityService.logActivity({
  userId: req.user.id,
  activityType: 'PAGE_VIEW',
  userAgent,  // ← Captured here
  data: { page: '/dashboard' }
});
```

**Querying User-Agent Data:**
```typescript
// Analytics query
const activitiesByClient = await db.portalActivityLogs.groupBy({
  by: ['user_agent'],
  _count: true,
  where: { createdAt: { gte: last30days } }
});
```

### Analytics Use Cases

1. **Browser Compatibility:** Track which browsers/versions are commonly used
2. **Client Distribution:** Identify mobile vs desktop usage patterns
3. **Bot Detection:** Flag suspicious user-agents for security
4. **API Client Type:** Segment API usage by client (iOS app, web, third-party integrations)
5. **Support Debugging:** Match user-agent from logs when users report issues

### Security Considerations

- User-Agent is **not sensitive data** (publicly sent by all browsers)
- Useful for **fraud detection** (unusual user-agent changes for same user)
- Enable **rate limiting per user-agent** to prevent bot abuse
- Log user-agent in **security events** for incident investigation

---

## Integration Patterns

### Overview

While not autonomous agents, these systems perform autonomous-like actions in response to events through autonomous delivery mechanisms.

### Webhook Delivery System

**Services:** [backend/src/services/webhookService.ts](backend/src/services/webhookService.ts), [backend/src/services/webhookRetrySchedulerService.ts](backend/src/services/webhookRetrySchedulerService.ts)

**Purpose:** Event-driven delivery of notifications to external systems

**Features:**

| Feature | Details |
|---------|---------|
| **Async Delivery** | Non-blocking, background queue processing |
| **Retry Strategy** | 5 retry attempts with exponential backoff |
| **Retry Delays** | 1m → 5m → 15m → 1h → 2h (total: ~7 hours) |
| **Retry Worker** | Interval runner with row-claiming (`FOR UPDATE SKIP LOCKED`) to avoid duplicate processing |
| **Timeout** | 30 seconds per delivery attempt |
| **Signature** | HMAC-SHA256 signing for authenticity |
| **SSRF Protection** | DNS validation, private IP blocking |

**Supported Events:**
- Donation received
- Event registration
- Volunteer sign-up
- Organization changes
- Admin actions

**Security:**
```typescript
// Private IP ranges blocked:
- 10.0.0.0/8 (private networks)
- 127.0.0.1 (localhost)
- 169.254.0.0/16 (link-local)
- 172.16.0.0/12 (private networks)
- 192.168.0.0/16 (private networks)

// Signature validation in client:
const signature = createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

**Workflow:**
1. Event occurs in system (donation received, registration submitted)
2. Webhook service adds delivery to background queue
3. Worker picks up delivery from queue
4. Validates webhook URL (DNS, IP range)
5. Sends signed POST request with 30s timeout
6. On failure, schedule retry with exponential backoff
7. After 5 failed attempts, mark delivery as "failed"

**Scheduler flags:**
- `WEBHOOK_RETRY_SCHEDULER_ENABLED`
- `WEBHOOK_RETRY_SCHEDULER_INTERVAL_MS`
- `WEBHOOK_RETRY_SCHEDULER_BATCH_SIZE`

### External Service Provider Integration

**Service:** [backend/src/services/externalServiceProviderService.ts](backend/src/services/externalServiceProviderService.ts)

**Purpose:** Manage integrations with third-party services (email, CRM, payment processors)

**Operations:**

| Operation | Function |
|-----------|----------|
| **Create** | Register new external service provider |
| **Read** | Fetch provider configuration |
| **Update** | Modify provider settings |
| **Delete** | Remove provider integration |
| **Search** | Find providers by type, status, etc. |
| **Activity** | Track how many connected services use each provider |

**Provider Types:**
- Email service providers (SendGrid, Mailgun, etc.)
- CRM systems (Salesforce, HubSpot, etc.)
- Payment processors (Stripe, PayPal, etc.)
- Analytics services (Google Analytics, Plausible, etc.)

**Example Flow:**
1. Admin configures Stripe as payment provider
2. Service stores provider config (API key, webhook secret)
3. When donation comes in, system uses provider to process payment
4. Provider integration handles retry logic and error reporting

---

## Related Documentation

- **[docs/development/AGENT_INSTRUCTIONS.md](docs/development/AGENT_INSTRUCTIONS.md)** — Detailed guidelines for AI developer agents
- **[docs/phases/planning-and-progress.md](docs/phases/planning-and-progress.md)** — Workboard and task coordination
- **[docs/development/](docs/development/)** — Architecture, API design, database guidelines
- **[docs/security/SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md)** — Security patterns and monitoring
- **[README.md](README.md)** — Project overview and getting started

---

## Summary

The nonprofit-manager codebase uses "agents" in three complementary ways:

1. **Developer agents** work following strict architectural patterns, validation rules, and security guidelines
2. **Multiple agents coordinate** through a task management protocol to prevent conflicts
3. **User-agent tracking** provides visibility into browser behavior for analytics and security

The actual implementation uses traditional service/controller patterns enriched with webhooks and external service integrations that provide autonomous-like capabilities for event delivery and third-party synchronization.
