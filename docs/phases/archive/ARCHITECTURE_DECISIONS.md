# Architecture Decisions Archive

**Last Updated:** February 18, 2026  
**Compiled From:** PHASE_1_COMPLETION_SUMMARY.md, PHASE_1_FINAL_SUMMARY.md, PHASE_2_COMPLETION_SUMMARY.md  
**Relevant Code:** [backend/src architecture](https://github.com/West-Cat-Strategy/nonprofit-manager)

---

## Overview

This document consolidates key architectural decisions made during Phase 1 and Phase 2 development. These decisions form the foundation for the nonprofit-manager platform's design and should be understood before making breaking changes.

---

## 1. Validation Framework: Zod Over Alternatives

### Decision
Use **Zod** for runtime type validation across backend API routes and frontend services.

### Alternatives Considered
- express-validator (chainable validation)
- Joi (heavyweight, more features)
- Custom validation functions (time-consuming, error-prone)

### Why Zod
- **TypeScript-first:** Auto-generates TypeScript types from schemas (no duplicated types)
- **Zero dependencies:** Lightweight, fast bundle
- **Composable:** Schemas build on each other (e.g., base schemas → domain-specific schemas)
- **Reusable:** Same schemas can be shared between frontend and backend
- **Developer experience:** Clear error messages with field-level details

### Implementation Details

**File Structure:**
```
backend/src/validations/
├── shared.ts       # Base schemas: UUID, email, password, pagination
├── auth.ts         # Authentication: login, registration, 2FA, passkey
├── user.ts         # User management: profile, preferences, roles
├── volunteer.ts    # Volunteer: profiles, assignments, availability
├── event.ts        # Event management: creation, updates, filtering
├── contact.ts      # Contact information: types, relationships
├── donation.ts     # Financial: donations, amounts, types
├── case.ts         # Case management: statuses, priorities
├── task.ts         # Task tracking: tags, priorities, dates
└── index.ts        # Central export point
```

**Coverage:** 38+ validation schemas defined (as of Phase 2)

### Usage Pattern
```typescript
// Define once
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Use frontend
const validated = await loginSchema.parseAsync(formData);

// Use backend in middleware
export const validateLogin = validateBody(loginSchema);
app.post('/api/auth/login', validateLogin, loginController);
```

### Decision Impact
- All incoming requests must validate through Zod middleware
- New endpoints must define Zod schemas before implementation
- Reduces runtime type errors to nearly zero
- Enforces consistent error response format across all endpoints

---

## 2. Permission System: Granular RBAC Over Simple Roles

### Decision
Implement **role-based access control (RBAC)** with **45+ granular permissions** across **5 role levels** rather than simple role checking.

### Why Not Simple Roles
Simple role checking (`if (user.role === 'admin')`) becomes unmaintainable as features grow:
- Can't express "volunteer coordinator can manage volunteers but not finances"
- Every feature addition requires code changes to add new roles
- Hard to audit what each role can actually do

### Permission Matrix

**Role Levels:**
1. **Admin** — Full system access (development/ops use)
2. **Manager** — Organization management, reporting, volunteer oversight
3. **Staff/Coordinator** — Operational tasks (events, contacts, tasks)
4. **Member** — Limited access (own profile, read-only reports)
5. **Volunteer** — Minimal access (own profile, assigned tasks/events)

**Permission Categories (45+ total):**
- **Volunteer Management:** create_volunteer, edit_volunteer, delete_volunteer, assign_hours, approve_hours
- **Event Management:** create_event, edit_event, delete_event, manage_registrations
- **Case Management:** create_case, edit_case, assign_case, close_case
- **Financial:** create_donation, edit_donation, view_reports, export_reports
- **Contact Management:** create_contact, edit_contact, delete_contact
- **System Admin:** manage_users, manage_settings, manage_webhooks, view_audit_logs

**Matrix:**
```
Permission              | Admin | Manager | Staff | Member | Volunteer
create_volunteer        |   ✓   |    ✓    |   ✓   |        |
approve_hours           |   ✓   |    ✓    |       |        |
view_reports            |   ✓   |    ✓    |   ✓   |   ✓    |
manage_settings         |   ✓   |         |       |        |
view_audit_logs         |   ✓   |    ✓    |       |        |
```

### Implementation

**File:** `backend/src/utils/permissions.ts`

**Helper Functions:**
```typescript
// Check single permission
hasPermission(user, 'create_volunteer')

// Check multiple (any)
hasAnyPermission(user, ['create_donation', 'approve_donation'])

// Check multiple (all)
hasAllPermissions(user, ['manage_users', 'view_audit_logs'])

// Get all permissions for a role
getPermissionsForRole('manager')

// Convenience helpers
isAdmin(user)
canManageVolunteers(user)
canApproveHours(user)
```

### Decision Impact
- New features require defining required permissions upfront
- Permissions checked at controller level using auth guards
- Audit trail shows which permissions users have exercised
- Easy to modify permissions without code changes (can be database-driven in future)

---

## 3. Auth Guards Service: Safe Authorization Pattern

### Decision
Create **authGuardService.ts** with helper functions for consistent authorization checking instead of repeating permission checks in every controller.

### Problem It Solves

**Without guards** (error-prone):
```typescript
const user = req.user;
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
const organization = await orgService.get(req.params.orgId);
if (!organization) {
  return res.status(404).json({ error: 'Not found' });
}
if (!hasPermission(user, 'manage_users')) {
  return res.status(403).json({ error: 'Forbidden' });
}
// ... actual business logic
```

**With guards** (safe, reusable):
```typescript
export const updateUserHandler = async (req: AuthRequest, res: Response) => {
  const user = await requireUserOrError(req, res);
  if (!user) return;
  
  const permission = await requirePermissionOrError(req, res, 'manage_users');
  if (!permission) return;
  
  // ... actual business logic
};
```

**Benefits:**
- Consistent error format
- Prevents null reference errors
- Clear intent (guards vs. manual checks)
- Reusable across all controllers

### Guard Functions

**File:** `backend/src/services/authGuardService.ts`

```typescript
// Get authenticated user (returns null if not authenticated)
requireUserOrError(req: AuthRequest, res: Response): User | null

// Require specific roles
requireRoleOrError(req: AuthRequest, res: Response, ...roles: Role[]): User | null

// Require specific permission
requirePermissionOrError(req: AuthRequest, res: Response, permission: string): User | null

// Require organization access
requireOrganizationOrError(req: AuthRequest, res: Response, orgId: string): Organization | null

// Check resource-level access
canAccessResource(user: User, resource: any): boolean

// Middleware-style guards for route-level enforcement
guardWithRole('admin', 'manager')
guardWithPermission('manage_webhooks')
```

### Decision Impact
- All controller functions start with guard checks
- Guard errors automatically format responses (401, 403, 404)
- Service layer functions receive pre-validated authenticated users
- Reduces controller code by ~20%

---

## 4. Validation Middleware: Zod + Express Integration

### Decision
Create **zodValidation.ts** middleware for Express to validate request bodies, query params, and route params against Zod schemas.

### Middleware Functions

```typescript
// Validate body against schema
export const validateBody = (schema: ZodSchema) => 
  (req: Request, res: Response, next: NextFunction) => { ... }

// Validate query parameters
export const validateQuery = (schema: ZodSchema) => { ... }

// Validate route parameters
export const validateParams = (schema: ZodSchema) => { ... }

// Validate multiple sources at once
export const validateRequest = (schema: ZodSchema) => { ... }

// For imperative validation in services
export const validateData = <T>(data: unknown, schema: ZodSchema<T>): T | null => { ... }

// Imperative validation that throws
export const validateDataOrThrow = <T>(data: unknown, schema: ZodSchema<T>): T => { ... }

// Partial validation for PATCH requests
export const validatePartial = (schema: ZodSchema) => { ... }
```

### Usage Pattern

```typescript
// Define schema once
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['admin', 'manager', 'staff'])
});

// Use in route
app.patch('/api/users/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(updateUserSchema),
  updateUserController
);

// Controller receives pre-validated data
export const updateUserController = async (req: AuthRequest, res: Response) => {
  // req.body is type-safe (validated against schema)
  // req.params is type-safe (validated against schema)
  const { email, name, role } = req.body;
  // ...
};
```

### Error Response Format

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "name": "String must be at least 2 characters"
    }
  }
}
```

### Decision Impact
- Validation is declarative (schemas define requirements)
- Consistent error responses across all endpoints
- Type-safe request handling (TypeScript knows request shape)
- Easy to add new validation rules (extend schemas)

---

## 5. Permission Middleware: Route-Level Authorization

### Decision
Create **permissions.ts** middleware for route-level permission enforcement, preventing unauthorized requests before they reach controllers.

### Middleware Functions

```typescript
// Require specific permission
export const requirePermission = (permission: string) => { ... }

