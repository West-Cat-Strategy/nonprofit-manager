/**
 * QUICK START: Using Phase 1 Tools
 * 
 * Fast reference for implementing the new validation and permission systems
 */

# Phase 1 Quick Reference

## 1. Validating a Request in Routes

### Simple approach - single validation
```typescript
import { Router } from 'express';
import { validateBody } from '@middleware/zodValidation';
import { loginSchema } from '@validations/auth';

const router = Router();

router.post('/login', 
  validateBody(loginSchema),
  loginController
);
// ✅ Request body is validated and parsed automatically
```

### Multiple source validation
```typescript
import { validateInputs } from '@middleware/zodValidation';
import { createVolunteerSchema } from '@validations/volunteer';
import { paginationSchema } from '@validations/shared';

router.post('/volunteers',
  validateInputs(
    createVolunteerSchema,  // body
    undefined,              // query (skip)
    undefined               // params (skip)
  ),
  createVolunteer
);

// Or use convenience functions:
router.get('/volunteers',
  validateQuery(volunteerFilterSchema.merge(paginationSchema)),
  getVolunteers
);
```

---

## 2. Checking Permissions in Routes

### Require a specific permission
```typescript
import { requirePermission } from '@middleware/permissions';
import { Permission } from '@utils/permissions';

router.post('/volunteers',
  authenticate,
  requirePermission(Permission.VOLUNTEER_CREATE),
  createVolunteer
);
```

### Require ANY of multiple permissions
```typescript
router.get('/reports',
  authenticate,
  requireAnyPermission(
    Permission.REPORT_VIEW,
    Permission.ANALYTICS_VIEW
  ),
  getReports
);
```

### Require specific role
```typescript
import { requireRole, requireAdmin, requireManager } from '@middleware/permissions';

router.post('/admin/users',
  authenticate,
  requireAdmin,  // Shorthand for requireRole('admin')
  createUser
);

router.delete('/volunteers/:id',
  authenticate,
  requireManager,  // Shorthand for requireRole('admin', 'manager')
  deleteVolunteer
);
```

---

## 3. Checking Auth in Controllers

### Safe user extraction with guards
```typescript
import { requireUserOrError, requirePermissionOrError } from '@services/authGuardService';
import { Permission } from '@utils/permissions';

export const createVolunteer = async (req: AuthRequest, res: Response) => {
  try {
    // Get current user safely
    const userGuard = requireUserOrError(req);
    if (!userGuard.success) {
      return unauthorized(res, userGuard.error);
    }

    // Check specific permission
    const permGuard = requirePermissionOrError(req, Permission.VOLUNTEER_CREATE);
    if (!permGuard.success) {
      return forbidden(res, permGuard.error);
    }

    // Now safe to use permGuard.user
    const volunteer = await volunteerService.create(
      req.body,
      permGuard.user.id
    );

    res.status(201).json(volunteer);
  } catch (error) {
    next(error);
  }
};
```

### Check organization context
```typescript
import { requireOrganizationOrError } from '@services/authGuardService';

export const getVolunteers = async (req: AuthRequest, res: Response) => {
  const orgGuard = requireOrganizationOrError(req);
  if (!orgGuard.success) {
    return badRequest(res, orgGuard.error);
  }

  // orgGuard.organizationId is safe to use
  const volunteers = await volunteerService.getByOrganization(
    orgGuard.organizationId
  );

  res.json(volunteers);
};
```

---

## 4. Validating Data in Services

### With error handling
```typescript
import { validateData } from '@middleware/zodValidation';
import { createVolunteerSchema } from '@validations/volunteer';

export async function createVolunteer(data: unknown, userId: string) {
  // Validate explicitly in service
  const validation = validateData(createVolunteerSchema, data);
  
  if (!validation.success) {
    const error = new Error(validation.error);
    (error as any).statusCode = 400;
    (error as any).details = validation.errors;
    throw error;
  }

  // Type is narrowed - validated.contact_id etc. are available
  const validated = validation.data;

  const result = await pool.query(
    'INSERT INTO volunteers (contact_id, status) VALUES ($1, $2)',
    [validated.contact_id, validated.status]
  );

  return result.rows[0];
}
```

### Quick validation (throw on error)
```typescript
import { validateDataOrThrow } from '@middleware/zodValidation';

export async function updateVolunteer(id: string, data: unknown) {
  // Throws automatically if validation fails
  const validated = validateDataOrThrow(updateVolunteerSchema, data);

  // TypeScript knows the validated shape
  const result = await pool.query(
    'UPDATE volunteers SET status=$1, bio=$2 WHERE id=$3',
    [validated.status, validated.bio, id]
  );

  return result.rows[0];
}
```

---

## 5. Permission Helpers in Controllers

### Check if user has permission
```typescript
import { hasPermission, isAdmin, canApproveHours } from '@utils/permissions';

export const updateHours = async (req: AuthRequest, res: Response) => {
  const role = req.user?.role;

  // Check specific permission
  if (!hasPermission(role, Permission.HOURS_EDIT)) {
    return forbidden(res, 'Cannot edit hours');
  }

  // Convenience helpers
  if (isAdmin(role)) {
    // Admin-only logic
  }

  if (!canApproveHours(role)) {
    return forbidden(res, 'Cannot approve hours');
  }

  // ... continue with update
};
```

