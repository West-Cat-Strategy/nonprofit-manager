# Feature Matrix

**Last Updated**: 2026-02-19

Master status of all features in nonprofit-manager.

---

## Overview

This document provides a single view into:
- What features are available
- What's currently in development
- What's planned for future releases
- Feature documentation and implementation status

For **quick status lookup**, see the status tables below.

For **detailed feature specifications**, see linked documentation files.

---

## Feature Status Legend

| Status | Icon | Meaning |
|--------|------|---------|
| **Complete** | ✅ | Feature is built, tested, and available in production |
| **In Development** | 🟡 | Feature is actively being worked on |
| **Planned** | 📋 | Feature is planned but not started |
| **Blocked** | 🔴 | Feature is blocked waiting for something |
| **On Hold** | ⏸️ | Feature is paused (will resume later) |
| **Deprecated** | ❌ | Feature is no longer supported |

---

## Core Features

### People & CRM Management

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **People Database** | ✅ | Backend | [PEOPLE_MODULE_ENHANCEMENTS.md](PEOPLE_MODULE_ENHANCEMENTS.md) | `backend/src/controllers/peopleController.ts` | Core CRM functionality |
| Contact Information | ✅ | Backend | Same | - | Stores names, emails, phone |
| Custom Fields | ✅ | Backend | Same | - | User-defined attributes |
| Relationship Tracking | ✅ | Backend | Same | - | Links between contacts |
| Notes & History | ✅ | Backend | Same | - | Activity log per contact |
| Search & Filter | ✅ | Frontend | Same | `frontend/src/components/features/PeopleSearch.tsx` | Find contacts quickly |
| Import/Export | 🟡 | Backend | [API_REFERENCE_EXPORT.md](../api/API_REFERENCE_EXPORT.md) | - | CSV import/export in progress |
| Bulk Actions | 📋 | Frontend | Same | - | Batch update planned |

### Volunteer Management

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Volunteer Portal** | ✅ | Frontend | [VOLUNTEER_COMPONENTS_STATUS.md](VOLUNTEER_COMPONENTS_STATUS.md) | `frontend/src/pages/VolunteerPortal.tsx` | Self-service volunteer portal |
| Sign-Up Form | ✅ | Frontend | Same | - | Public volunteer registration |
| Availability Calendar | ✅ | Frontend | Same | - | Schedule management |
| Opportunity Management | ✅ | Backend | [PEOPLE_MODULE_ENHANCEMENTS.md](PEOPLE_MODULE_ENHANCEMENTS.md) | `backend/src/controllers/volunteerController.ts` | Track volunteer opportunities |
| Hour Tracking | ✅ | Frontend | [VOLUNTEER_COMPONENTS_STATUS.md](VOLUNTEER_COMPONENTS_STATUS.md) | - | Log volunteer hours |
| Matching Algorithm | 🟡 | Backend | Same | - | Match volunteers to opportunities |
| Recognition/Badges | 📋 | Frontend | Same | - | Gamification features planned |

### Event Management

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Event CRUD** | ✅ | Backend | [API_REFERENCE_EVENTS.md](../api/API_REFERENCE_EVENTS.md) | `backend/src/controllers/eventController.ts` | Create, update, delete events |
| Event Details | ✅ | Frontend | Same | `frontend/src/pages/EventDetail.tsx` | View event information |
| Capacity Management | ✅ | Backend | Same | - | Control registration limits |
| Registration Form | ✅ | Frontend | Same | `frontend/src/components/EventRegistration.tsx` | Attendee sign-up |
| Attendee List | ✅ | Backend | Same | - | View registrations |
| Check-In/QR Codes | 🟡 | Frontend | Same | - | Event day attendance tracking |
| Reminders | 📋 | Backend | Same | - | Email/SMS event reminders planned |

