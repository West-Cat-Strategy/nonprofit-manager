# Case Management System

**Nonprofit Manager - Comprehensive CRM Case Management**
**Version:** 1.0
**Created:** February 2, 2026

---

## Overview

The Case Management System provides comprehensive case tracking, intake management, workflow automation, and reporting capabilities. This system supports multiple cases per client, customizable workflows, and complete case lifecycle management.

---

## Key Features

### 1. **Multiple Cases Per Client**
- Clients can have unlimited concurrent cases
- Each case is independently tracked with its own workflow
- Cases can be linked together (related, parent/child, duplicate)
- Full case history per client visible in one view

### 2. **Intake Management**
- Configurable intake forms per case type
- Custom fields storage (JSON-based)
- Source tracking (phone, email, walk-in, referral, web)
- Referral source documentation
- Automated case number generation (CASE-YYMMDD-XXXXX)

### 3. **Case Workflows & Phases**
- 12 pre-configured statuses across 5 phases:
  - **Intake**: Initial assessment
  - **Active**: Working cases (4 states)
  - **Review**: Cases under review (2 states)
  - **Closed**: Completed cases (3 outcomes)
  - **Cancelled**: Cancelled cases
- Customizable status transitions
- Status change tracking with reasons
- Automated status change notifications

### 4. **Case Types**
8 pre-configured case types:
- General Support
- Crisis Intervention
- Counseling
- Legal Assistance
- Housing
- Employment
- Healthcare
- Financial Assistance

Each type supports:
- Custom color coding
- Icon assignment
- Required intake forms
- Average duration tracking
- Custom field definitions

### 5. **Assignment & Routing**
- Assign to individual staff or teams
- Assignment history tracking
- Unassigned case queue
- Workload balancing
- Auto-assignment rules (future)

### 6. **Timeline & Activity Tracking**
- Complete case activity timeline
- Multiple note types:
  - General notes
  - Email logs
  - Call logs
  - Meetings
  - Status updates
- Internal vs client-facing notes
- Important flag for priority items
- File attachments support

### 7. **Document Management**
- Upload case documents
- Document categorization (intake, assessment, consent, etc.)
- Version control
- Confidentiality levels (public, standard, restricted, confidential)
- Access control by role

### 8. **Outcome Tracking**
- Admin-managed outcome definitions (active/inactive, reportable, reorderable)
- Tag case note interactions with one or more outcomes
- Attribution tracking (`DIRECT`, `LIKELY`, `POSSIBLE`)
- Optional intensity scoring (1-5) and evidence notes
- Historical tags are preserved even if a definition is later disabled
- Reporting supports totals, unique impacted clients, and week/month time series

### 9. **Service Tracking**
- Record services provided
- Service categories (counseling, legal, financial, etc.)
- Date/time tracking
- Duration logging
- Cost tracking
- Outcome documentation
- Completion status

### 10. **Milestones & Goals**
- Define case milestones
- Track completion progress
- Due date management
- Sort order configuration
- Progress visualization

### 11. **Reporting & Analytics**
- Case summary dashboard
- Statistics by:
  - Priority (low, medium, high, urgent)
  - Status type (intake, active, review, closed)
  - Case type
  - Assigned staff
- Overdue case tracking
- Cases due this week
- Unassigned cases count
- Average case duration

---

## Database Schema

### Core Tables

#### `cases`
Main case records with:
- Case number, title, description
- Client/contact linkage
- Case type and status
- Priority and urgency flags
- Assignment information
- Dates (intake, opened, closed, due)
- Outcome tracking
- Custom data (JSON)
- Tags for categorization

#### `case_types`
Configurable case categories with:
- Name, description, color, icon
- Custom field definitions
- Intake requirements
- Average duration tracking

#### `case_statuses`
Workflow statuses with:
- Status type (intake, active, review, closed, cancelled)
- Display properties (color, sort order)
- Transition rules
- Reason requirements

#### `case_notes`
Activity timeline with:
- Note type and content
- Internal/external flags
- Status change tracking
- Attachments
- Optional outcome impact tags per note interaction

#### `case_assignments`
Assignment history with:
- From/to user tracking
- Assignment reasons
- Date tracking
- Unassignment logging

#### `case_documents`
Document storage with:
- Document metadata
- File information
- Confidentiality settings
- Version control

#### `case_relationships`
Case linking with:
- Relationship types (duplicate, related, parent/child, etc.)
- Descriptions

#### `case_services`
Service tracking with:
- Service details
- Date/time tracking
- Status and outcome
- Cost tracking

#### `case_milestones`
Goal tracking with:
- Milestone names
- Due and completion dates
- Progress status

#### `outcome_definitions`
Configurable outcomes with:
- Stable key, display name, description, and category
- Active/inactive state (soft lifecycle; no hard delete)
- Reportable toggle
- Sort order for UI and reports

