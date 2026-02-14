# Backend Service Refactoring Guide

## Overview
The backend services have grown large and are handling multiple concerns in a single file. This guide proposes refactoring them into smaller, focused services following the Single Responsibility Principle.

## Current Issues

1. **Large Service Files**:
   - `contactService.ts` (624 lines) - Handles all contact operations
   - `volunteerService.ts` (516 lines) - Handles all volunteer operations
   - Code duplication in filtering logic
   - Mixed concerns (CRUD, search, filtering, bulk operations)

2. **Code Duplication**:
   - Similar filtering patterns repeated
   - Pagination logic duplicated
   - Sort logic duplicated

## Refactoring Strategy

### 1. Extract Common Patterns

#### Create `baseService.ts`
```typescript
// backend/src/services/common/baseService.ts
export abstract class BaseService {
  protected pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Common filtering logic
  protected buildWhereClause(
    filters: Record<string, any>,
    filterDefs: FilterDefinition[]
  ): { sql: string; values: any[] } { ... }

  // Common pagination logic
  protected getPaginationParams(
    pagination: PaginationParams
  ): { offset: number; limit: number } { ... }

  // Common sort logic
  protected resolveSortColumn(
    sortBy: string,
    columnMap: Record<string, string>,
    defaultColumn: string
  ): { column: string; order: 'ASC' | 'DESC' } { ... }
}
```

#### Create `filterBuilder.ts`
```typescript
// backend/src/services/common/filterBuilder.ts
export class FilterBuilder {
  private conditions: string[] = [];
  private values: any[] = [];
  private paramCounter = 1;

  addCondition(
    field: string,
    operator: 'eq' | 'like' | 'in' | 'date_range',
    value: any
  ): this { ... }

  build(): { sql: string; values: any[] } { ... }
}
```

#### Create `importExportService.ts`
```typescript
// backend/src/services/common/importExportService.ts
export class ImportExportService {
  async importCSV<T>(
    file: Buffer,
    schema: SchemaValidator
  ): Promise<T[]> { ... }

  async exportCSV<T>(
    data: T[],
    columns: (keyof T)[]
  ): Promise<string> { ... }

  validateRowData(row: any, schema: SchemaValidator): ValidationResult { ... }
}
```

### 2. Refactor Volunteer Service

#### Keep: `volunteerService.ts` (CRUD operations only)
```typescript
// 150 lines - basic CRUD
export class VolunteerService {
  async getVolunteers(filters, pagination) { ... }
  async getVolunteerById(id) { ... }
  async createVolunteer(data) { ... }
  async updateVolunteer(id, data) { ... }
  async deleteVolunteer(id) { ... }
}
```

#### New: `volunteerSkillService.ts`
```typescript
// Volunteer skill-related operations
export class VolunteerSkillService {
  async assignSkills(volunteerId, skills) { ... }
  async removeSkill(volunteerId, skill) { ... }
  async searchBySkills(skills, pagination) { ... }
  async getSkillStats() { ... }
  async endorseSkill(volunteerId, skill, endorsedBy) { ... }
}
```

#### New: `volunteerAssignmentService.ts`
```typescript
// Volunteer assignment operations
export class VolunteerAssignmentService {
  async createAssignment(data) { ... }
  async updateAssignment(id, data) { ... }
  async deleteAssignment(id) { ... }
  async getAssignmentsByVolunteer(volunteerId) { ... }
  async logHours(assignmentId, hours) { ... }
}
```

#### New: `volunteerAvailabilityService.ts`
```typescript
// Availability management
export class VolunteerAvailabilityService {
  async updateAvailability(volunteerId, status, notes) { ... }
  async getUnavailableVolunteers(dateRange) { ... }
  async scheduleUnavailability(volunteerId, startDate, endDate, reason) { ... }
}
```

#### New: `volunteerBulkService.ts`
```typescript
// Bulk operations
export class VolunteerBulkService {
  async bulkDelete(ids) { ... }
  async bulkUpdate(ids, updates) { ... }
  async bulkAssignSkills(ids, skills) { ... }
}
```

### 3. Refactor Contact Service

Similar pattern to volunteers:

#### `contactService.ts` (CRUD only)
#### `contactRoleService.ts` (Role management)
#### `contactSearchService.ts` (Advanced search/filtering)
#### `contactBulkService.ts` (Bulk operations)
#### `contactTagService.ts` (Tag management)

### 4. Refactor Account Service

#### `accountService.ts` (CRUD only)
#### `accountContactService.ts` (Contact relationships)
#### `accountBulkService.ts` (Bulk operations)

## Implementation Order

1. **Phase 1: Extract Common Utilities** ✅ (Can be done in parallel)
   - Create `filterBuilder.ts`
   - Create `baseService.ts`
   - Create `importExportService.ts`
   - Create `paginationHelper.ts`
   - Create `sortHelper.ts`

2. **Phase 2: Refactor Existing Services**
   - Update `volunteerService.ts` to extend `BaseService`
   - Update `contactService.ts` to extend `BaseService`
   - Update `accountService.ts` to extend `BaseService`
   - Remove duplicated code

