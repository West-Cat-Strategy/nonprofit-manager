# Database Schema Documentation

## Overview

The Nonprofit Manager database schema follows the Microsoft Common Data Model (CDM) conventions for entity naming and relationships. This ensures consistency, interoperability, and industry best practices.

## Core Entities

### Users (CDM: SystemUser)
System users who can access the platform. Supports role-based access control (RBAC).

### Accounts (CDM: Account)
Organizations or individuals that the nonprofit interacts with. Can represent donors, sponsors, partner organizations, etc.

### Contacts (CDM: Contact)
Individual people associated with accounts or tracked independently. Primary entity for managing relationships.

### Volunteers
Extends the Contact entity with volunteer-specific fields like skills, availability, and background checks.

### Events (CDM: Campaign/Event)
Scheduled activities, fundraisers, or programs that the nonprofit organizes.

### Event Registrations
Junction table linking contacts to events, tracking registration status and attendance.

### Donations (CDM: Opportunity/Transaction)
Financial contributions from accounts or contacts, including one-time and recurring donations.

### Tasks (CDM: Task)
Work items assigned to users, supporting project management and workflow tracking.

### Activities (CDM: Activity)
Log of interactions and communications with accounts and contacts (emails, calls, meetings, notes).

## CDM Alignment

The schema uses CDM-standard field names where applicable:
- `created_at`, `updated_at`, `created_by`, `modified_by` for audit trails
- `is_active` for soft deletion
- Standardized address fields (`address_line1`, `city`, `state_province`, `postal_code`, `country`)
- UUID primary keys for scalability

## Migrations

Database migrations are stored in `database/migrations/` and should be run in numerical order.

To apply migrations:
```bash
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql
```

## Seeds

Seed data for development is in `database/seeds/`.

To apply seeds:
```bash
psql -U postgres -d nonprofit_manager -f database/seeds/001_default_users.sql
```
