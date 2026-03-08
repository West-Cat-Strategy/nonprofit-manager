# Nonprofit Manager

Nonprofit Manager is an all-in-one platform for nonprofit organizations to manage people, programs, fundraising, communications, and public-facing web experiences.

Built by **Example Organization**

**Last updated:** March 8, 2026

## Overview

Nonprofit Manager brings core nonprofit operations into a single product:

- **People and case management** for contacts, supporters, donors, volunteers, and case workflows
- **Events and volunteer coordination** with registrations, reminders, check-in, and staffing
- **Fundraising and payments** with donation tracking, receipts, and payment integrations
- **Portal and communication flows** for client access, messages, documents, forms, and appointments
- **Reporting and analytics** for dashboards, exports, alerts, and operational visibility
- **Website publishing tools** for managing nonprofit web content alongside operational data

The repository contains the full stack that powers those experiences: API, frontend, database assets, end-to-end tests, deployment tooling, and project documentation.

## Stack and Architecture

### Core stack

- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Redis, Zod
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Redux Toolkit
- **Testing:** Jest, Vitest, Playwright
- **Operations:** Docker Compose, Makefile-based local CI, deployment scripts

### Current application shape

- [`backend/`](backend/) contains the Express API, organized around feature modules in [`backend/src/modules`](backend/src/modules) with shared middleware, validations, services, and route registrars.
- [`frontend/`](frontend/) contains the React application, with feature-owned code in [`frontend/src/features`](frontend/src/features), shared routes in [`frontend/src/routes`](frontend/src/routes), and app-wide state in [`frontend/src/store`](frontend/src/store).
- [`database/`](database/) contains schema, migration, initialization, and seed assets.
- [`docs/`](docs/) contains architecture notes, API references, deployment runbooks, testing guides, and the active project workboard.

### Backend pattern

The backend follows a route-to-controller-to-service flow with validation and auth guardrails around each request:

`Route -> Controller -> Service -> Database`

This keeps HTTP concerns, authorization, business logic, and data access separated while the Phase 4 modularity refactor continues to consolidate legacy and v2 surfaces.

## Quick Start

### Prerequisites

- Docker Desktop, or Docker Engine with Compose support
- Node.js `20.19+`
- npm `10+`

### Local development

```bash
make dev
```

This starts the local development stack with hot reload.

Local endpoints:

- Frontend: `http://localhost:8005`
- Backend API: `http://localhost:8004`
- PostgreSQL: `localhost:8002`
- Redis: `localhost:8003`

### Common commands

```bash
make ci
make test
make lint
make typecheck
```

For deeper setup details, environment notes, and deployment workflows, use the docs linked below instead of relying on the root README.

## Documentation

Start with [`docs/INDEX.md`](docs/INDEX.md) for the full documentation map.

Useful entry points:

- [`docs/development/GETTING_STARTED.md`](docs/development/GETTING_STARTED.md) for local setup
- [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution workflow
- [`docs/development/ARCHITECTURE.md`](docs/development/ARCHITECTURE.md) for system design
- [`docs/api/README.md`](docs/api/README.md) for API references and integration docs
- [`docs/testing/TESTING.md`](docs/testing/TESTING.md) for test strategy and commands
- [`docs/deployment/DEPLOYMENT.md`](docs/deployment/DEPLOYMENT.md) for deployment guidance
- [`docs/deployment/production.md`](docs/deployment/production.md) for the production production runbook
- [`docs/phases/planning-and-progress.md`](docs/phases/planning-and-progress.md) for the active workboard and current execution status
- [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for service-specific details

## Contributing

Contributors should start with the setup and workflow docs:

1. [`docs/development/GETTING_STARTED.md`](docs/development/GETTING_STARTED.md)
2. [`CONTRIBUTING.md`](CONTRIBUTING.md)
3. [`docs/development/CONVENTIONS.md`](docs/development/CONVENTIONS.md)
4. [`docs/development/ARCHITECTURE.md`](docs/development/ARCHITECTURE.md)

## Current Status

The project is currently in **Phase 4: Modularity Refactor**, with active closure and follow-on work tracked in [`docs/phases/planning-and-progress.md`](docs/phases/planning-and-progress.md).

That work is focused on consolidating backend and frontend ownership boundaries, preserving route and UI contracts during migration, and tightening policy and verification guardrails across the stack.

## License

MIT

Copyright (c) 2026 Example Organization

## Contact

For project or product inquiries, contact [maintainer@example.com](mailto:maintainer@example.com).
