# Nonprofit Manager

A project by **West Cat Strategy Ltd.**

An all-in-one platform for nonprofit organizations to manage volunteers, events, donors, supporters, tasks, and communications.

**Contact**: [info@westcat.ca](mailto:info@westcat.ca)

## Project Overview

Nonprofit Manager helps nonprofit organizations streamline their operations through:
- **Volunteer Management**: Track volunteers, skills, and assignments
- **Event Scheduling**: Create and manage events with registration and check-in
- **Donation Tracking**: Record donations, issue receipts, and track donor history
- **Constituent Management**: Maintain supporter profiles and interactions
- **Task Management**: Organize tasks, assignments, and deadlines
- **Reporting & Analytics**: Generate insights and operational reports
- **Website Builder**: Create and manage nonprofit websites

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
├── planning-and-progress.md
├── product-spec.md
└── README.md
```

## Getting Started

### Quick Start with Docker (Recommended)

The fastest way to get started is with Docker. This runs the entire stack with a single command.

**Prerequisites:**
- Docker Desktop (or Docker Engine + Docker Compose)

**Start all services:**
```bash
# Build and start all containers (PostgreSQL, Redis, Backend, Frontend)
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

**Access the application:**

- Frontend: <http://localhost:8080>
- Backend API: <http://localhost:3000>
- Health check: <http://localhost:3000/health>

**Stop services:**
```bash
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

### Docker Development Mode

For development with hot reload:

```bash
# Start development containers
docker-compose -f docker-compose.dev.yml up --build -d

# Access:
# - Frontend (Vite): localhost:5173
# - Backend: localhost:3000
# - Debugger port: 9229
```

### Docker Commands Reference

```bash
# Rebuild a specific service
docker-compose up --build -d backend

# View logs for a specific service
docker-compose logs -f backend

# Execute command in running container
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres -d nonprofit_manager

# Run database migrations manually
docker-compose exec postgres psql -U postgres -d nonprofit_manager -f /docker-entrypoint-initdb.d/001_initial_schema.sql

# Check container health
docker-compose ps
docker inspect nonprofit-backend --format='{{.State.Health.Status}}'
```

---

### Manual Setup (Without Docker)

If you prefer not to use Docker, follow the manual setup below.

#### Prerequisites

- Node.js >= 20.x
- PostgreSQL >= 14.x
- npm or yarn

#### Database Setup

1. Create a PostgreSQL database:
```bash
createdb nonprofit_manager
```

2. Run migrations:
```bash
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql
```

3. (Optional) Load seed data:
```bash
psql -U postgres -d nonprofit_manager -f database/seeds/001_default_users.sql
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials and JWT secret.

5. Build TypeScript:
```bash
npm run build
```

6. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Development

### Local Runner (No GitHub Actions)

- **Full local CI**: `./scripts/local-ci.sh`
- **Fast local CI (no tests)**: `./scripts/local-ci.sh --fast`
- **Include npm audit**: `./scripts/local-ci.sh --audit`
- **Verify DB migrations (test DB only)**: `./scripts/local-ci.sh --db-verify`
- **Include builds**: `./scripts/local-ci.sh --build`
- **Install git hooks (optional)**: `./scripts/install-git-hooks.sh`

### Backend

- **Start dev server**: `npm run dev`
- **Build**: `npm run build`
- **Start production**: `npm start`
- **Run tests**: `npm test`
- **Lint**: `npm run lint`
- **Format**: `npm run format`

### Frontend

- **Start dev server**: `npm run dev`
- **Build**: `npm run build`
- **Preview build**: `npm run preview`
- **Lint**: `npm run lint`
- **Run tests**: `npm test`

## API Documentation

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires authentication)

### Core Modules (Coming Soon)

- `/api/volunteers` - Volunteer management
- `/api/events` - Event scheduling
- `/api/donations` - Donation tracking
- `/api/contacts` - Constituent management
- `/api/tasks` - Task management
- `/api/reports` - Reporting and analytics

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Environment variable configuration
- Helmet.js security headers
- CORS protection

## Deployment

The application is designed for self-hosting on:
- VPS (Virtual Private Server)
- Dedicated server
- Home lab

Future plans include cloud hosting options.

## Contributing

This is a new project. Contribution guidelines will be added as the project matures.

For development guidelines, see:
- [Agent Instructions](docs/AGENT_INSTRUCTIONS.md) - For AI assistants and developers
- [Conventions](docs/CONVENTIONS.md) - Code standards and best practices
- [Architecture Decisions](docs/ARCHITECTURE.md) - Key architectural choices

## Documentation

- [Planning & Progress](planning-and-progress.md) - Project roadmap and status updates
- [Product Specification](product-spec.md) - Requirements and features
- [Database Documentation](database/README.md) - Schema and migration guide
- [Agent Instructions](docs/AGENT_INSTRUCTIONS.md) - Development guidelines
- [Code Conventions](docs/CONVENTIONS.md) - Standards and patterns
- [Architecture Decisions](docs/ARCHITECTURE.md) - ADRs

## License

MIT

Copyright (c) 2026 West Cat Strategy Ltd.

## Team

**Lead Developer**: Bryan Crockett (@bcroc)  
President and CEO, West Cat Strategy Ltd.  
Email: [bryan.crockett@westcat.ca](mailto:bryan.crockett@westcat.ca)

## Contact

For inquiries, please contact: [info@westcat.ca](mailto:info@westcat.ca)

## Documentation

- [Agent Instructions](docs/AGENT_INSTRUCTIONS.md) - Development guidelines
- [Code Conventions](docs/CONVENTIONS.md) - Standards and patterns
- [Architecture Decisions](docs/ARCHITECTURE.md) - Design decisions
- [Deployment Guide](docs/DEPLOYMENT.md) - Local/production steps
- [Database Setup](docs/DB_SETUP.md) - Local DB + migrations
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and fixes
- [Release Checklist](docs/RELEASE_CHECKLIST.md) - Pre/post release steps
- [API Spec](docs/openapi.yaml) - OpenAPI skeleton

## Status

**Current Phase**: Foundation (Phase 1)
- ✅ Project structure created
- ✅ Backend API with TypeScript
- ✅ Frontend with React + TypeScript + Redux + Tailwind
- ✅ Database schema (CDM-aligned)
- ✅ Authentication system
- 🚧 Core modules (in planning)

See [planning-and-progress.md](planning-and-progress.md) for detailed roadmap.
