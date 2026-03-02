# Agent Instructions for Nonprofit Manager

## Project Context

This is a full-stack TypeScript application for nonprofit management. The codebase follows industry best practices, uses the Common Data Model (CDM) for data schemas, and prioritizes security, scalability, and maintainability.

## Core Principles

1. **TypeScript First**: All code must be written in TypeScript with strict type checking
2. **CDM Alignment**: Database schemas and entities must align with Microsoft Common Data Model conventions
3. **Security**: Authentication, authorization, and data protection are paramount
4. **Testing**: All features require comprehensive tests
5. **Documentation**: Code must be well-documented and maintainable

## Multi-Agent Protocol (Required)

This repository is optimized for **parallel agent work**. To prevent overlap:

1. **Sign out a task** in `planning-and-progress.md` Workboard before coding.
2. **One active task per agent** unless explicitly coordinated.
3. **Use task IDs** in commits and PR titles (example: `P1-T1.6-CI`).
4. **Update the Workboard** when status changes (Ready → In Progress → Review → Done).
5. **Blocker handling**: move task to Blocked with a clear reason + next step.
6. **No untracked work**: if a task isn’t in the Workboard, add it first.

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM/Query**: `pg` service-layer queries (no ORM in active backend runtime)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Zod via `@middleware/zodValidation`
- **Logging**: Winston

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **UI Components**: Headless UI, Heroicons

### Database
- **RDBMS**: PostgreSQL 14+
- **Schema**: CDM-aligned entities
- **Migrations**: Raw SQL files (consider moving to migration tool)

## Development Guidelines

### Code Organization

#### Backend Structure
```
backend/src/
├── config/         # Configuration files (database, logger, etc.)
├── controllers/    # Request handlers (thin layer)
├── middleware/     # Express middleware (auth, error handling, validation)
├── models/         # Data models and database queries
├── routes/         # API route definitions
├── services/       # Business logic (thick layer)
├── types/          # TypeScript type definitions
├── utils/          # Helper functions
└── index.ts        # Application entry point
```

#### Frontend Structure
```
frontend/src/
├── components/     # Reusable UI components
├── pages/          # Page-level components
├── services/       # API client services
├── store/          # Redux store, slices, hooks
├── types/          # TypeScript type definitions
├── utils/          # Helper functions
├── App.tsx         # Root component
└── main.tsx        # Application entry point
```

### Code Standards

#### TypeScript
- Use `strict` mode in tsconfig.json
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown
- Use utility types (Partial, Pick, Omit, etc.) where appropriate

#### Naming Conventions
- **Files**: camelCase for utilities, PascalCase for components/classes
- **Variables/Functions**: camelCase
- **Classes/Interfaces/Types**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Database**: snake_case for tables and columns (CDM convention)

#### API Design
- RESTful endpoints
- Versioning: `/api/resource` for legacy routes and `/api/v2/resource` for modular cutovers
- Plural nouns for collections: `/api/volunteers`
- Nested resources where appropriate: `/api/events/:id/registrations`
- Use proper HTTP methods: GET, POST, PUT, PATCH, DELETE
- Standard HTTP status codes

#### Error Handling
- Use custom error classes extending Error
- Include statusCode property for HTTP errors
- Centralized error handling middleware
- Never expose sensitive information in error messages
- Log errors with appropriate context

#### Security
- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user input
- Sanitize data before database queries
- Use parameterized queries (prevent SQL injection)
- Implement rate limiting on authentication endpoints
- Use HTTPS in production
- Set secure HTTP headers with Helmet.js
- Implement CORS appropriately

### Testing Strategy

#### Backend Tests
- Unit tests for business logic in services
- Integration tests for API endpoints
- Database tests with test database
- Use Jest as test runner
- Aim for >80% code coverage

#### Frontend Tests
- Component tests with React Testing Library
- Integration tests for user flows
- E2E tests with Playwright (active in `e2e/`)
- Test user interactions, not implementation details

### Git Workflow

#### Commit Messages
Follow Conventional Commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example: `feat: add volunteer skill matching algorithm`

#### Pull Requests
- Keep PRs focused and small
- Include description of changes
- Reference related issues
- Ensure all tests pass
- Update documentation as needed

### Database Guidelines

#### Schema Design
- Follow CDM entity naming conventions
- Use UUIDs for primary keys
- Include audit fields: created_at, updated_at, created_by, modified_by
- Use proper foreign key constraints
- Add indexes for frequently queried columns
- Use meaningful constraint names

#### Migrations
- Each migration in separate numbered file
- Include both up and down migrations (future)
- Test migrations on development database first
- Never modify existing migration files
- Document breaking changes

### API Response Formats

#### Success Response
```typescript
{
  "data": { /* resource or array */ },
  "message": "Optional success message"
}
```

#### Error Response
```typescript
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": { /* optional additional context */ }
  }
}
```

#### Paginated Response
```typescript
{
  "data": [ /* array of resources */ ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Common Tasks

### Adding a New Entity/Module

1. **Database**
   - Create migration file: `database/migrations/00X_add_entity_name.sql`
   - Define table with CDM-aligned schema
   - Add appropriate indexes and constraints
   - Run migration and test

2. **Backend**
   - Create type definitions in `types/entityName.ts`
   - Create service in `services/entityNameService.ts` (business logic)
   - Create controller in `controllers/entityNameController.ts`
   - Create routes in `routes/entityName.ts`
   - Add routes to main app in `index.ts`
   - Write tests

3. **Frontend**
   - Create Redux slice in `store/slices/entityNameSlice.ts`
   - Create API service in `services/entityNameService.ts`
   - Create page components in `pages/EntityName/`
   - Add routes to `App.tsx`
   - Create reusable components if needed
   - Write tests

### Adding Authentication to Endpoint

```typescript
import { authenticate, authorize } from '../middleware/auth';

router.get('/protected-route', 
  authenticate, 
  authorize('admin', 'manager'),
  controller.handler
);
```

### Querying Database

```typescript
// Use parameterized queries
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// Type the result
const users = result.rows as User[];
```

### Making API Calls (Frontend)

```typescript
// Use the centralized API client
import api from '../services/api';

const response = await api.get<EntityType>('/endpoint');
const data = response.data;
```

## Current Status

See [docs/phases/planning-and-progress.md](../phases/planning-and-progress.md) for:
- Current phase and progress
- Completed features
- Upcoming tasks
- Timeline and milestones

## Priorities

### Immediate (Phase 1)
1. Complete foundation setup
2. Test authentication flow
3. Set up local CI runner
4. Begin core module APIs

### Short-term (Phase 2-3)
1. Implement all core modules
2. Build dashboard and reporting
3. Comprehensive testing

### Long-term (Phase 4-6)
1. External integrations
2. Website builder
3. Production deployment

## Questions or Issues?

- Check existing documentation in project files
- Review planning-and-progress.md for project status
- Check product-spec.md for requirements
- Refer to database/README.md for schema details

## When Making Changes

1. **Sign out a task** in the Workboard before starting work
2. **Always update planning-and-progress.md** with status changes
3. Document architectural decisions
4. Update relevant README files
5. Keep types and interfaces in sync across frontend/backend
6. Run linters and formatters before committing
7. Write or update tests for changed code
8. Update API documentation if endpoints change
