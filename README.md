# Nonprofit Manager

A project by **Example Organization**

An all-in-one platform for nonprofit organizations to manage volunteers, events, donors, supporters, tasks, and communications.

**Contact**: [maintainer@example.com](mailto:maintainer@example.com)

## Project Overview

Last updated: February 14, 2026.

Nonprofit Manager is a comprehensive platform for nonprofit organizations to manage:
- **Volunteer Management**: Track skills, assignments, and hours
- **Event Management**: Schedule events with registration and check-in
- **Donation Tracking**: Record donations and generate receipts
- **Constituent Management**: Maintain supporter profiles and interactions
- **Task Management**: Organize assignments and deadlines
- **Analytics & Reporting**: Custom dashboards, alerts, and data export
- **Website Builder**: Create and manage nonprofit websites

Built with modern web technologies for performance, security, and scalability.

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt

### Frontend
- **Framework**: React.js with TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **UI Components**: Headless UI, Heroicons

### Data Model
- Aligned with Microsoft Common Data Model (CDM) for interoperability

## Project Structure

```
nonprofit-manager/
├── backend/              # Express.js TypeScript API
│   ├── src/
│   │   ├── config/      # Database, logger, etc.
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Auth, error handling
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Helper functions
│   ├── package.json
│   └── tsconfig.json
├── frontend/            # React TypeScript app
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   ├── store/       # Redux store & slices
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── database/            # Database schema & migrations
│   ├── migrations/      # SQL migration files
│   ├── seeds/          # Seed data
│   └── README.md
├── docs/                # Documentation
│   ├── api/            # API references and specs
│   ├── backend/        # Backend development guides
│   ├── deployment/     # Deployment and setup guides
│   ├── development/    # Development conventions and architecture
│   ├── features/       # Feature-specific documentation
│   ├── performance/    # Performance optimization guides
│   ├── phases/         # Project phase completion summaries
│   ├── product/        # Product specifications and research
│   ├── quick-reference/ # Quick reference guides
│   ├── security/       # Security audits and monitoring
│   ├── testing/        # Testing guides and procedures
│   ├── ui/             # UI/UX design and theming
│   └── validation/     # Validation schemas reference
├── e2e/                 # End-to-end tests
├── plausible/           # Plausible analytics setup
├── scripts/             # Utility scripts
└── README.md
```

## Key Features

- **Customizable Dashboards**: Drag-and-drop widgets with 11+ widget types
- **Analytics Alerts**: Real-time monitoring with multi-channel notifications
- **Privacy-First Analytics**: Self-hosted Plausible integration
- **Performance Optimized**: Database indexing and intelligent caching
- **Data Export**: CSV/Excel export with flexible filtering
- **Role-Based Security**: Granular permissions and data masking

See [Features Documentation](docs/README.md) for detailed guides.

## Getting Started

### Prerequisites
- Docker Desktop (or Docker Engine + Docker Compose)
- Node.js 20.19+ and npm 10+ (for manual local development outside Docker)

### Quick Start
```bash
# Start all services
docker compose -p nonprofit-prod --env-file .env.production -f docker-compose.yml up --build -d

# Access the application
# - Frontend: http://localhost:8001
# - Backend API: http://localhost:8000
```

### Development Mode
```bash
# Start with hot reload
docker compose -p nonprofit-dev -f docker-compose.dev.yml up --build -d

# Access
# - Frontend: http://localhost:8005
# - Backend API: http://localhost:8004
# - PostgreSQL: localhost:8002
# - Redis: localhost:8003
```

The dev stack now builds `backend` and `frontend` from the shared app Dockerfiles using their `dev` targets, so there is no separate `Dockerfile.dev` maintenance surface.

### Optional Docker Overlays

```bash
# Dev stack + tools profile (pgAdmin, Redis Commander, MailHog)
docker compose -p nonprofit-dev -f docker-compose.dev.yml -f docker-compose.tools.yml --profile tools up -d

# Dev stack + Caddy overlay
docker compose -p nonprofit-dev -f docker-compose.dev.yml -f docker-compose.caddy.yml up -d

# Production-like stack + optional DB/Redis host-port access
docker compose -p nonprofit-prod --env-file .env.production -f docker-compose.yml -f docker-compose.host-access.yml up -d

# Production stack + VPS Caddy public edge
docker compose -p nonprofit-prod --env-file .env.production -f docker-compose.yml -f docker-compose.vps.yml up -d
```

The Caddy overlay now uses the stock `caddy:2-alpine` image directly, so `docker-up-caddy` and the raw compose command work without a local image prebuild step.

When using `docker-compose.vps.yml`, public traffic enters through Caddy on `80/443`, backend and frontend ports `8000`/`8001` stay bound to `127.0.0.1` for host-local diagnostics, the public API base is `https://example.com/api`, and `https://example.com/health` reaches the backend health route.

