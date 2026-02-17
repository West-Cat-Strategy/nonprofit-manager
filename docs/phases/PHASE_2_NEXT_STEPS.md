# Phase 2 Next Steps - Quick Start Guide

**Phase 2.1-2.5 COMPLETE** ✅ → Ready for Phase 2.6+

---

## What's Been Done

### Phase 2.1-2.5 Deliverables (Completed This Session)
- ✅ 24 new validation schemas (contact, donation, case, task, auth enhancements)
- ✅ 100% auth routes migrated to Zod (12/12 endpoints)
- ✅ Advanced rate limiting middleware created & integrated
- ✅ TypeScript path aliases configured (@validations)
- ✅ All tests passing (21/21), zero compilation errors

**Documentation**: See [PHASE_2_COMPLETION_SUMMARY.md](./PHASE_2_COMPLETION_SUMMARY.md)

---

## What's Next: Phase 2.6+ Roadmap

### Phase 2.6: Auth Controller Updates (RECOMMENDED NEXT)
**Effort**: ~1-2 hours  
**Impact**: High - Enables permission checks in auth operations  
**Status**: Ready to start

#### Changes Needed:
1. Import auth guards in `backend/src/controllers/authController.ts`
   ```typescript
   import { requireUserOrError, requirePermissionOrError } from '@services/authGuardService';
   ```

2. Update protected controller functions (login, register, etc.):
   ```typescript
   // For authenticated endpoints:
   const guardResult = requireUserOrError(req);
   if (!guardResult.success) {
     return forbidden(res, guardResult.error?.message);
   }
   const user = guardResult.user!;
   
   // For permission checks:
   const permResult = requirePermissionOrError(Permission.VOLUNTEER_CREATE);
   if (!permResult.success) {
     return forbidden(res, permResult.error?.message);
   }
   ```

3. Affected functions (~8-10 functions):
   - `register()` - validate no duplicate accounts during setup
   - `login()` - permission to authenticate
   - `setupFirstUser()` - permission to set up organization
   - `completeTotpLogin()` - permission to use 2FA
   - `changePassword()` - permission to change own password
   - `updateProfile()` - permission to update own profile
   - Profile/preference functions - permission to modify own data

---

### Phase 2.7: Volunteer Routes Migration (RECOMMENDED AFTER 2.6)
**Effort**: ~2-3 hours  
**Impact**: High - Follows established pattern  
**Status**: Ready to start (depends on 2.6)

#### Pattern to Apply:
1. Create `backend/src/validations/volunteer.ts` _**(already exists FROM PHASE 1)**_
2. Import Zod schemas in `backend/src/routes/volunteer.ts`
3. Replace express-validator chains with `validateBody(schema)`
4. Apply permission middleware via `requirePermission(Permission.VOLUNTEER_*)`
5. Integrate rate limiting for create/update/delete operations

#### Example:
```typescript
// OLD (multiple body() chains):
router.post('/create',
  authenticate,
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('email').isEmail(),
  validateRequest,
  handler
);

// NEW (Zod validation):
router.post('/create',
  authenticate,
  requirePermission(Permission.VOLUNTEER_CREATE),
  validateBody(createVolunteerSchema),
  handler
);
```

---

### Phase 2.8: Contact Routes Migration
**Effort**: ~2 hours  
**Pattern**: Same as volunteer routes  
**Status**: Ready (depends on 2.7 pattern)

**Schemas**: `backend/src/validations/contact.ts` ✅ (already created)

---

### Phase 2.9: Donation Routes Migration
**Effort**: ~2 hours  
**Pattern**: Same as volunteer routes  
**Status**: Ready (depends on 2.7 pattern)

**Schemas**: `backend/src/validations/donation.ts` ✅ (already created)

---

### Phase 2.10: Error Response Standardization
**Effort**: ~1 hour  
**Impact**: Consistency across entire API  
**Status**: Ready to start (independent of other 2.6+ tasks)

#### Goal: All responses follow format
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}
```

#### Changes Needed:
1. Update `backend/src/utils/responseHelpers.ts` to include `success` flag
2. Audit all controllers to ensure `success: true/false` is set
3. Ensure all error responses include error code and message
4. Test with sample request → response cycles

---

### Phase 2.11: Integration Tests for Phase 2
**Effort**: ~2 hours  
**Pattern**: Use Jest + supertest  
**Status**: Ready to start (independent)

#### Test Coverage:
1. **Rate Limiting Tests**:
   - Login endpoint: 5th attempt fails, 6th blocked
   - Registration: 3 per hour limit enforced
   - Passkey operations: limited appropriately

2. **Zod Validation Tests**:
   - Invalid email format rejected
   - Weak password rejected
   - Missing required fields rejected
   - Schema composition (extends) works

3. **Permission Middleware Tests**:
   - Authenticated user can access protected endpoints
   - Unauthenticated user gets 401
   - User without permission gets 403
   - Permission check includes correct error details

4. **Auth Guard Tests**:
   - `requireUserOrError()` returns user or error
   - `requirePermissionOrError()` checks RBAC matrix
   - Guards work with various role/permission combinations

---

## Recommended Execution Order

```
Phase 2.6: Auth Controller Updates (1-2 hrs)
    ↓
Phase 2.7: Volunteer Routes (2-3 hrs) - uses guard pattern
    ↓
