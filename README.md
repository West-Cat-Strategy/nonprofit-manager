# Nonprofit Manager

**Last Updated:** 2026-04-18

Nonprofit Manager is a platform for nonprofit teams that need their daily operations, fundraising, reporting, and web workflows to live in one place instead of across disconnected tools.

It brings together people records, volunteer coordination, events, donations, dashboards, reports, integrations, publishing, and portal-facing workflows so staff can spend less time stitching systems together and more time serving their communities.

## Built For Nonprofit Teams

| Team | How Nonprofit Manager Helps |
|---|---|
| Program and operations staff | Keep people, tasks, activities, and day-to-day work organized in one system |
| Volunteer coordinators | Track volunteers, opportunities, assignments, hour logging, and event participation |
| Fundraising and development teams | Manage donations, campaigns, receipts, recurring giving, and reporting |
| Leadership and administrators | Monitor dashboards, scheduled reports, permissions, and organizational activity |

## What Teams Can Do

### Manage Relationships And Daily Work

- Maintain centralized people records with search, filtering, notes, and relationship history.
- Organize opportunities, tasks, and staff workflows around the work your team is actively managing.
- Support staff and portal workflows from the same platform instead of splitting operational context across tools.

### Run Volunteer And Event Operations

- Coordinate volunteer profiles, availability, assignments, and hour tracking.
- Create events, manage registrations, handle check-in flows, and send reminders.
- Give staff a clearer operational view of who is attending, what is scheduled, and what follow-up is needed.

### Track Fundraising And Measure Results

- Record donations, campaigns, receipts, recurring gifts, and related fundraising activity.
- Build dashboards, export data, and deliver scheduled reports for staff and leadership.
- Give teams a shared reporting layer for operational visibility and decision-making.

### Connect Systems And Publish Experiences

- Use API, webhook, and integration support for external workflows and third-party services.
- Support website publishing and public-facing experiences from the same product surface.
- Keep room for self-hosted deployment models when your organization needs operational control.

## Trust, Reporting, And Operations

- Role-based access, permissions, audit-oriented monitoring, and security-focused operational guidance are built into the documented platform contract.
- Reporting is treated as a core product surface, with dashboards, exports, scheduled delivery, and analytics workflows already reflected in the repo docs.
- Deployment guidance supports self-hosted environments, with Docker-based local workflows and documented production setup paths.

Technology snapshot: TypeScript, React 19, Express, PostgreSQL, Redis, Tailwind CSS, and Docker.

## Learn More

- Product specification: [docs/product/product-spec.md](docs/product/product-spec.md)
- Feature inventory: [docs/features/FEATURE_MATRIX.md](docs/features/FEATURE_MATRIX.md)
- Staff help center: [docs/help-center/staff/index.html](docs/help-center/staff/index.html)
- API reference: [docs/api/README.md](docs/api/README.md)
- Deployment guide: [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)
- Full documentation catalog: [docs/INDEX.md](docs/INDEX.md)

## For Contributors

If you want to contribute code or docs, use this handoff path:

1. [CONTRIBUTING.md](CONTRIBUTING.md) for workflow, validation, tracked-work expectations, and handoff
2. [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for setup and runtime choices
3. [docs/README.md](docs/README.md) or [docs/INDEX.md](docs/INDEX.md) for the rest of the documentation map

If you are already working in a specific surface after that, continue with [agents.md](agents.md) for terminology and coordination context, [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md), or [docs/testing/TESTING.md](docs/testing/TESTING.md) as needed.

## License

MIT
