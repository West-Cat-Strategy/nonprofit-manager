# Nonprofit Manager

**Last Updated:** 2026-04-30

Nonprofit Manager is a self-hostable operations platform for nonprofit organizations that want their people records, service delivery, fundraising, reporting, website publishing, and client-facing workflows to work from one shared system.

It is designed for teams that have outgrown scattered spreadsheets, disconnected donor tools, separate volunteer trackers, and one-off portal or website workflows. The goal is simple: give staff and leadership a clearer operating picture while preserving the flexibility and control many nonprofits need.

## Why Organizations Use It

Nonprofit teams often manage mission-critical work across too many tools. Nonprofit Manager brings those workflows together so organizations can:

- Keep constituent, volunteer, donor, staff, and service records connected.
- Coordinate cases, tasks, events, follow-ups, forms, appointments, documents, and reminders.
- Manage donations, recurring giving, reconciliation, campaigns, receipts, grants, and reports.
- Publish public-facing experiences such as event pages, newsletters, website content, and intake forms.
- Offer portal workflows for clients, participants, or community members who need secure access to forms, messages, appointments, cases, and shared documents.
- Run reporting, dashboards, exports, scheduled reports, alerts, and audit-oriented operational reviews from the same product surface.

## Who It Helps

| Audience | What It Supports |
|---|---|
| Executive directors and leadership teams | Organization-wide visibility, reporting, governance, risk review, and operating discipline |
| Program and service teams | Cases, intake, follow-ups, appointments, documents, forms, reminders, and service-delivery workflows |
| Volunteer coordinators | Volunteer profiles, assignments, opportunities, hour tracking, events, attendance, and follow-up |
| Fundraising and development teams | Donors, gifts, recurring giving, reconciliation, campaigns, receipts, stewardship, and reporting |
| Communications and operations staff | Website publishing, newsletters, public forms, event pages, integrations, and operational dashboards |
| Clients, participants, and community members | Portal access for selected forms, messages, cases, appointments, documents, and reminders |

## Product Areas

### Operations And Relationships

Nonprofit Manager provides centralized records and staff workflows for people, accounts, volunteers, service interactions, tasks, cases, follow-ups, meetings, opportunities, and external service providers.

### Fundraising, Grants, And Finance

The platform includes donation and recurring-giving workflows, reconciliation, receipts, campaign operations, grant surfaces, reports, and analytics for development and leadership teams.

### Events, Volunteers, And Public Engagement

Teams can coordinate events, registrations, reminders, attendance, volunteer assignments, hour tracking, public event pages, newsletters, and public forms from connected staff and public-facing surfaces.

### Reporting And Leadership Visibility

Dashboards, report builders, saved reports, scheduled delivery, alerts, outcome reporting, workflow coverage, exports, and audit artifacts are treated as core operating tools rather than afterthoughts.

### Website, Portal, And Integrations

Nonprofit Manager includes website-builder and website-console workflows, a public-site runtime, authenticated portal experiences, `/api/v2` contracts, webhooks, payment-provider support, Mailchimp-backed communications, and external service provider configuration.

## Trust And Control

Nonprofit Manager is built for organizations that care about operational control as much as feature breadth.

- Self-hostable deployment paths are documented for teams that need direct control of their environment.
- Role-based access, permissions, session handling, audit-oriented monitoring, and security operations guidance are part of the documented platform contract.
- API, webhook, and integration surfaces are designed to support system-to-system workflows without forcing every organization into one hosted operating model.
- Documentation separates product overview, contributor workflow, runtime setup, testing, validation, security, and deployment guidance so organizations and contributors can find the right level of detail quickly.

Technology snapshot: TypeScript, React 19, Express, PostgreSQL, Redis, Tailwind CSS, and Docker.

## Explore The Product

- Product docs: [docs/product/README.md](docs/product/README.md)
- Product specification: [docs/product/product-spec.md](docs/product/product-spec.md)
- Feature inventory: [docs/features/FEATURE_MATRIX.md](docs/features/FEATURE_MATRIX.md)
- Feature docs: [docs/features/README.md](docs/features/README.md)
- Workflow personas: [docs/product/persona-workflows.md](docs/product/persona-workflows.md)
- Open-source nonprofit CRM benchmark: [docs/product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](docs/product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md)
- UI docs: [docs/ui/README.md](docs/ui/README.md)
- API reference: [docs/api/README.md](docs/api/README.md)
- Deployment guide: [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)
- Full documentation catalog: [docs/README.md](docs/README.md)

## For Contributors

If you want to contribute code, documentation, validation, or release support, start with [CONTRIBUTING.md](CONTRIBUTING.md). That guide explains the contributor workflow, setup handoff, tracked-work expectations, validation defaults, and documentation hygiene.

For terminology around developer agents, multi-agent coordination, and HTTP `User-Agent` tracking, see [agents.md](agents.md).

## License

MIT