// Require any of multiple permissions
export const requireAnyPermission = (...permissions: string[]) => { ... }

// Require all permissions
export const requireAllPermissions = (...permissions: string[]) => { ... }

// Require specific role
export const requireRole = (...roles: string[]) => { ... }

// Shorthand helpers
export const requireAdmin = { ... }
export const requireManager = { ... }
```

### Usage Pattern

```typescript
// Protect specific endpoints
app.post('/api/users',
  requirePermission('manage_users'),
  createUserController
);

app.delete('/api/webhooks/:id',
  requirePermission('manage_webhooks'),
  deleteWebhookController
);

// Multiple permissions (any)
app.get('/api/reports/financial',
  requireAnyPermission('view_reports', 'manage_finance'),
  getFinancialReportController
);
```

### Behavior

1. Middleware checks if user exists
2. Middleware checks if user has required permission(s)
3. If authorized → calls `next()` to continue
4. If not authorized → sends 403 Forbidden response
5. Request never reaches controller without proper authorization

### Decision Impact
- Authorization checked at route level (defense in depth)
- Controllers assume they're already authorized
- Easy to audit which routes require which permissions
- Prevents accidental access by missing controller-level checks

---

## 6. Service-Controller-Route Layer Pattern

### Decision
Enforce strict separation of concerns: **Routes** → **Controllers** → **Services** → **Database**

```
HTTP Request
    ↓