3. **Phase 3: Extract New Services**
   - Create `volunteerSkillService.ts`
   - Create `volunteerAssignmentService.ts`
   - Create `volunteerAvailabilityService.ts`
   - Similar for contacts and accounts

4. **Phase 4: Create Bulk Operation Services**
   - Extract bulk operations to separate files

## Example Refactoring: Volunteer Service

### Before (516 lines)
```typescript
export class VolunteerService {
  async getVolunteers(filters, pagination, scope) { ... } // 40 lines
  async getVolunteerById(id) { ... } // 10 lines
  async createVolunteer(data) { ... } // 20 lines
  async updateVolunteer(id, data) { ... } // 15 lines
  async deleteVolunteer(id) { ... } // 10 lines
  async getVolunteerAssignments(volunteerId) { ... } // 25 lines
  async createAssignment(data) { ... } // 30 lines
  async updateAssignment(id, data) { ... } // 20 lines
  async deleteAssignment(id) { ... } // 10 lines
  async assignSkills(volunteerId, skills) { ... } // 15 lines
  async removeSkill(volunteerId, skill) { ... } // 10 lines
  async searchBySkills(skills, pagination) { ... } // 35 lines
  // ... other methods
}
```

### After
```typescript
// volunteerService.ts (150 lines)
export class VolunteerService extends BaseService {
  async getVolunteers(filters, pagination, scope) { ... }
  async getVolunteerById(id) { ... }
  async createVolunteer(data) { ... }
  async updateVolunteer(id, data) { ... }
  async deleteVolunteer(id) { ... }
}

// volunteerAssignmentService.ts (150 lines)
export class VolunteerAssignmentService extends BaseService {
  async getVolunteerAssignments(volunteerId) { ... }
  async createAssignment(data) { ... }
  async updateAssignment(id, data) { ... }
  async deleteAssignment(id) { ... }
}

// volunteerSkillService.ts (150 lines)
export class VolunteerSkillService extends BaseService {
  async assignSkills(volunteerId, skills) { ... }
  async removeSkill(volunteerId, skill) { ... }
  async searchBySkills(skills, pagination) { ... }
}
```

## Required Changes

### 1. Update Controllers
```typescript
// Before
constructor(volunteerService: VolunteerService) {
  this.volunteerService = volunteerService;
}

routes() {
  router.get('/volunteers', this.getVolunteers);
  router.post('/volunteers', this.createVolunteer);
  router.get('/volunteers/:id/assignments', this.getAssignments); // ❌ Confusing
}

// After - create separate routes or controller methods
export class VolunteerController {
  constructor(
    private volunteerService: VolunteerService,
    private assignmentService: VolunteerAssignmentService,
    private skillService: VolunteerSkillService
  ) {}
}

export class VolunteerAssignmentController {
  constructor(private assignmentService: VolunteerAssignmentService) {}
}

export class VolunteerSkillController {
  constructor(private skillService: VolunteerSkillService) {}
}
```

### 2. Update Container Registration
```typescript
// backend/src/container/providers/serviceProvider.ts

// Create separate providers for each service
container.register('volunteerService', () => new VolunteerService(dbPool));
container.register('volunteerSkillService', () => new VolunteerSkillService(dbPool));
container.register('volunteerAssignmentService', () => new VolunteerAssignmentService(dbPool));
container.register('volunteerBulkService', () => new VolunteerBulkService(dbPool));
```

### 3. Update Routes
```typescript
// Organize routes by domain
// routes/volunteers/index.ts
// routes/volunteers/skills.ts
// routes/volunteers/assignments.ts
```

## Testing Strategy

1. **Unit Tests**: Update to test smaller services in isolation
2. **Integration Tests**: Test service interactions
3. **Contract Tests**: Ensure API contracts remain unchanged

## Migration Path

This is a **non-breaking refactoring**. The API remains the same:
- Existing endpoints stay at same paths
- Response formats unchanged
- Internal refactoring only

## Benefits

✅ **Separation of Concerns**: Each service has one responsibility
✅ **Reusability**: Common logic extracted to base service
✅ **Testability**: Smaller services easier to test
✅ **Maintainability**: Smaller files easier to understand
✅ **Scalability**: Easy to add new services
✅ **Code Reuse**: Common patterns centralized
✅ **Error Handling**: Consistent error handling across services

## Timeline

- **Week 1**: Extract common utilities, refactor existing services
- **Week 2**: Create new specialized services
- **Week 3**: Update controllers and routes
- **Week 4**: Testing and refinement

## Checklist

- [ ] Create `baseService.ts` with common patterns
- [ ] Create `filterBuilder.ts` for reusable filtering
- [ ] Create `sortHelper.ts` for sorting logic
- [ ] Create `paginationHelper.ts` for pagination
- [ ] Refactor `volunteerService.ts` to use BaseService
- [ ] Extract `volunteerSkillService.ts`
- [ ] Extract `volunteerAssignmentService.ts`
- [ ] Extract `volunteerAvailabilityService.ts`
- [ ] Extract `volunteerBulkService.ts`
- [ ] Do same for contact and account services
- [ ] Update controllers
- [ ] Update container registration
- [ ] Update route definitions
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Update API_REFERENCE docs