For the live production VPS, use [`scripts/deploy.sh`](scripts/deploy.sh) and [`scripts/verify.sh`](scripts/verify.sh) instead of [`scripts/deploy.sh`](scripts/deploy.sh). The production host runs from `/srv/nonprofit-manager` as a promoted snapshot, not a remote git checkout. See [`docs/deployment/production.md`](docs/deployment/production.md).

### First Setup vs Seeded Data

- `docker-compose.dev.yml` runs `database/initdb/000_init.sql` on first DB initialization.
- That init script currently loads `database/seeds/003_mock_data.sql`, which includes an admin user.
- Seeded login credentials: `admin@example.com` / `password123`.
- If you want to exercise true first-time setup (`/setup`), use a database that does not load user seeds (or clear users/admins before launch).

### Setup/Launch Troubleshooting

- Symptom: app bounces between `/setup` and `/login`, or auth/setup endpoints return org-context errors.
- Check org-context flags in backend env:
  - `ORG_CONTEXT_REQUIRE=true`
  - `ORG_CONTEXT_VALIDATE=true`
- Auth/bootstrap routes (`/api/v2/auth/*`, `/api/v2/admin/*`, `/api/v2/invitations/*`, `/api/v2/payments/webhook`) should bypass org-context enforcement.
- If setup-status cannot be fetched (network/500), keep `/setup` usable and avoid forcing `/setup -> /login` until setup state resolves.

For manual setup and advanced Docker commands, see [Deployment Guide](docs/deployment/DEPLOYMENT.md) and the [production production runbook](docs/deployment/production.md).

## Development

### Commands
```bash
# Full local CI
make ci

# Start development environment
make dev

# Run tests
make test

# Lint and typecheck
make lint && make typecheck
```

See [Development Guide](docs/development/CONVENTIONS.md) for coding standards and [Testing Guide](docs/testing/TESTING.md) for testing procedures.

## Contributing

Want to contribute? Start here:
1. **[Getting Started Guide](docs/development/GETTING_STARTED.md)** — Set up your development environment (~2 hours)
2. **[Contributing Guide](CONTRIBUTING.md)** — Git workflow, commit messages, pull requests
3. **[Code Conventions](docs/development/CONVENTIONS.md)** — Code style and standards
4. **[Architecture Decisions](docs/development/ARCHITECTURE.md)** — System design

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

**Start here**: [docs/INDEX.md](docs/INDEX.md) — Complete documentation index and navigation

**Quick links**:
- **Setup**: [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) (new developers)
- **API Docs**: [docs/api/README.md](docs/api/README.md) (endpoints and integrations)
- **Features**: [docs/features/FEATURE_MATRIX.md](docs/features/FEATURE_MATRIX.md) (what's available)
- **Testing**: [docs/testing/TESTING.md](docs/testing/TESTING.md) (how to test)
- **Deployment**: [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md) (production setup)
- **Security**: [docs/security/SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md) (monitoring and incidents)

See [docs/INDEX.md](docs/INDEX.md) for comprehensive documentation including:
- Development guides (architecture, conventions, troubleshooting)
- API references and integration guides
- Feature documentation
- Deployment and DevOps guides
- Testing strategies
- Security and monitoring

## License

MIT

Copyright (c) 2026 Example Organization

## Team

**Lead Developer**: Bryan Crockett (@bcroc)  
President and CEO, Example Organization  
Email: [maintainer@example.com](mailto:maintainer@example.com)

## Contact

For inquiries, please contact: [maintainer@example.com](mailto:maintainer@example.com)

## Status

**Current Phase:** Phase 3 - Feature Integration & Optimization (In Progress)  
**Last Updated:** February 15, 2026

### Feature Highlights

- **Theming System**: 6 multi-tone themes with light/dark mode and system preference detection.
- **Advanced Task Management**: Gantt charts, task dependencies, and subtasks for complex workflows.
- **Enhanced CRM**: Automated lead scoring, follow-up reminders, and contact relationship mapping.
- **Report Generator 2.0**: Advanced aggregations, grouping, and export support for Excel/PDF.
- **Self-Hosted Telemetry**: Built-in Prometheus metrics and localized performance monitoring.
- **Secure by Design**: Role-Based Access Control (RBAC), PII encryption, and Zod validation.

### Completed Features

- ✅ Full-stack TypeScript architecture (React 19 + Express)
- ✅ PostgreSQL database with CDM-aligned schema
- ✅ Neobrutalist & Modern UI themes with semantic tokens
- ✅ Advanced Dashboard with 11+ widget types
- ✅ Stripe Integration (Optional) for payment processing
- ✅ Comprehensive End-to-End Test Suite (Playwright)
- ✅ Performance-optimized API with Redis caching
- ✅ Multi-format Data Export (CSV/Excel/PDF)
- ✅ Enhanced CRM with automated workflows
- ✅ Customizable Site Generator for nonprofit portals

### In Progress
- 🚧 External Security Audit & Hardening
- 🚧 Advanced Workflow Automation Engine
- 🚧 Mobile App (React Native) foundations

See [Planning & Progress](docs/phases/planning-and-progress.md) for detailed roadmap.