#### `interaction_outcome_impacts`
Interaction-level outcome tags with:
- Foreign key to `case_notes` (interaction anchor)
- Foreign key to `outcome_definitions`
- Attribution enum (`DIRECT`, `LIKELY`, `POSSIBLE`)
- Optional intensity and evidence note
- Unique constraint per `(interaction_id, outcome_definition_id)`

---

## API Endpoints

### Case Management

**GET** `/api/cases`
- List all cases with filtering
- Query params: contact_id, case_type_id, status_id, priority, assigned_to, search, page, limit

**POST** `/api/cases`
- Create new case
- Auto-generates case number
- Creates initial intake note

**GET** `/api/cases/:id`
- Get case details with related data
- Includes contact info, assignment, counts

**PUT** `/api/cases/:id`
- Update case details
- Tracks modification history

**DELETE** `/api/cases/:id`
- Delete case (with cascade to related records)

**PUT** `/api/cases/:id/status`
- Update case status
- Creates status change note
- Validates transitions

### Case Notes

**GET** `/api/cases/:id/notes`
- Get all notes for a case
- Ordered by date (newest first)
- Includes creator information

**POST** `/api/cases/notes`
- Add note to case
- Supports attachments
- Internal/external flag

### Outcomes (Definitions + Interaction Tagging)

**GET** `/api/admin/outcomes?includeInactive=true|false`
- List outcome definitions for admin management

**POST** `/api/admin/outcomes`
- Create a new outcome definition

**PATCH** `/api/admin/outcomes/:id`
- Update outcome definition metadata

**POST** `/api/admin/outcomes/:id/enable`
- Set `is_active=true`

**POST** `/api/admin/outcomes/:id/disable`
- Set `is_active=false`

**POST** `/api/admin/outcomes/reorder`
- Reorder by `orderedIds` transactionally

**GET** `/api/cases/outcomes/definitions`
- List active outcome definitions for case interaction tagging

**GET** `/api/cases/:caseId/interactions/:interactionId/outcomes`
- Load saved outcomes for a specific case note interaction

**PUT** `/api/cases/:caseId/interactions/:interactionId/outcomes`
- Save outcomes for a specific interaction
- Supports `mode=replace|merge`

### Outcomes Reporting

**GET** `/api/reports/outcomes?from=YYYY-MM-DD&to=YYYY-MM-DD&staffId=&interactionType=&bucket=week|month&includeNonReportable=true|false`
- Returns:
  - `totalsByOutcome` (count impacts, unique clients impacted)
  - `timeseries` bucketed by week or month
- `includeNonReportable=true` is admin-only
- `programId` is currently unsupported and returns a validation error

### Metadata

**GET** `/api/cases/types`
- Get all active case types
- Used for dropdowns and filtering

**GET** `/api/cases/statuses`
- Get all active statuses
- Ordered by workflow position

**GET** `/api/cases/summary`
- Get dashboard statistics
- Returns counts by priority, status, type
- Includes overdue and unassigned counts

---

## Usage Examples

### 1. Create a New Case

```javascript
POST /api/cases
{
  "contact_id": "uuid",
  "case_type_id": "uuid",
  "title": "Housing Assistance Request",
  "description": "Client needs temporary housing assistance",
  "priority": "high",
  "source": "phone",
  "referral_source": "Community Outreach Center",
  "assigned_to": "user-uuid",
  "due_date": "2026-03-01",
  "tags": ["housing", "urgent", "family"],
  "intake_data": {
    "household_size": 4,
    "current_situation": "At risk of eviction",
    "income_level": "below_poverty"
  },
  "is_urgent": true
}
```

### 2. List Cases for a Client

```javascript
GET /api/cases?contact_id=uuid&page=1&limit=20

Response:
{
  "cases": [
    {
      "id": "uuid",
      "case_number": "CASE-260202-00123",
      "title": "Housing Assistance Request",
      "status_name": "Active",
      "status_color": "green",
      "priority": "high",
      "contact_first_name": "John",
      "contact_last_name": "Doe",
      "notes_count": 5,
      "documents_count": 3,
      "created_at": "2026-02-02T10:00:00Z"
    }
  ],
  "total": 1,
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### 3. Update Case Status

```javascript
PUT /api/cases/:id/status
{
  "new_status_id": "uuid",
  "reason": "Client provided required documentation",
  "notes": "All intake paperwork received and verified"
}
```

### 4. Add Case Note

```javascript
POST /api/cases/notes
{
  "case_id": "uuid",
  "note_type": "call",
  "subject": "Follow-up call",
  "content": "Spoke with client about housing options. Referred to Oak Street Housing Program.",
  "is_internal": false,
  "is_important": true
}
```

### 5. Get Dashboard Summary

```javascript
GET /api/cases/summary

