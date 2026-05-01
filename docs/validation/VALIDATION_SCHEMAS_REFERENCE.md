# Validation Schemas Reference

**Last Updated:** 2026-04-25


**Location**: `backend/src/validations/`  
**Framework**: Zod v4.x (`backend/package.json` currently pins `zod ^4.3.6`)
**Validation File Inventory**: 14 top-level files as of 2026-04-25
**Status**: Reference snapshot; verify on-disk exports and route-local schemas for live coverage

Use the current directory contents plus route-local schemas as the source of truth for active validation coverage. There is no top-level `backend/src/validations/index.ts` barrel in the current tree; import through the configured `@validations/*` alias or relative module paths.

---

## 📁 File Structure

```
backend/src/validations/
├── admin.ts               # Admin validation surfaces
├── auth.ts                # Auth, register, passkey, MFA, and setup validation
├── caseForms.ts           # Case-form validation
├── contact.ts             # Contact validation
├── donation.ts            # Donation validation
├── event.ts               # Event validation
├── grant.ts               # Grant validation
├── outcomeDefinition.ts   # Outcome-definition validation
├── outcomeImpact.ts       # Outcome-impact validation
├── portal.ts              # Portal validation
├── shared.ts              # Shared primitives
├── teamChat.ts            # Team-chat validation
├── user.ts                # User and preference validation
└── volunteer.ts           # Volunteer and volunteer-hours validation
```

---

## 🎯 Quick Usage Guide

### Import Schemas
```typescript
// Single schema
import { registerSchema } from '@validations/auth';

// Multiple schemas
import { createVolunteerSchema, updateVolunteerSchema } from '@validations/volunteer';

// There is no top-level @validations barrel; import concrete modules.
```

### Use in Routes (Middleware)
```typescript
import { validateBody } from '@middleware/zodValidation';
import { registerSchema } from '@validations/auth';

router.post(
  '/register',
  validateBody(registerSchema),  // Validates req.body against schema
  registerController
);
```

### Use in Services (Imperative)
```typescript
import { validateDataOrThrow } from '@middleware/zodValidation';
import { createContactSchema } from '@validations/contact';

const result = validateDataOrThrow(createContactSchema, inputData);
// result is now type-safe or throws 400 error
```

### Generate TypeScript Types
```typescript
import { registerSchema } from '@validations/auth';

// Auto-generated type from Zod schema
type RegisterInput = z.infer<typeof registerSchema>;

// Use in function signature
const register = async (data: RegisterInput) => {
  // data is type-safe with all required fields
};
```

---

## 📋 Schemas by Category

### Shared Base Schemas (`shared.ts`)

**Identifiers**:
- `uuidSchema` - UUID validation
- `emailSchema` - Email format with normalization

**Passwords**:
- `passwordSchema` - Strong password (8+ chars, uppercase, lowercase, number, special)
- `weakPasswordSchema` - Basic password (8+ chars)

**Names**:
- `nameSchema` - First/last name (1-100 chars)

**Dates & Times**:
- `dateSchema` - ISO date validation
- `dateTimeSchema` - ISO datetime validation
- `dateRangeSchema` - From/to date validation ensuring startDate ≤ endDate

**Collections**:
- `uuidArraySchema` - Array of UUIDs
- `stringArraySchema` - Array of strings

**Files**:
- `fileUploadSchema` - Single file (max 50MB)
- `fileUploadsSchema` - Multiple files (max 100MB total)

**Pagination**:
- `paginationSchema` - Page/limit with defaults and coercion

**API Responses**:
- `apiResponseSchema` - Standard `{ success, data, error }` format

---

### Authentication Schemas (`auth.ts`)

**Login/Register**:
- `loginSchema` - Email + password
- `registerSchema` - Email + password (confirmed) + name
- `passwordResetRequestSchema` - Email for reset
- `passwordResetConfirmSchema` - Token + new password (confirmed)
- `changePasswordSchema` - Current + new password (confirmed)

