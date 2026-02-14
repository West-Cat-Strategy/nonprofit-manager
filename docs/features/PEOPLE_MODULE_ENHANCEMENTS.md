# People Module - Refactor, Enhance & Extend Plan

## Current State Summary

The people module manages three main entities:
- **Volunteers**: With skills, availability, background checks, assignments
- **Accounts**: Organization/company entities
- **Contacts**: Individual people tied to accounts

### Current Implementation
- **Frontend**: React pages with basic Redux state management, standard UI with some neo-brutalist components
- **Backend**: Express services with PostgreSQL, parameterized queries, pagination support
- **Architecture**: RESTful API, proper error handling, modular services

---

## Phase 1: UI/UX Improvements & Standardization

### 1.1 Component Standardization
**Goal**: Consistent, modern UI across all people module pages

#### Implementation Tasks:
1. **Create reusable list wrapper component** (`BrutalListContainer`)
   - Standardized header with title, description, and action button
   - Consistent filter/search bar styling
   - Unified pagination component
   - Empty state handling with setup guidance
   - Loading skeleton option

2. **Standardize all list pages**:
   - VolunteerList
   - AccountList
   - ContactList
   - Apply consistent styling, spacing, responsive design

3. **Create detail page wrapper** (`BrutalDetailContainer`)
   - Unified header with breadcrumb, title, edit button
   - Tab navigation component
   - Consistent card layouts
   - Sidebar for metadata/stats

4. **Implement form component library**
   - BrutalFormInput
   - BrutalFormSelect
   - BrutalFormCheckbox
   - BrutalFormDatepicker
   - BrutalMultiSelect
   - BrutalTagInput

### 1.2 Enhanced Navigation & Discovery
1. **Quick Filter Panel** - Collapsible sidebar with saved filters
2. **Breadcrumb Navigation** - Consistent across all detail pages
3. **Recent Items** - Quick access to recently viewed people
4. **Quick Actions Menu** - Right-click context menu with key actions

### 1.3 Mobile Responsiveness Improvements
1. Optimize layout for small screens
2. Collapsible filters on mobile
3. Simplified table view with card layout alternative
4. Touch-friendly action buttons

---

## Phase 2: Advanced Filtering & Search

### 2.1 Enhanced Search
1. **Multi-field search** (already exists, improve UX)
2. **Smart search suggestions** - As-you-type filtering
3. **Saved searches** - Store and reuse filter combinations
4. **Search history** - Quick access to recent searches

### 2.2 Advanced Filters
Implement per-entity filter combinations:
- **Volunteers**: Skills (multi-select), availability, background check status, hours range, date ranges
- **Accounts**: Type, category, relationship status (customer, partner, donor)
- **Contacts**: Role (staff/volunteer/board), account, tags, date ranges, activity status

### 2.3 Filter UI Enhancements
1. **Filter builder** - Visual interface to construct complex filters
2. **Filter presets** - Common filter combinations
3. **Date range pickers** - For date-based filtering
4. **Tag-based filtering** - For custom categorization

---

## Phase 3: Bulk Operations & Batch Actions

### 3.1 Bulk Delete
- Checkbox selection on list pages
- Confirm dialog with safe deletion
- Undo capability (soft delete / restore)

### 3.2 Bulk Edit
- Select multiple records
- Update common fields in bulk (status, tags, availability)
- Batch skill assignment for volunteers

### 3.3 Bulk Export
- CSV export of selected records or filtered results
- Configurable column selection
- Multiple format support (CSV, Excel planned)

### 3.4 Bulk Import
- CSV import for creating/updating records
- Validation and error reporting
- Preview before import
- Rollback on errors

---

## Phase 4: Advanced Features

### 4.1 Timeline & Activity Tracking
1. **Activity Log**:
   - Created, updated, deleted events
   - Assignment history
   - Status changes
   - Notes/comments timeline

2. **Audit Trail**: Who made what changes and when

### 4.2 Skills Management Enhancement
1. **Skill Library** - Centralized list of available skills
2. **Skill Matching** - Match volunteers to roles/events by skills
3. **Skill Levels** - Beginner/Intermediate/Expert
4. **Skill Endorsements** - Track & verify skills

### 4.3 Relationship Mapping
1. **Connection Graph** - Visualize relationships between people
2. **Account Org Chart** - Show contact hierarchy within accounts
3. **Team/Group Management** - Organize volunteers into teams

### 4.4 Communication Features
1. **Bulk Email Templates** - Send to selected volunteers
2. **SMS Notifications** - When integrated
3. **Communication History** - Track emails, messages sent to each person
4. **Availability Alerts** - Notify when volunteers become available

### 4.5 Performance & Analytics
1. **Volunteer Performance Metrics**:
   - Hours comparison
   - Participation rate
   - Skills utilization
   - Retention rate

2. **Account Metrics**:
   - Contact count
   - Activity level
   - Engagement score

---

## Phase 5: Code Quality & Refactoring