Route Definition (endpoint path, method, middleware)
    ↓
Validation Middleware (Zod schemas)
    ↓
Permission Middleware (auth guards)
    ↓
Controller (extract params, call service, format response)
    ↓
Service (business logic, database queries, external APIs)
    ↓
Database/External APIs
```

### File Organization

```
backend/src/
├── routes/              # Route definitions
│   ├── authRoutes.ts
│   ├── userRoutes.ts
│   ├── volunteerRoutes.ts
│   └── ...
├── controllers/         # Request handlers
│   ├── authController.ts
│   ├── userController.ts
│   ├── volunteerController.ts
│   └── ...
├── services/           # Business logic
│   ├── authService.ts
│   ├── userService.ts
│   ├── volunteerService.ts
│   └── ...
├── middleware/         # Cross-cutting concerns
│   ├── authGuards.ts
│   ├── permissions.ts
│   ├── zodValidation.ts
│   └── rateLimiter.ts
```

### Responsibility Boundaries

**Routes:** What endpoints exist, which middleware applies
```typescript
app.post(
  '/api/users',
  validateBody(createUserSchema),
  requirePermission('manage_users'),
  createUserController
);
```

**Controllers:** Extract request data, call services, format responses
```typescript
export const createUserController = async (req: AuthRequest, res: Response) => {
  const userData = req.body; // Already validated
  const user = await userService.create(userData);
  res.json({ success: true, data: user });
};
```

**Services:** Business logic, data operations, external API calls
```typescript
export const userService = {
  async create(userData: CreateUserInput): Promise<User> {
    const existingUser = await db.user.findUnique({ email: userData.email });
    if (existingUser) throw new Error('User already exists');
    
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return db.user.create({
      ...userData,
      password: hashedPassword
    });
  }
};
```

### Decision Impact
- Easy to test services independently
- Controllers stay thin (< 20 lines each)
- Routes are self-documenting (permissions clear from middleware)
- Business logic isolated from HTTP concerns

---

## 7. Database Schema: PostgreSQL with Prisma ORM

### Decision
Use **PostgreSQL** database with **Prisma** object-relational mapper for data persistence.

### Why PostgreSQL
- Strong ACID guarantees (important for financial/donation data)
- JSON support (flexible data for case notes, task details)
- Full-text search (important for volunteer search)
- Mature, widely understood in nonprofit tech

### Why Prisma (over alternatives)
- **Type-safe queries:** TypeScript knows shape of database results
- **Migration system:** Version control for schema changes
- **Schema definition:** Single source of truth (schema.prisma file)
- **Developer tools:** Prisma Studio for visual data browsing
- **Auto-generated client:** Query builder generated from schema

### Data Access Pattern

```typescript
// In services
const user = await prisma.user.findUnique({
  where: { id: userId }
});

const volunteers = await prisma.volunteer.findMany({
  where: { organizationId: orgId },
  include: { assignments: true }
});

const created = await prisma.donation.create({
  data: {
    amount: 10000,
    organizationId: orgId,
    donorId: donor.id
  }
});
```

### Decision Impact
- No raw SQL queries (safer)
- Schema changes tracked in migrations
- Type-safe database access
- Easy to add new database tables

---

## Decision Rationale Summary

These architectural decisions enable:

✅ **Type Safety:** Zod + TypeScript + Prisma validate data at every layer
✅ **Security:** Permission system + auth guards prevent unauthorized access
✅ **Maintainability:** Clear separation of concerns (routes/controllers/services)
✅ **Extensibility:** New features add with schema definitions + controllers
✅ **Testability:** Services have clear inputs/outputs, easy to test
✅ **Developer Experience:** Documentation (schemas) == code (same file)

### When to Revisit These Decisions

- **Validation:** If Zod becomes bottleneck or feature-limited
- **Permissions:** If organization structure becomes more complex than 5 roles
- **Services:** If micro-service architecture needed
- **Database:** If PostgreSQL feature gaps discovered for specific use cases

---

## See Also

- [Security Decisions](./SECURITY_DECISIONS.md) — Authentication, encryption, SSRF protection
- [Planning & Progress](../planning-and-progress.md) — Current development workboard
- [ARCHITECTURE.md](https://github.com/West-Cat-Strategy/nonprofit-manager) — Current architecture documentation