Response:
{
  "total_cases": 150,
  "open_cases": 120,
  "closed_cases": 30,
  "by_priority": {
    "low": 20,
    "medium": 70,
    "high": 45,
    "urgent": 15
  },
  "by_status_type": {
    "intake": 15,
    "active": 85,
    "review": 20,
    "closed": 28,
    "cancelled": 2
  },
  "cases_due_this_week": 12,
  "overdue_cases": 5,
  "unassigned_cases": 8
}
```

---

## Workflow Examples

### Standard Case Lifecycle

1. **Intake** → Client contacts organization
   - Case created with "Intake" status
   - Intake form completed
   - Initial assessment done

2. **Under Review** → Staff reviews case
   - Eligibility determined
   - Services identified
   - Assignment made

3. **Active** → Services provided
   - Milestones tracked
   - Notes added
   - Documents uploaded
   - Services logged

4. **Ready for Closure** → Case nearing completion
   - Final documentation gathered
   - Outcomes documented

5. **Closed - Successful** → Case completed
   - Outcome recorded
   - Closure reason documented
   - Final notes added

### Multiple Cases Example

**Client: Jane Doe**
- **Case 1**: Housing Assistance (Active)
  - Status: In Progress
  - Priority: Urgent
  - Assigned to: Housing Team

- **Case 2**: Employment Services (Active)
  - Status: Active
  - Priority: Medium
  - Assigned to: Career Coach

- **Case 3**: Financial Counseling (Closed)
  - Status: Closed - Successful
  - Outcome: Budget plan created and implemented

---

## Benefits

### For Staff
- **Centralized Information**: All case data in one place
- **Clear Workflows**: Defined status progressions
- **Reduced Duplication**: Easy to see existing cases
- **Better Collaboration**: Assignment and notes visible to team
- **Improved Accountability**: Full activity tracking

### For Clients
- **Better Service**: Coordinated care across multiple needs
- **Faster Response**: Priority and urgency flags
- **Continuity**: Complete history maintained
- **Transparency**: Clear status and progress

### For Management
- **Performance Metrics**: Dashboard analytics
- **Resource Planning**: Workload visibility
- **Outcome Tracking**: Success measurement
- **Compliance**: Complete documentation
- **Reporting**: Easy data extraction

---

## Integration Points

### With Existing CRM
- **Contacts**: Cases link to contact records
- **Accounts**: Organization-level case tracking
- **Tasks**: Case-related tasks (future)
- **Events**: Case-related events (future)

### With Other Systems
- **Document Management**: File storage integration
- **Email**: Email log capture (future)
- **Calendar**: Appointment scheduling (future)
- **Notifications**: Status change alerts (future)

---

## Future Enhancements

1. **Automated Workflows**
   - Rule-based status transitions
   - Auto-assignment based on criteria
   - Email notifications on status changes

2. **Advanced Reporting**
   - Custom report builder
   - Export to Excel/PDF
   - Scheduled reports

3. **Client Portal**
   - Client-facing case view
   - Document upload
   - Message staff

4. **Mobile App**
   - Field case management
   - Offline capability
   - Photo documentation

5. **AI/ML Features**
   - Case outcome prediction
   - Similar case recommendations
   - Resource optimization

---

## Technical Implementation

### Backend
- **Database**: PostgreSQL with 9 new tables
- **API**: RESTful endpoints with Express.js
- **Service Layer**: Comprehensive case management service
- **Type Safety**: Full TypeScript typing
- **Logging**: Activity logging with Winston
- **Validation**: Input validation on all endpoints

### Security
- **Authentication**: JWT token required
- **Authorization**: Role-based access control (future)
- **Data Privacy**: Confidentiality levels on documents
- **Audit Trail**: Full modification history

### Performance
- **Indexing**: Optimized database indexes
- **Pagination**: All list endpoints paginated
- **Caching**: Redis caching support (future)
- **Query Optimization**: Efficient joins and filters

---

## Getting Started

### 1. Run Database Migration

```bash
# Apply the case management schema
psql -U postgres -d nonprofit_manager -f database/migrations/009_case_management.sql
```

### 2. Start Backend

```bash
cd backend
npm run dev
```

### 3. Test API

```bash
# Get case types
curl localhost:3000/api/cases/types \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get case statuses
curl localhost:3000/api/cases/statuses \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a case
curl -X POST localhost:3000/api/cases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"uuid","case_type_id":"uuid","title":"Test Case"}'
```

---

## Support & Documentation

- **API Documentation**: See API_INTEGRATION_GUIDE.md
- **Database Schema**: See 009_case_management.sql
- **Type Definitions**: See backend/src/types/case.ts
- **Issues**: https://github.com/West-Cat-Strategy/nonprofit-manager/issues

---

**Document Version:** 1.0
**Last Updated:** February 2, 2026
**System Status:** ✅ Backend Complete, Frontend In Progress
