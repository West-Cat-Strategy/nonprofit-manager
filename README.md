# Nonprofit Manager

A project by **West Cat Strategy Ltd.**

An all-in-one platform for nonprofit organizations to manage volunteers, events, donors, supporters, tasks, and communications.

**Contact**: [info@westcat.ca](mailto:info@westcat.ca)

## Project Overview

Last updated: February 3, 2026.

Nonprofit Manager helps nonprofit organizations streamline their operations through:
- **Volunteer Management**: Track volunteers, skills, and assignments
- **Event Scheduling**: Create and manage events with registration and check-in
- **Donation Tracking**: Record donations, issue receipts, and track donor history
- **Constituent Management**: Maintain supporter profiles and interactions
- **Task Management**: Organize tasks, assignments, and deadlines
- **Reporting & Analytics**: Generate insights and operational reports
- **Website Builder**: Create and manage nonprofit websites
- **Customizable Dashboards**: Drag-and-drop widgets for personalized views
- **Analytics Alerts**: Automated notifications for key metric changes
- **Product Analytics**: Privacy-first website analytics with Plausible
- **Data Export**: Export analytics to CSV and Excel formats
- **Performance Optimization**: Caching and indexing for fast queries

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

## Key Features

### Advanced Analytics & Dashboards

#### Customizable Dashboards
- **Drag-and-Drop Interface**: Rearrange and resize widgets with react-grid-layout
- **11 Widget Types**: Donations, volunteers, events, cases, analytics, and more
- **Multiple Dashboards**: Create and save different dashboard configurations
- **Responsive Layouts**: Optimized for desktop, tablet, and mobile
- **Persistent Settings**: Dashboard preferences saved per user

See [Dashboard Customization Docs](docs/DASHBOARD_CUSTOMIZATION.md)

#### Analytics Alerts
- **Real-Time Monitoring**: Track key metrics automatically
- **6 Metric Types**: Donations, volunteer hours, events, cases, engagement
- **5 Condition Types**: Exceeds, drops below, changes by %, anomaly detection, trend reversal
- **Multi-Channel Notifications**: Email, in-app, Slack, webhooks
- **Severity Levels**: Low, medium, high, critical
- **Alert History**: View triggered alerts with acknowledgment tracking

See [API Reference - Alerts](docs/API_REFERENCE_DASHBOARD_ALERTS.md#alerts-api)

### Product Analytics

#### Plausible Analytics Integration
- **Privacy-First**: No cookies, GDPR/CCPA compliant by default
- **Lightweight**: <1KB tracking script
- **Self-Hosted**: Full data ownership and control
- **Custom Events**: Track 20+ nonprofit-specific actions (donations, registrations, etc.)
- **Dashboard Widget**: View analytics directly in the app
- **Metrics**: Visitors, pageviews, bounce rate, visit duration

See [Plausible Setup Guide](docs/PLAUSIBLE_SETUP.md)

### Performance Optimization

#### Database Optimization
- **30+ Indexes**: Strategic indexes for all analytics queries
- **Query Performance**: 30-100x faster for date range queries
- **Covering Indexes**: Optimized for common query patterns

#### Intelligent Caching
- **In-Memory Cache**: Automatic caching with TTL (Time To Live)
- **Smart Invalidation**: Cache updates on data changes
- **Cache Statistics**: Monitor cache hit rates and effectiveness
- **Configurable TTL**: 1-10 minutes depending on data volatility

See [Performance Optimization Guide](docs/PERFORMANCE_OPTIMIZATION.md)

### Data Export

#### CSV & Excel Export
- **5 Export Types**: Analytics summary, donations, volunteer hours, events, comprehensive
- **Multiple Formats**: CSV (simple) and Excel (multi-sheet)
- **Flexible Filtering**: Date ranges, donor types, payment methods, and more
- **Automated Cleanup**: Files auto-delete after download
- **Automation Ready**: API endpoints for scheduled exports

See [Export API Reference](docs/API_REFERENCE_EXPORT.md)

### Security & Compliance

#### Data Privacy
- **Role-Based Data Masking**: Financial data masked based on user role
- **Three-Tier System**: Admin (full access), Manager (rounded), Staff (ranges)
- **Automatic Application**: Applied to all analytics endpoints
- **Audit Logging**: Track who accessed what data and when

#### Access Control
- **Four Permission Levels**: Admin, Manager, Staff, Volunteer
- **Granular Permissions**: Control access to analytics, financial data, and exports
- **JWT Authentication**: Secure token-based authentication
- **Permission Middleware**: Automatic permission checking on protected routes

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

Test pull requests to verify workflow integrations are welcome.

For development guidelines, see:
- [Agent Instructions](docs/AGENT_INSTRUCTIONS.md) - For AI assistants and developers
- [Conventions](docs/CONVENTIONS.md) - Code standards and best practices
- [Architecture Decisions](docs/ARCHITECTURE.md) - Key architectural choices

## Documentation

### Project Documentation

- [Planning & Progress](planning-and-progress.md) - Project roadmap and status updates
- [Product Specification](product-spec.md) - Requirements and features
- [Database Documentation](database/README.md) - Schema and migration guide

### Development Guidelines

- [Agent Instructions](docs/AGENT_INSTRUCTIONS.md) - Development guidelines for AI assistants
- [Code Conventions](docs/CONVENTIONS.md) - Standards and patterns
- [Architecture Decisions](docs/ARCHITECTURE.md) - ADRs and design choices

### Feature Documentation

- [Dashboard Customization](docs/DASHBOARD_CUSTOMIZATION.md) - Drag-and-drop dashboard guide
- [Plausible Analytics Setup](docs/PLAUSIBLE_SETUP.md) - Self-hosted analytics integration
- [Performance Optimization](docs/PERFORMANCE_OPTIMIZATION.md) - Caching and database optimization
- [Product Analytics Research](docs/PRODUCT_ANALYTICS_RESEARCH.md) - Analytics platform comparison

### API References

- [Main API Reference](docs/API_REFERENCE.md) - Core API endpoints
- [Analytics API](docs/API_REFERENCE_ANALYTICS.md) - Analytics endpoints
- [Dashboard & Alerts API](docs/API_REFERENCE_DASHBOARD_ALERTS.md) - Dashboard and alerts endpoints
- [Export API](docs/API_REFERENCE_EXPORT.md) - CSV and Excel export endpoints

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

**Current Phase**: Analytics & Dashboards (Week 3-4 Complete)

### Completed Features

#### Week 1-2: Foundation

- ✅ Project structure created
- ✅ Backend API with TypeScript
- ✅ Frontend with React + TypeScript + Redux + Tailwind
- ✅ Database schema (CDM-aligned)
- ✅ Authentication system

#### Week 3-4: Advanced Analytics

- ✅ Customizable drag-and-drop dashboards (11 widget types)
- ✅ Analytics alerts with multi-channel notifications
- ✅ Plausible Analytics integration (self-hosted, privacy-first)
- ✅ Performance optimization (caching, database indexes)
- ✅ CSV/Excel export functionality
- ✅ Role-based data masking
- ✅ Comprehensive API documentation

#### In Progress

- 🚧 Core modules (volunteers, events, donations, contacts)
- 🚧 Task management system
- 🚧 Website builder

See [planning-and-progress.md](planning-and-progress.md) for detailed roadmap.
