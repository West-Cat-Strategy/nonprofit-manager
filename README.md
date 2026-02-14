# Nonprofit Manager

A project by **West Cat Strategy Ltd.**

An all-in-one platform for nonprofit organizations to manage volunteers, events, donors, supporters, tasks, and communications.

**Contact**: [info@westcat.ca](mailto:info@westcat.ca)

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

### Quick Start
```bash
# Start all services
docker-compose up --build -d

# Access the application
# - Frontend: http://localhost:8080
# - Backend API: http://localhost:3000
```

### Development Mode
```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up --build -d

# Access
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
```

For manual setup and advanced Docker commands, see [Deployment Guide](docs/deployment/DEPLOYMENT.md).

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

For development guidelines, see:
- [Agent Instructions](docs/development/AGENT_INSTRUCTIONS.md)
- [Code Conventions](docs/development/CONVENTIONS.md)
- [Architecture Decisions](docs/development/ARCHITECTURE.md)

## Documentation

See [docs/README.md](docs/README.md) for comprehensive documentation including:
- API references and integration guides
- Deployment and setup instructions
- Feature documentation
- Security and testing guides

See [docs/README.md](docs/README.md) for comprehensive documentation including:
- API references and integration guides
- Deployment and setup instructions
- Feature documentation
- Security and testing guides

## License

MIT

Copyright (c) 2026 West Cat Strategy Ltd.

## Team

**Lead Developer**: Bryan Crockett (@bcroc)  
President and CEO, West Cat Strategy Ltd.  
Email: [bryan.crockett@westcat.ca](mailto:bryan.crockett@westcat.ca)

## Contact

For inquiries, please contact: [info@westcat.ca](mailto:info@westcat.ca)

## Status

**Current Phase:** Phase 2 - Validation & Authorization (In Progress)  
**Last Updated:** February 14, 2026

### Completed Features
- ✅ Full-stack TypeScript application (React + Express)
- ✅ PostgreSQL database with CDM-aligned schema
- ✅ Authentication & authorization system
- ✅ Customizable dashboards with 11+ widget types
- ✅ Analytics alerts and notifications
- ✅ Self-hosted Plausible analytics integration
- ✅ Performance optimization (caching, indexing)
- ✅ Data export (CSV/Excel)
- ✅ Role-based security and data masking
- ✅ Comprehensive API documentation

### In Progress
- 🚧 Zod validation framework implementation
- 🚧 Permission system and auth guards
- 🚧 Core business logic modules

See [Planning & Progress](docs/phases/planning-and-progress.md) for detailed roadmap.