**Two-Factor Auth (TOTP)**:
- `twoFactorSetupSchema` - 6-digit code for enabling; accepts legacy `token` and normalizes to `code`
- `twoFactorVerifySchema` - MFA token + 6-digit code for login
- `twoFactorDisableSchema` - Password + 6-digit code to disable; accepts legacy `token` and normalizes to `code`
- `backupCodesSchema` - Array of backup codes

**Passkeys (WebAuthn)**:
- `passkeyRegistrationVerifySchema` - Challenge ID + credential
- `passkeyLoginOptionsSchema` - Email to request login options
- `passkeyLoginVerifySchema` - Email + challenge ID + credential

**Setup**:
- `setupFirstUserSchema` - Email + password + names + org name for initial setup

---

### User Schemas (`user.ts`)

**CRUD**:
- `createUserSchema` - Create new user with email, password, role
- `updateUserSchema` - Update user role and status
- `updateUserProfileSchema` - Update the authenticated staff profile via camelCase fields, including `profilePicture`, notifications, and sharing preferences
- `updateUserPreferencesSchema` - Save user UI preferences

**Queries**:
- `userFilterSchema` - Filter/search users by role, status, created date

**Validation Helpers**:
- Enum: `UserRole` - admin, manager, staff, member, volunteer

---

### Volunteer Schemas (`volunteer.ts`)

**CRUD**:
- `createVolunteerSchema` - Create volunteer with email, name, phone, availability
- `updateVolunteerSchema` - Partial updates (all fields optional)
- `assignVolunteerSchema` - Assign volunteer to event/task

**Queries**:
- `volunteerFilterSchema` - Filter by status, skills, availability, created date

**Validation Helpers**:
- Enum: `VolunteerStatus` - active, inactive, suspended
- Enum: `Availability` - available, limited, unavailable

---

### Event Schemas (`event.ts`)

**CRUD**:
- `createEventSchema` - Title, description, start/end date (with validation), location
- `updateEventSchema` - Partial updates
- `updateEventStatusSchema` - Change status and mark complete

**Queries**:
- `eventFilterSchema` - Filter by status, date range, location

**Validation Helpers**:
- Enum: `EventStatus` - scheduled, in_progress, completed, cancelled
- Date validation ensures end_date > start_date

---

### Contact Schemas (`contact.ts`)

**CRUD**:
- `createContactSchema` - Contact info: type, relationship, email, phone
- `updateContactSchema` - Partial updates
- `createBulkContactsSchema` - Import multiple contacts

**Queries**:
- `contactFilterSchema` - Filter by type, status, organization
- `contactSearchSchema` - Full-text search in names, emails

**Validation Helpers**:
- Enum: `ContactType` - personal, professional, emergency, medical
- Enum: `ContactStatus` - active, inactive, archived

---

### Donation Schemas (`donation.ts`)

**CRUD**:
- `createDonationSchema` - Amount, type, payment method, date received
- `updateDonationSchema` - Partial updates with financial validation
- `createRecurringDonationSchema` - Recurring donation setup

**Queries**:
- `donationFilterSchema` - Filter by status, type, date range, amount range
- `donationReportSchema` - Aggregation parameters for reports

**Validation Helpers**:
- Enum: `DonationType` - cash, check, credit_card, wire_transfer, stock, in_kind
- Enum: `DonationStatus` - pending, confirmed, received, cancelled
- Payment method validation
- Amount validation (must be > 0)

---

### Case And Task Route Schemas

Case-form validation lives in `caseForms.ts`; broader case lifecycle, reassessment, queue-view, and task validation is route/module-local in the current modular backend. When updating case or task contracts, verify the owning route files under `backend/src/modules/cases/**` and `backend/src/modules/tasks/**` instead of expecting `case.ts` or `task.ts` in `backend/src/validations/`.

---

## 🔧 Advanced Usage

### Composing Schemas