Phase 2.8-2.9: Other Routes (2-2 hrs each) - follows 2.7 pattern
    ↓
Phase 2.10: Error Standardization (1 hr) - polish pass
    ↓
Phase 2.11: Integration Tests (2 hrs) - comprehensive coverage
```

**Total**: ~10-14 hours of focused work
**Outcome**: Fully validated, permissioned, tested backend

---

## Quick Checklist for Each Route Migration

When migrating route files like volunteer, contact, donation, etc.:

- [ ] Import Zod schemas from `@validations`
- [ ] Import permission middleware from `@middleware/permissions`
- [ ] Import auth guards if protected endpoints need additional checks
- [ ] Remove `express-validator` imports (body, query, param)
- [ ] Remove `validateRequest` middleware calls
- [ ] Replace validation chains with `validateBody(schema)` calls
- [ ] Add `requirePermission()` middleware before handler (if needed)
- [ ] Run `npm run type-check` to verify no TypeScript errors
- [ ] Run `npm test` to ensure no regressions
- [ ] Update route comments if validation changed
- [ ] Commit with task ID: `feat(P2-T7): migrate volunteer routes to Zod`

---

## Files You'll Need to Touch

### Phase 2.6 (Auth Controller)
```
backend/src/controllers/authController.ts
backend/src/services/authGuardService.ts (for imports)
```

### Phase 2.7-2.9 (Route Migrations)
```
backend/src/routes/volunteer.ts
backend/src/routes/contact.ts
backend/src/routes/donation.ts
backend/src/routes/case.ts
backend/src/routes/task.ts
backend/src/validations/*.ts (import only)
backend/src/middleware/permissions.ts (import only)
```

### Phase 2.10 (Error Standardization)
```
backend/src/utils/responseHelpers.ts
backend/src/**/*Controller.ts (audit only)
```

### Phase 2.11 (Tests)
```
backend/src/__tests__/integration/auth.test.ts (create)
backend/src/__tests__/integration/volunteer.test.ts (create)
backend/src/__tests__/unit/middleware/rateLimiting.test.ts (create)
```

---

## Already-Ready Infrastructure

You don't need to create these - they exist and work:

✅ `backend/src/validations/` - All 9 files with 38+ schemas  
✅ `backend/src/utils/permissions.ts` - 45+ permissions, 5 roles  
✅ `backend/src/services/authGuardService.ts` - 10+ guard functions  
✅ `backend/src/middleware/zodValidation.ts` - Validation middleware  
✅ `backend/src/middleware/permissions.ts` - Permission middleware  
✅ `backend/src/middleware/rateLimitAdvanced.ts` - Rate limiting  
✅ `backend/tsconfig.json` - Path aliases configured  
✅ `backend/src/__tests__/unit/validations/schemas.test.ts` - 21 passing tests  

---

## Example: Volunteer Route Migration (Full)

### Before:
```typescript
import { body } from 'express-validator';
import { validateRequest } from '@middleware/domains/security';

router.post('/create',
  authenticate,
  [
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('phone').optional().trim(),
    validateRequest,
  ],
  createVolunteer
);
```

### After:
```typescript
import { validateBody } from '@middleware/zodValidation';
import { createVolunteerSchema } from '@validations/volunteer';
import { requirePermission, Permission } from '@middleware/permissions';

router.post('/create',
  authenticate,
  requirePermission(Permission.VOLUNTEER_CREATE),
  validateBody(createVolunteerSchema),
  createVolunteer
);
```

**Result**: 
- 8 lines → 2 lines middleware
- Self-documenting schema definition
- Type-safe request body
- Permission-gated endpoint
- Better error messages

---

## Know Before You Start

1. **Import paths must match tsconfig.json**: `@validations`, `@middleware`, `@services`, `@utils`
2. **Zod schemas compose**: Use `.extend({ ... })` to add fields to existing schemas
3. **Permission checks are optional**: Not all endpoints need `requirePermission()`, but authentication-required ones should have at least `requireUserOrError()`
4. **Rate limiting is already applied**: Don't add it again - it's already in routes like /login, /register
5. **Tests validate schemas work**: If schema tests pass, the schema is correct - just apply it to routes

---

## Success Criteria

- [ ] All 12+ auth routes use Zod validation
- [ ] All volunteer routes use Zod + permission checks
- [ ] All other domain routes (contact, donation, case, task) migrated
- [ ] Error responses consistent across all endpoints
- [ ] Zero TypeScript errors in routes/
- [ ] 100% of validation tests passing
- [ ] Integration tests for rate limiting pass
- [ ] Integration tests for permissions pass
- [ ] All changes committed with task IDs in commit messages

---

## Need Help?

**Reference the Phase 1 docs** in repo:
- `PHASE_1_QUICK_REFERENCE.md` - 10 code examples
- `PHASE_1_MIGRATION_GUIDE.md` - Step-by-step walkthrough
- `PHASE_1_FINAL_SUMMARY.md` - Architecture overview

**Pattern examples in this file** - Above section "Example: Volunteer Route Migration"

**Pre-existing working code**:
- Auth routes (12 endpoints) fully migrated - see `backend/src/routes/auth.ts`
- Validation schemas all working - see `backend/src/validations/`
- Tests all passing - run `npm test -- schemas.test.ts`

---

**Ready to proceed?** Pick Phase 2.6 (Auth Controller) as next task!
