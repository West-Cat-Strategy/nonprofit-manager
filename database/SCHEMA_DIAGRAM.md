# Database Schema Diagram

## Entity Relationship Diagram (ERD)

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │   user_roles    │
├─────────────────┤       ├─────────────────┤
│ id (UUID)       │◄──────┤ user_id         │
│ email           │       │ role_id         │
│ password_hash   │       │ assigned_at     │
│ first_name      │       └─────────────────┘
│ last_name       │               ▲
│ is_active       │               │
│ created_at      │       ┌─────────────────┐
│ updated_at      │       │     roles       │
└─────────────────┘       ├─────────────────┤
          ▲               │ id (UUID)       │
          │               │ name            │
          │               │ description     │
          │               │ permissions     │
          │               │ created_at      │
          │               └─────────────────┘
          │
          │
┌─────────────────┐       ┌─────────────────┐
│   accounts      │       │   contacts      │
├─────────────────┤       ├─────────────────┤
│ id (UUID)       │◄──────┤ id (UUID)       │
│ name            │       │ account_id      │
│ type            │       │ first_name      │
│ industry        │       │ last_name       │
│ website         │       │ email           │
│ phone           │       │ phone           │
│ address_*       │       │ address_*       │
│ is_active       │       │ is_active       │
│ created_at      │       │ created_at      │
│ updated_at      │       │ updated_at      │
└─────────────────┘       └─────────────────┘
          ▲                       ▲
          │                       │
          │                       │
┌─────────────────┐       ┌─────────────────┐
│   donations     │       │   volunteers    │
├─────────────────┤       ├─────────────────┤
│ id (UUID)       │       │ id (UUID)       │
│ account_id      │       │ contact_id      │
│ contact_id      │       │ skills          │
│ amount          │       │ availability    │
│ currency        │       │ background_check│
│ type            │       │ status          │
│ date            │       │ joined_date     │
│ is_recurring    │       │ created_at      │
│ created_at      │       │ updated_at      │
└─────────────────┘       └─────────────────┘
          ▲
          │
          │
┌─────────────────┐       ┌─────────────────┐
│     events      │       │event_registrations│
├─────────────────┤       ├─────────────────┤
│ id (UUID)       │◄──────┤ event_id         │
│ title           │       │ contact_id       │
│ description     │       │ registration_date│
│ start_date      │       │ status           │
│ end_date        │       │ attendance       │
│ location        │       │ created_at       │
│ capacity        │       └─────────────────┘
│ is_active       │
│ created_at      │
│ updated_at      │
└─────────────────┘
          ▲
          │
          │
┌─────────────────┐       ┌─────────────────┐
│     tasks       │       │   activities    │
├─────────────────┤       ├─────────────────┤
│ id (UUID)       │       │ id (UUID)       │
│ title           │       │ contact_id      │
│ description     │       │ account_id      │
│ assigned_to     │       │ type            │
│ status          │       │ subject         │
│ priority        │       │ description     │
│ due_date        │       │ date            │
│ created_at      │       │ created_by      │
│ updated_at      │       │ created_at      │
└─────────────────┘       └─────────────────┘
```

## Key Relationships

### Core Relationships
- **Users** have many **User Roles** (many-to-many through user_roles table)
- **Accounts** have many **Contacts**
- **Contacts** belong to **Accounts** (optional)
- **Donations** belong to **Accounts** and/or **Contacts**
- **Events** have many **Event Registrations**
- **Contacts** register for **Events** through **Event Registrations**
- **Contacts** can be **Volunteers** (one-to-one extension)
- **Users** create and manage **Tasks**
- **Activities** track interactions with **Contacts** and **Accounts**

### Audit & Security
- All tables include audit fields: `created_at`, `updated_at`, `created_by`, `modified_by`
- **Audit Log** table tracks all data modifications
- Row Level Security (RLS) policies control data access
- PII encryption for sensitive contact information

## Data Flow

### Donation Processing
```
Contact/Account → Donation → Payment Processing → Receipt Generation
```

### Event Management
```
Event Creation → Contact Registration → Attendance Tracking → Follow-up Activities
```

### Volunteer Management
```
Contact → Volunteer Profile → Skills Matching → Task Assignment → Activity Logging
```

## Indexes

### Performance Indexes
- Primary keys on all tables (UUID)
- Foreign key indexes for relationships
- Composite indexes on commonly queried fields
- Partial indexes for active records
- Full-text search indexes on text fields

### Unique Constraints
- User emails (case-insensitive)
- Contact emails per account
- Event registration uniqueness
- Role name uniqueness

## Extensions Used

- `uuid-ossp` - UUID generation functions
- `pgcrypto` - Cryptographic functions for PII encryption
- `btree_gin` - Generalized Inverted Index for array operations

## Partitioning Strategy (Future)

Large tables may be partitioned by:
- **Audit Log**: By month/year
- **Activities**: By date ranges
- **Donations**: By fiscal year

## Replication Strategy (Future)

- Logical replication for reporting databases
- Streaming replication for high availability
- Read replicas for performance scaling