**Extend a schema**:
```typescript
// Add or override fields
const extendedSchema = twoFactorVerifySchema.extend({
  email: emailSchema, // Add new field
});
```

**Merge schemas**:
```typescript
// Combine multiple schemas
const combinedSchema = updateVolunteerSchema.merge(
  updateVolunteerAvailabilitySchema
);
```

**Create variants**:
```typescript
// Reuse base with tweaks
const adminCreateUserSchema = createUserSchema.extend({
  role: z.enum(['admin', 'manager']), // Restrict roles
});

const userCreateUserSchema = createUserSchema.extend({
  role: z.literal('volunteer'), // Single role
  skip_verification: z.boolean().default(false),
});
```

### Error Handling

**In middleware (automatic)**:
```typescript
// validateBody() middleware catches errors and responds with 400
// Zod error format: { [fieldName]: [errorMessages...] }
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "validation_error",
    "details": {
      "email": ["Invalid email format"],
      "password": ["Must be at least 8 characters"]
    }
  }
}
```

**In services (manual)**:
```typescript
const { success, data, errors } = validateData(schema, input);

if (!success) {
  return {
    success: false,
    error: {
      message: 'Invalid input',
      code: 'validation_error',
      details: errors, // { fieldName: [errors...] }
    },
  };
}

// Safe to use data
```

### Type Safety

**Infer types from schemas**:
```typescript
import { z } from 'zod';
import { createVolunteerSchema } from '@validations/volunteer';

// Automatic type generation
type CreateVolunteerInput = z.infer<typeof createVolunteerSchema>;

// Use in functions
function createVolunteer(data: CreateVolunteerInput): Promise<Volunteer> {
  // data has full type information
  // autocomplete works for all fields
}
```

**Validate against types**:
```typescript
// TypeScript ensures type matches schema
const input: CreateVolunteerInput = {
  email: 'volunteer@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  phone: '555-0123',
  availability: 'available',
  // Missing 'status'? → TypeScript error
};
```

---

## 🧪 Testing Schemas

**Unit tests** are in `backend/src/__tests__/unit/validations/schemas.test.ts`

**Run tests**:
```bash
npm test -- schemas.test.ts
## or
npm test -- src/__tests__/unit/validations/schemas.test.ts
```

**Add tests for new schemas**:
```typescript
describe('createContactSchema', () => {
  it('should validate correct contact data', () => {
    const result = createContactSchema.safeParse({
      type: 'personal',
      relationship: 'friend',
      email: 'contact@example.com',
      phone: '555-0123',
    });
    
    expect(result.success).toBe(true);
  });

  it('should reject invalid contact type', () => {
    const result = createContactSchema.safeParse({
      type: 'invalid',
      email: 'contact@example.com',
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.type).toBeDefined();
  });
});
```

---

## 📊 Schema Statistics

| Category | Files | Purpose |
|----------|-------|---------|
| Shared | `shared.ts` | Base primitives reused by validation modules |
| Auth and user | `auth.ts`, `user.ts`, `admin.ts` | Login, MFA/passkeys, setup, user/admin settings |
| People, volunteer, and engagement | `contact.ts`, `volunteer.ts`, `event.ts`, `teamChat.ts`, `portal.ts` | Contact, volunteer, event, team-chat, and portal validation |
| Fundraising and grants | `donation.ts`, `grant.ts` | Donation and grant-facing validation helpers |
| Case outcomes and forms | `caseForms.ts`, `outcomeDefinition.ts`, `outcomeImpact.ts` | Case-form and outcome-related validation |
| **TOTAL** | **14** | **Shared validation modules; route-local schemas also exist outside this directory** |

---

## 🚀 Migration Guide

**Moving from express-validator to Zod**:

### Step 1: Replace validation chains
```typescript
// BEFORE
router.post('/create', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({min: 8}),
  body('name').trim().notEmpty(),
  validateRequest,
], handler);

// AFTER
import { validateBody } from '@middleware/zodValidation';
import { createUserSchema } from '@validations/user';

router.post('/create', 
  validateBody(createUserSchema),
  handler
);
```