---

## 6. Creating New Validation Schemas

### Follow the pattern
```typescript
// backend/src/validations/contact.ts
import { z } from 'zod';
import { nameSchema, emailSchema, phoneSchema, uuidSchema } from './shared';

// Define status enum
export const contactStatusSchema = z.enum(['active', 'inactive', 'archived']);
export type ContactStatus = z.infer<typeof contactStatusSchema>;

// Define create schema
export const createContactSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  status: contactStatusSchema.default('active'),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

// Define update schema (partial)
export const updateContactSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  status: contactStatusSchema.optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// Define filter schema
export const contactFilterSchema = z.object({
  search: z.string().optional(),
  status: contactStatusSchema.optional(),
});
```

---

## 7. Testing Schemas

```typescript
import { createVolunteerSchema } from '@validations/volunteer';

describe('Volunteer Schema', () => {
  it('should validate correct data', () => {
    const data = {
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'active',
    };

    const result = createVolunteerSchema.safeParse(data);
    expect(result.success).toBe(true);

    if (result.success) {
      // TypeScript knows result.data shape
      expect(result.data.status).toBe('active');
    }
  });

  it('should reject invalid UUID', () => {
    const data = { contact_id: 'not-uuid' };
    const result = createVolunteerSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
```

---

## 8. Permission Matrix

### Available Permissions

**Volunteer Management**
- `VOLUNTEER_VIEW` - View volunteers
- `VOLUNTEER_CREATE` - Create volunteers
- `VOLUNTEER_EDIT` - Edit volunteers
- `VOLUNTEER_DELETE` - Delete volunteers
- `VOLUNTEER_EXPORT` - Export volunteer data

**Hours Management**
- `HOURS_VIEW` - View volunteer hours
- `HOURS_CREATE` - Log volunteer hours
- `HOURS_EDIT` - Edit volunteer hours
- `HOURS_APPROVE` - Approve volunteer hours
- `HOURS_DELETE` - Delete volunteer hours

**Other Domains**
- `EVENT_*` - Event management
- `CASE_*` - Case management
- `CONTACT_*` - Contact management
- `DONATION_*` - Donation management
- `ADMIN_*` - Admin functions
- `ANALYTICS_*` - Analytics access

See `utils/permissions.ts` for complete list.

---

## 9. Role Permissions

| Permission | Admin | Manager | Staff | Member | Volunteer |
|-----------|-------|---------|-------|--------|-----------|
| VOLUNTEER_CREATE | ✅ | ✅ | ✅ | ❌ | ❌ |
| VOLUNTEER_EDIT | ✅ | ✅ | ✅ | ❌ | ❌ |
| HOURS_APPROVE | ✅ | ✅ | ❌ | ❌ | ❌ |
| ADMIN_USERS | ✅ | ❌ | ❌ | ❌ | ❌ |
| DASHBOARD_VIEW | ✅ | ✅ | ✅ | ✅ | ✅ |

See `utils/permissions.ts` for complete matrix.

---

## 10. Error Responses

### Validation error (automatic)
```json
{
  "error": "Validation failed",
  "code": "validation_error",
  "details": {
    "email": ["Invalid email address"],
    "password": [
      "Password must be at least 8 characters",
      "Password must contain at least one uppercase letter"
    ]
  }
}
```

### Permission error
```json
{
  "error": "Permission denied: requires 'volunteer:create'",
  "code": "forbidden"
}
```

### Authorization error
```json
{
  "error": "Unauthorized: No authenticated user",
  "code": "unauthorized"
}
```

---

## Cheat Sheet

```bash
# Run type checking
npm run type-check

# Run validation tests
npm test -- src/__tests__/unit/validations/schemas.test.ts

# Run all tests
npm test

# Lint code
npm run lint

# Start dev server
npm run dev
```

---

## Common Patterns

### Complete CRUD example with validation & permissions

```typescript
// routes/volunteers.ts
router.get('/',
  authenticate,
  validateQuery(volunteerFilterSchema),
  getVolunteers
);

router.post('/',
  authenticate,
  requirePermission(Permission.VOLUNTEER_CREATE),
  validateBody(createVolunteerSchema),
  createVolunteer
);

router.put('/:id',
  authenticate,
  requirePermission(Permission.VOLUNTEER_EDIT),
  validateBody(updateVolunteerSchema),
  updateVolunteer
);

router.delete('/:id',
  authenticate,
  requirePermission(Permission.VOLUNTEER_DELETE),
  deleteVolunteer
);

// controllers/volunteerController.ts
export const createVolunteer = async (req: AuthRequest, res: Response) => {
  try {
    const guard = requirePermissionOrError(req, Permission.VOLUNTEER_CREATE);
    if (!guard.success) {
      return forbidden(res, guard.error);
    }

    // Body is already validated by middleware
    const volunteer = await volunteerService.create(req.body, guard.user.id);
    res.status(201).json(volunteer);
  } catch (error) {
    next(error);
  }
};
```

---

**Questions?** See `PHASE_1_MIGRATION_GUIDE.md` for detailed examples and https://zod.dev for Zod documentation.
