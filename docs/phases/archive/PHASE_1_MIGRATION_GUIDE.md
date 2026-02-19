/**
 * Phase 1 Implementation Guide
 * Migration Examples and Best Practices
 *
 * This guide shows how to use the new Zod validation system
 * and permission/auth guard patterns in controllers and routes.
 */

// ============================================================
// EXAMPLE 1: Updating Routes with Zod Validation
// ============================================================

/*
BEFORE (express-validator):
```typescript
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    validateRequest
  ],
  register
);
```

AFTER (Zod):
```typescript
import { validateBody } from '@middleware/zodValidation';
import { registerSchema } from '@validations/auth';

router.post('/register',
  validateBody(registerSchema),
  register
);
```

Benefits:
✓ Cleaner syntax - one schema instead of multiple chains
✓ Type-safe - generatest TypeScript types automatically
✓ Reusable - same schema in frontend and backend
✓ Better error messages - customizable per field
*/

// ============================================================
// EXAMPLE 2: Using Auth Guards in Controllers
// ============================================================

/*
BEFORE (manual checks):
```typescript
export const updateVolunteer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return unauthorized(res, 'Unauthorized');
    }

    const userId = req.user.id;
    const volunteer = await volunteerService.updateVolunteer(
      req.params.id,
      req.body,
      userId
    );
    res.json(volunteer);
  } catch (error) {
    next(error);
  }
};
```

AFTER (using guards):
```typescript
import { requirePermissionOrError, requireOrganizationOrError } from '@services/authGuardService';
import { Permission } from '@utils/permissions';

export const updateVolunteer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check permission
    const permissionGuard = requirePermissionOrError(req, Permission.VOLUNTEER_EDIT);
    if (!permissionGuard.success) {
      return forbidden(res, permissionGuard.error);
    }

    // Check organization
    const orgGuard = requireOrganizationOrError(req);
    if (!orgGuard.success) {
      return badRequest(res, orgGuard.error);
    }

    const volunteer = await volunteerService.updateVolunteer(
      req.params.id,
      req.body,
      permissionGuard.user.id
    );

    res.json(volunteer);
  } catch (error) {
    next(error);
  }
};
```

Benefits:
✓ Reusable guards - use same checks across controllers
✓ Consistent errors - same error format everywhere
✓ Granular permissions - not just roles
✓ Clearer intent - guard functions explain what's required
*/

// ============================================================
// EXAMPLE 3: Using Validation in Services
// ============================================================

/*
BEFORE (no validation in services):
```typescript
async createVolunteer(data: any, userId: string) {
  // Hope the data is valid from controller
  const result = await pool.query(...);
  return result.rows[0];
}
```

AFTER (with validation):
```typescript
import { validateDataOrThrow } from '@middleware/zodValidation';
import { createVolunteerSchema } from '@validations/volunteer';

async createVolunteer(data: unknown, userId: string) {
  // Validate and extract typed data
  const validatedData = validateDataOrThrow(createVolunteerSchema, data);

  // Now TypeScript knows the shape of validatedData
  const result = await pool.query(
    `INSERT INTO volunteers (contact_id, status, bio, skills, ...) 
     VALUES ($1, $2, $3, $4, ...)`,
    [
      validatedData.contact_id,
      validatedData.status,
      validatedData.bio,
      validatedData.skills,
    ]
  );
  return result.rows[0];
}
```

Benefits:
✓ Defense in depth - validate at service layer too
✓ Type safety - TypeScript knows exact shape
✓ Clear contracts - service input types are explicit
*/

// ============================================================
// EXAMPLE 4: Complete Route Migration
// ============================================================

/*
File: backend/src/routes/auth.ts
```typescript
import { Router } from 'express';
import {
  register,
  login,
  changePassword,
} from '@controllers/authController';
import { validateBody } from '@middleware/zodValidation';
import { authenticate } from '@middleware/auth';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '@validations/auth';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

// Protected routes
router.post('/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  changePassword
);

export default router;
```
*/

// ============================================================
// EXAMPLE 5: Adding Permission Checks to Routes
// ============================================================

/*
File: backend/src/routes/volunteers.ts
```typescript
import { Router } from 'express';
import { validateBody, validateQuery } from '@middleware/zodValidation';
import { requirePermission } from '@middleware/permissions';
import { authenticate } from '@middleware/auth';
import {
  createVolunteerSchema,
  updateVolunteerSchema,
  volunteerFilterSchema,
} from '@validations/volunteer';
import { Permission } from '@utils/permissions';
import { 
  getVolunteers,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
} from '@controllers/volunteerController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/volunteers (anyone can view)
router.get('/',
  validateQuery(volunteerFilterSchema),
  getVolunteers
);

// POST /api/volunteers (requires create permission)
router.post('/',
  requirePermission(Permission.VOLUNTEER_CREATE),
  validateBody(createVolunteerSchema),
  createVolunteer
);

// PUT /api/volunteers/:id (requires edit permission)
router.put('/:id',
  requirePermission(Permission.VOLUNTEER_EDIT),
  validateBody(updateVolunteerSchema),
  updateVolunteer
);

// DELETE /api/volunteers/:id (requires delete permission)
router.delete('/:id',
  requirePermission(Permission.VOLUNTEER_DELETE),
  deleteVolunteer
);

export default router;
```

Benefits:
✓ Route-level permission enforcement
✓ Consistent validation across endpoints
✓ Clear endpoint contracts
✓ Easy to audit who can do what
*/

// ============================================================
// EXAMPLE 6: Testing with Zod Schemas
// ============================================================

/*
File: backend/src/__tests__/validations/volunteer.test.ts
```typescript
import { createVolunteerSchema, CreateVolunteerInput } from '@validations/volunteer';

describe('Volunteer Validation Schemas', () => {
  describe('createVolunteerSchema', () => {
    it('should accept valid volunteer data', () => {
      const validData = {
        contact_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        availability_status: 'available',
        skills: ['tutoring', 'mentoring'],
      };

      const result = createVolunteerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        contact_id: 'not-a-uuid',
        status: 'active',
      };

      const result = createVolunteerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidData = {
        contact_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'invalid-status',
      };

      const result = createVolunteerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
```
*/

// ============================================================
// IMPLEMENTATION CHECKLIST
// ============================================================

/*
Phase 1 Completion Checklist:

Validation Schemas: ✅
  ✓ Created /backend/src/validations/ directory structure
  ✓ Created shared.ts with base schemas
  ✓ Created auth.ts with login/register schemas
  ✓ Created user.ts with user management schemas
  ✓ Created volunteer.ts with volunteer schemas
  ✓ Created event.ts with event schemas
  ✓ Created validations/index.ts for exports

Utilities & Middleware: ✅
  ✓ Created utils/permissions.ts with permission matrix
  ✓ Created services/authGuardService.ts with guard helpers
  ✓ Created middleware/zodValidation.ts with validation middleware

Migration Examples:
  ○ Update auth routes to use validateBody(loginSchema)
  ○ Update auth controller to use auth guards
  ○ Update volunteer routes to use Zod validation
  ○ Update volunteer controller to use guards
  ○ Create example tests for new schemas

Next Steps (Phase 2):
  ○ Create remaining domain validation schemas (contact, donation, case, etc.)
  ○ Add rate limiting middleware
  ○ Implement 2FA service
  ○ Create permission middleware for routes
  ○ Migrate additional controllers (20+ more)
  ○ Add comprehensive test suite for validations
  ○ Create frontend integration with Zod types
*/

export {};