### Step 2: Update controller
```typescript
// BEFORE - Manual validation in controller
export const createUser = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors });
  }
  const { email, password, name } = req.body;
  // ...
};

// AFTER - Validation already done in middleware
export const createUser = (req, res) => {
  const { email, password, name } = req.body; // Already type-safe
  // ...
};
```

### Step 3: Add permission checks (optional)
```typescript
import { requirePermission, Permission } from '@middleware/permissions';

router.post('/create',
  authenticate,
  requirePermission(Permission.USER_CREATE),
  validateBody(createUserSchema),
  handler
);
```

---

## ✅ Checklist for New Routes

When adding a new route:

- [ ] Create or find schema in `backend/src/validations/`
- [ ] Import schema: `import { routeSchema } from '@validations/domain'`
- [ ] Import middleware: `import { validateBody } from '@middleware/zodValidation'`
- [ ] Add to route: `router.post('/path', validateBody(routeSchema), handler)`
- [ ] Remove express-validator chains
- [ ] Run `npm test -- schemas.test.ts` - verify tests pass
- [ ] Run `npm run type-check` - verify no TS errors
- [ ] Controller receives pre-validated `req.body`
- [ ] Update any error handling if needed

---

## 🔗 Related Files

- **Middleware**: `backend/src/middleware/zodValidation.ts` - Validation middleware
- **Services**: `backend/src/services/authGuardService.ts` - Authorization
- **Middleware**: `backend/src/middleware/permissions.ts` - Permission enforcement
- **Utils**: `backend/src/utils/permissions.ts` - Permission matrix
- **Routes**: `backend/src/modules/auth/routes/index.ts` - Canonical auth-route validation surface
- **Tests**: `backend/src/__tests__/unit/validations/schemas.test.ts` - Test patterns

---

## 📚 Documentation

- **Phase 1 Completion**: [PHASE_1_COMPLETION_SUMMARY.md](../phases/archive/PHASE_1_COMPLETION_SUMMARY.md)
- **Phase 1 Migration Guide**: [PHASE_1_MIGRATION_GUIDE.md](../phases/archive/PHASE_1_MIGRATION_GUIDE.md)
- **Phase 1 Quick Reference (archived)**: [Quick Reference Archive](../quick-reference/archive/README.md)
- **Phase 2 Completion**: [PHASE_2_COMPLETION_SUMMARY.md](../phases/archive/PHASE_2_COMPLETION_SUMMARY.md)
- **Phase 2 Next Steps**: [PHASE_2_NEXT_STEPS.md](../phases/archive/PHASE_2_NEXT_STEPS.md)

---

## ❓ FAQ

**Q: Do I need to define types manually?**  
A: No! `z.infer<typeof schema>` generates TypeScript types automatically from Zod schemas.

**Q: What if I need custom validation?**  
A: Use `.refine()` on schemas:
```typescript
const schema = z.object({
  password: passwordSchema,
  password_confirm: z.string(),
}).refine(
  (data) => data.password === data.password_confirm,
  { message: 'Passwords must match', path: ['password_confirm'] }
);
```

**Q: How do I handle optional fields?**  
A: Use `.optional()` on field schemas:
```typescript
const schema = z.object({
  email: emailSchema,
  phone: z.string().optional(), // Makes field optional
});
```

**Q: Can I use the same schema for create and update?**  
A: Yes! Use `.extend()` or `.partial()`:
```typescript
const createSchema = z.object({ email, password });
const updateSchema = createSchema.partial(); // All fields optional
```

**Q: What format should validation errors follow?**  
A: Use the standardized format automatically:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "validation_error",
    "details": {
      "fieldName": ["error message", "another error"]
    }
  }
}
```

---

**Status**: ✅ Complete, production-ready, all tests passing  
**Last Updated**: 2026-03-19  
**Maintained By**: Development Team
