# Nonprofit Manager - Quick Reference

## Project Structure
```
nonprofit-manager/
├── backend/           # Express.js + TypeScript API
├── frontend/          # React + TypeScript + Redux + Tailwind
├── database/          # PostgreSQL migrations and schema
└── docs/             # Project documentation
```

## Key Commands

### Local Runner (No GitHub Actions)
```bash
./scripts/local-ci.sh          # Lint + type-check + tests
./scripts/local-ci.sh --fast   # Lint + type-check only
./scripts/local-ci.sh --audit  # Add npm audit (high+)
./scripts/local-ci.sh --db-verify # Verify migrations against *_test DB
./scripts/local-ci.sh --build  # Build backend + frontend
./scripts/install-git-hooks.sh # Optional pre-commit hook
```

### Backend
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Build TypeScript
npm start            # Start production server
npm test             # Run tests
npm run lint         # Check code style
```

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests (Vitest)
```

### Database
```bash
# Create database
createdb nonprofit_manager

# Run migration
psql -U postgres -d nonprofit_manager -f database/migrations/001_initial_schema.sql

# Load seed data
psql -U postgres -d nonprofit_manager -f database/seeds/001_default_users.sql
```

## Current Status
**Phase**: Foundation (Phase 1) - In Progress  
**Last Updated**: February 1, 2026

See [planning-and-progress.md](planning-and-progress.md) for detailed status.

## Tech Stack Summary
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, JWT
- **Frontend**: React, Redux, TypeScript, Tailwind CSS, Vite
- **Database**: PostgreSQL with CDM-aligned schema

## Important Files
- `planning-and-progress.md` - Roadmap and status
- `product-spec.md` - Requirements
- `README.md` - Setup instructions
- `docs/AGENT_INSTRUCTIONS.md` - Development guide
- `docs/CONVENTIONS.md` - Code standards
- `docs/ARCHITECTURE.md` - Design decisions

## Environment Setup

### Backend .env
```bash
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nonprofit_manager
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### Backend .env.test (example)
```bash
NODE_ENV=test
DB_NAME=nonprofit_manager_test
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=test_secret
```

### Frontend .env
```bash
VITE_API_URL=http://localhost:3000/api
```

## API Endpoints (Current)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (authenticated)

## Next Steps
1. ✅ Install backend dependencies
2. ✅ Install frontend dependencies
3. ⏳ Set up local PostgreSQL
4. ⏳ Run database migrations
5. ⏳ Test authentication flow
6. ⏳ Begin core module development

## Common Issues

### TypeScript errors
```bash
npm run build  # Check for compilation errors
```

### Database connection errors
- Verify PostgreSQL is running
- Check credentials in .env
- Ensure database exists

### Port conflicts
- Backend default: 3000
- Frontend default: 5173
- Change in .env if needed

## Getting Help
- Check documentation in `docs/` directory
- Review planning-and-progress.md for current status
- See CONVENTIONS.md for code standards