### Financial Management

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Donation Tracking** | ✅ | Backend | [API_INTEGRATION_GUIDE.md](../api/API_INTEGRATION_GUIDE.md#stripe-integration) | `backend/src/controllers/donationController.ts` | Record and manage donations |
| Stripe Integration | ✅ | Backend | Same | - | Process credit card payments |
| Recurring Donations | ✅ | Backend | Same | - | Subscription management |
| Receipt Generation | ✅ | Backend | - | - | Email donation receipts |
| Tax Documents | 📋 | Backend | - | - | Generate tax statements |
| Fundraising Goals | ✅ | Frontend | [API_REFERENCE_DASHBOARD_ALERTS.md](../api/API_REFERENCE_DASHBOARD_ALERTS.md) | - | Track progress toward goals |
| Campaign Tracking | ✅ | Backend | [REPORTING_GUIDE.md](REPORTING_GUIDE.md) | - | Organize donations by campaign |

### Reporting & Analytics

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Report Generation** | ✅ | Backend | [REPORTING_GUIDE.md](REPORTING_GUIDE.md) | `backend/src/services/reportService.ts` | Create custom reports |
| Export to CSV | ✅ | Backend | [API_REFERENCE_EXPORT.md](../api/API_REFERENCE_EXPORT.md) | - | Download data as CSV |
| Export to Excel | ✅ | Backend | Same | - | Excel .xlsx format |
| PDF Generation | 🟡 | Backend | Same | - | PDF export in progress |
| Templates | ✅ | Backend | [TEMPLATE_SYSTEM.md](TEMPLATE_SYSTEM.md) | - | Pre-built report templates |
| Scheduled Reports | 📋 | Backend | [REPORTING_GUIDE.md](REPORTING_GUIDE.md) | - | Automatic report generation |
| Analytics Dashboard | ✅ | Frontend | [API_REFERENCE_DASHBOARD_ALERTS.md](../api/API_REFERENCE_DASHBOARD_ALERTS.md) | - | Real-time metrics and graphs |
| Trend Analysis | 🟡 | Backend | [API_REFERENCE_EXPORT.md](../api/API_REFERENCE_EXPORT.md) | - | Historical trends in progress |
| Outcomes Report | 🟡 | Backend/Frontend | [CASE_MANAGEMENT_SYSTEM.md](CASE_MANAGEMENT_SYSTEM.md) | `backend/src/services/outcomeReportService.ts` | Outcome totals, unique clients, and time-series reporting |

### Dashboard & Customization

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Customizable Dashboard** | ✅ | Frontend | [DASHBOARD_CUSTOMIZATION.md](DASHBOARD_CUSTOMIZATION.md) | `frontend/src/pages/Dashboard.tsx` | User-configurable dashboard |
| Widget System | ✅ | Frontend | Same | - | Add/remove/configure widgets |
| Multiple Dashboards | ✅ | Backend | [API_REFERENCE_DASHBOARD_ALERTS.md](../api/API_REFERENCE_DASHBOARD_ALERTS.md) | - | Save different dashboard configs |
| Widget Types | ✅ | Frontend | [DASHBOARD_CUSTOMIZATION.md](DASHBOARD_CUSTOMIZATION.md) | - | Key metrics, charts, tables, etc. |
| Performance Metrics | ✅ | Backend | - | - | System health indicators |
| Alerts & Monitoring | ✅ | Backend | [API_REFERENCE_DASHBOARD_ALERTS.md](../api/API_REFERENCE_DASHBOARD_ALERTS.md) | - | Configurable alert rules |

### Integration & Automation

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Webhooks** | ✅ | Backend | [API_INTEGRATION_GUIDE.md](../api/API_INTEGRATION_GUIDE.md#webhooks) | `backend/src/services/webhookService.ts` | External service integration |
| Mailchimp Sync | ✅ | Backend | [API_INTEGRATION_GUIDE.md](../api/API_INTEGRATION_GUIDE.md#mailchimp-integration) | - | Sync mailing lists |
| External CRM Sync | 🟡 | Backend | Same | - | Sync with external CRMs |
| SMS Integration | 📋 | Backend | - | - | Send SMS messages (planned) |
| Email Template System | ✅ | Backend | [TEMPLATE_SYSTEM.md](TEMPLATE_SYSTEM.md) | - | Customizable email templates |
| Automated Workflows | 🟡 | Backend | - | - | Trigger-based automation in progress |

---

## Advanced Features

### Case Management

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Case Management** | 🟡 | Backend | [CASE_MANAGEMENT_SYSTEM.md](CASE_MANAGEMENT_SYSTEM.md) | - | Client case tracking |
| Case Files | 🟡 | Backend | Same | - | Document storage (in progress) |
| Case Status Workflow | 🟡 | Backend | Same | - | Workflow engine (in progress) |
| Task Assignment | 🟡 | Backend | [TASK_MANAGEMENT.md](TASK_MANAGEMENT.md) | - | Assign work to staff |
| Notes & Timeline | 🟡 | Backend | [CASE_MANAGEMENT_SYSTEM.md](CASE_MANAGEMENT_SYSTEM.md) | - | Activity tracking |
| Outcomes Tracking | 🟡 | Backend/Frontend | [CASE_MANAGEMENT_SYSTEM.md](CASE_MANAGEMENT_SYSTEM.md) | `backend/src/services/outcomeImpactService.ts` | Tag case note interactions with configurable outcomes |

### Task Management

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Task System** | 🟡 | Backend | [TASK_MANAGEMENT.md](TASK_MANAGEMENT.md) | - | Internal task management |
| Task Creation | 🟡 | Backend | Same | - | Create and assign tasks |
| Due Dates & Priorities | 🟡 | Backend | Same | - | Task scheduling |
| Status Tracking | 🟡 | Backend | Same | - | Track task progress |
| Comments & Collaboration | 👻 | Backend | Same | - | Team discussion on tasks |

### Telemetry & Privacy

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **Activity Logging** | ✅ | Backend | [TELEMETRY.md](TELEMETRY.md) | `backend/src/services/portalActivityService.ts` | User action tracking |
| User-Agent Tracking | ✅ | Backend | Same | - | Browser/client identification |
| Access Logs | ✅ | Backend | Same | - | Login/access audit trail |
| GDPR Compliance | ✅ | Backend | [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) | - | Data privacy controls |
| Data Subject Rights | ✅ | Backend | Same | - | Export/delete user data |
| Consent Management | 📋 | Backend | - | - | Cookie/tracking consent |

---

## Security & Administration

| Feature | Status | Owner | Documentation | Code | Notes |
|---------|--------|-------|---|---|---|
| **User Roles** | ✅ | Backend | [agents.md](../../agents.md) | `backend/src/services/authGuardService.ts` | Admin, Manager, Coordinator, Volunteer, Donor |
| **Permissions** | ✅ | Backend | [agents.md](../../agents.md) | Same | 45+ granular permissions |
| **Organization Access** | ✅ | Backend | Same | - | Multi-tenancy support |
| Password Reset | ✅ | Backend | - | - | Secure password recovery |
| Session Management | ✅ | Backend | - | - | JWT token management |
| Rate Limiting | ✅ | Backend | [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) | - | DDoS protection |
| API Key Management | ✅ | Backend | Same | - | Third-party access tokens |
| Backup & Recovery | ✅ | Backend/DevOps | [../deployment/DB_SETUP.md](../deployment/DB_SETUP.md) | - | Database backup procedures |

---

## Status Summary

### Completion by Category

```
People & CRM:          ████████░░  8/10 features complete (80%)
Volunteers:            █████████░  9/10 features complete (90%)
Events:                ██████░░░░  6/10 features complete (60%)
Financials:            ████████░░  8/10 features complete (80%)
Reporting:             ████████░░  8/10 features complete (80%)
Dashboard:             ██████████ 10/10 features complete (100%)
Integrations:          ███████░░░  7/10 features complete (70%)
Case Management:       █░░░░░░░░░  1/10 features complete (10%) 🟡 in progress
Task Management:       █░░░░░░░░░  1/10 features complete (10%) 🟡 in progress
Security:              ██████████ 10/10 features complete (100%)
```

### Feature Status

| Status | Count | |
|--------|-------|---|
| ✅ Complete | 64 | 75% of features |
| 🟡 In Development | 14 | 16% of features |
| 📋 Planned | 6 | 7% of features |
| ⏸️ On Hold | 0 | - |
| ❌ Deprecated | 1 | - |

---

## What's Coming Next

### Next Release (Phase 3+)

**High Priority**:
1. Case Management Workflow completion
2. Task Management System launch
3. PDF report export
4. SMS integration
5. Advanced automation rules

**Medium Priority**:
1. Bulk data operations
2. Trend analysis improvements
3. Recognition/gamification
4. Scheduled reports
5. Advanced matching algorithms

**Lower Priority**:
1. Additional CRM integrations
2. Mobile app
3. Advanced analytics

---

## Feature Documentation

For detailed specifications, use this navigation:

**By Category**:
- [PEOPLE_MODULE_ENHANCEMENTS.md](PEOPLE_MODULE_ENHANCEMENTS.md) — CRM and people features
- [VOLUNTEER_COMPONENTS_STATUS.md](VOLUNTEER_COMPONENTS_STATUS.md) — Volunteer portal and tracking
- [TASK_MANAGEMENT.md](TASK_MANAGEMENT.md) — Task system (planned)
- [REPORTING_GUIDE.md](REPORTING_GUIDE.md) — Reports and analytics
- [TEMPLATE_SYSTEM.md](TEMPLATE_SYSTEM.md) — Templates and customization
- [DASHBOARD_CUSTOMIZATION.md](DASHBOARD_CUSTOMIZATION.md) — Dashboard features
- [CASE_MANAGEMENT_SYSTEM.md](CASE_MANAGEMENT_SYSTEM.md) — Case management (in development)
- [CRM_ENHANCEMENTS.md](CRM_ENHANCEMENTS.md) — CRM improvements
- [TELEMETRY.md](TELEMETRY.md) — Analytics and activity tracking

**By Type**:
- [../api/API_REFERENCE_EVENTS.md](../api/API_REFERENCE_EVENTS.md) — Event endpoints
- [../api/API_REFERENCE_DASHBOARD_ALERTS.md](../api/API_REFERENCE_DASHBOARD_ALERTS.md) — Dashboard & alerts API
- [../api/API_REFERENCE_EXPORT.md](../api/API_REFERENCE_EXPORT.md) — Report & export API
- [../api/API_INTEGRATION_GUIDE.md](../api/API_INTEGRATION_GUIDE.md) — Stripe, Mailchimp, webhooks
- [../api/API_REFERENCE_BACKUP.md](../api/API_REFERENCE_BACKUP.md) — Backup/restore

---

## Requesting a Feature

### Have an idea for a new feature?

1. Check if it's already listed as Planned (📋) or In Development (🟡)
2. Open a [GitHub Issue](https://github.com/West-Cat-Strategy/nonprofit-manager/issues) with feature request label
3. Describe what problem it solves and who would benefit
4. Please provide use cases or examples

### Want to contribute to a feature?

1. Find the feature above and note its status
2. If In Development 🟡, check the documentation file for current progress
3. See [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) to set up dev environment
4. Check GitHub Issues for related PRs or assign yourself
5. Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md) workflow

---

## See Also

- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — How to start contributing
- [../product/product-spec.md](../product/product-spec.md) — Product requirements and vision
- [../phases/planning-and-progress.md](../phases/planning-and-progress.md) — Current work in progress
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md) — Contribution guidelines