### 5.1 Backend Service Refactoring
1. **Split Large Services**:
   - `contactService.ts` (624 lines) → Split into:
     - `contactCRUDService.ts` - Basic CRUD
     - `contactSearchService.ts` - Search & filtering
     - `contactBulkService.ts` - Bulk operations
   
   - `volunteerService.ts` (516 lines) → Split into:
     - `volunteerCRUDService.ts`
     - `volunteerSkillService.ts`
     - `volunteerAssignmentService.ts`
     - `volunteerAvailabilityService.ts`

2. **Extract Common Patterns**:
   - Create `baseService.ts` abstract class
   - Reusable filter building logic
   - Pagination utilities
   - Validation helpers

3. **Error Handling**:
   - Custom error classes (ValidationError, NotFoundError, etc.)
   - Consistent error response format
   - Better error messages

### 5.2 Frontend Architecture
1. **Custom Hooks**:
   - `useFilteredList()` - Reusable filtering logic
   - `usePagination()` - Pagination state management
   - `useBulkSelect()` - Checkbox selection logic
   - `useImportExport()` - Import/export functionality

2. **Utility Functions**:
   - Formatting utilities (name, phone, etc.)
   - Validation functions
   - Data transformation utilities

3. **Component Composition**:
   - Extract inline components to separate files
   - Create reusable filter components
   - Form field components

### 5.3 Type Safety Improvements
1. Ensure all API responses are properly typed
2. Remove `any` types
3. Create strict DTOs for all endpoints
4. Add runtime validation (Zod/Joi)

---

## Implementation Priority

### High Priority (Week 1-2)
1. ✅ UI component standardization (Lists, Details, Forms)
2. Advanced filtering UI
3. Bulk operations (select, delete, export)
4. Form validation improvements

### Medium Priority (Week 3-4)
1. Import/export functionality
2. Activity log/timeline
3. Skills management enhancements
4. Service refactoring

### Lower Priority (Future)
1. Relationship mapping/visualization
2. Analytics/performance metrics
3. Communication features
4. Advanced search presets

---

## File Structure Changes

```
frontend/src/
├── components/
│   ├── people/                          [NEW]
│   │   ├── PeopleListContainer.tsx      [NEW - wrapper for list pages]
│   │   ├── PeopleDetailContainer.tsx    [NEW - wrapper for detail pages]
│   │   ├── FilterPanel.tsx              [NEW - advanced filter UI]
│   │   ├── BulkActionBar.tsx            [NEW - selection & bulk actions]
│   │   ├── ActivityTimeline.tsx         [NEW]
│   │   └── SkillsDisplay.tsx            [ENHANCE]
│   ├── forms/                           [NEW]
│   │   ├── ImportExportModal.tsx        [NEW]
│   │   └── SavedSearchDialog.tsx        [NEW]
│   └── neo-brutalist/                   [ENHANCE]
│       └── Add missing form components

├── hooks/                               [NEW]
│   ├── useBulkSelect.ts                 [NEW]
│   ├── useFiltering.ts                  [NEW]
│   ├── useImportExport.ts               [NEW]
│   └── useSavedSearches.ts              [NEW]

├── pages/people/
│   ├── volunteers/
│   │   ├── VolunteerList.tsx            [REFACTOR - use new containers]
│   │   ├── VolunteerDetail.tsx          [REFACTOR]
│   │   ├── VolunteerCreate.tsx          [ENHANCE]
│   │   └── VolunteerEdit.tsx            [ENHANCE]
│   ├── accounts/                        [Similar refactoring]
│   └── contacts/                        [Already has better styling]

└── store/slices/
    ├── volunteersSlice.ts               [REFACTOR - split concerns]
    ├── accountsSlice.ts                 [REFACTOR]
    ├── contactsSlice.ts                 [REFACTOR]
    └── peopleSlice.ts                   [NEW - shared people operations]

backend/src/
├── services/
│   ├── volunteer/                       [NEW - folder]
│   │   ├── volunteerService.ts          [REFACTORED from main file]
│   │   ├── volunteerSkillService.ts     [NEW]
│   │   ├── volunteerAssignmentService.ts [NEW]
│   │   └── volunteerBulkService.ts      [NEW]
│   ├── contact/                         [NEW - folder]
│   └── account/                         [NEW - folder]
│   └── common/                          [NEW - shared utilities]
│       ├── baseService.ts               [NEW]
│       ├── filterBuilder.ts             [NEW]
│       └── importExportService.ts       [NEW]

├── controllers/
│   ├── volunteer/                       [NEW - folder for organization]
│   │   ├── volunteerController.ts
│   │   └── volunteerBulkController.ts   [NEW]
│   └── ...

└── types/
    ├── volunteer.ts                     [ENHANCE]
    ├── account.ts                       [ENHANCE]
    └── contact.ts                       [ENHANCE]
```

---

## Success Metrics

- UX Improvement: Consistent, responsive UI across all people pages
- Feature Expansion: Support filtering, bulk ops, import/export
- Code Quality: Improved maintainability, reduced duplication
- Performance: Faster list operations, better caching
- User Satisfaction: Faster workflows, fewer clicks to accomplish tasks

---

## Notes

- Maintain backward compatibility with existing API
- All changes should be tested with unit and integration tests
- Follow existing code style and conventions
- Consider accessibility (WCAG) in UI changes
- Include proper error handling and user feedback
