# Architecture Decision Records (ADRs)

This document records important architectural decisions made during the development of Nonprofit Manager.

## ADR-001: TypeScript as Primary Language

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Need to choose between JavaScript and TypeScript for the project.

**Decision**:
Use TypeScript for both frontend and backend code.

**Rationale**:
- Type safety reduces runtime errors
- Better IDE support and autocompletion
- Self-documenting code through type definitions
- Easier refactoring and maintenance
- Industry best practice for large applications

**Consequences**:
- Slightly steeper learning curve for contributors
- Additional build step required
- Better long-term maintainability
- Reduced bugs in production

---

## ADR-002: Redux Toolkit for State Management

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Need centralized state management for frontend application.

**Decision**:
Use Redux Toolkit instead of vanilla Redux, Context API, or other solutions.

**Rationale**:
- Industry standard with large ecosystem
- Redux Toolkit reduces boilerplate significantly
- Built-in dev tools
- Excellent TypeScript support
- Predictable state updates
- Time-travel debugging

**Alternatives Considered**:
- Context API: Too limited for complex state
- MobX: Less popular, different paradigm
- Zustand: Simpler but less mature ecosystem

**Consequences**:
- Learning curve for Redux concepts
- Slightly more verbose than simpler solutions
- Powerful debugging and middleware capabilities

---

## ADR-003: PostgreSQL as Primary Database

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Need to choose a database for the application.

**Decision**:
Use PostgreSQL as the primary relational database.

**Rationale**:
- Robust and proven for nonprofit/CRM use cases
- Excellent support for complex queries and relationships
- Strong ACID compliance
- JSON support for flexible data
- Open source with great community
- Aligns well with CDM entity relationships

**Alternatives Considered**:
- MySQL: Less feature-rich than PostgreSQL
- MongoDB: NoSQL doesn't fit relational data model
- SQLite: Not suitable for production scale

**Consequences**:
- Need PostgreSQL expertise
- More setup than serverless options
- Excellent performance and reliability

---

## ADR-004: Common Data Model (CDM) Schema Alignment

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Need a consistent approach to database schema design.

**Decision**:
Align database schemas with Microsoft Common Data Model conventions.

**Rationale**:
- Industry-standard entity definitions
- Better interoperability with other systems
- Clear naming conventions
- Reduces design decisions through established patterns
- Easier for developers familiar with CDM
- Future-proof for integrations

**Consequences**:
- Must learn and follow CDM conventions
- May not fit all use cases perfectly
- Can extend CDM entities as needed
- Documentation required for extensions

---

## ADR-005: JWT for Authentication

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Need authentication mechanism for API.

**Decision**:
Use JSON Web Tokens (JWT) for stateless authentication.

**Rationale**:
- Stateless - no server-side session storage needed
- Scalable across multiple servers
- Self-contained - includes user info and expiration
- Industry standard for APIs
- Works well with mobile clients

**Alternatives Considered**:
- Session cookies: Requires server-side storage
- OAuth2: Overkill for first-party application

**Consequences**:
- Cannot revoke tokens before expiration (mitigate with short expiration)
- Token size larger than session IDs
- Need refresh token strategy (future)

---

## ADR-006: Monorepo Structure

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Organize codebase structure for frontend, backend, and database.

**Decision**:
Use monorepo with separate backend/, frontend/, and database/ directories.

**Rationale**:
- Single repository simplifies development
- Shared types and configurations
- Atomic commits across frontend/backend
- Easier to maintain consistency
- Simpler for small team

**Alternatives Considered**:
- Separate repositories: More complex to coordinate
- Monorepo with tools (Nx, Turborepo): Overkill for current scale

**Consequences**:
- Larger repository size
- Need clear directory organization
- Simplified development workflow

---

## ADR-007: Vite as Frontend Build Tool

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Need build tool for React application.

**Decision**:
Use Vite instead of Create React App or webpack.

**Rationale**:
- Extremely fast dev server startup
- Hot module replacement (HMR) is instant
- Modern architecture with native ES modules
- Better TypeScript support
- Smaller production bundles
- Growing as new standard for React apps

**Alternatives Considered**:
- Create React App: Deprecated, slower builds
- webpack: More complex configuration
- Parcel: Less popular ecosystem

**Consequences**:
- Requires different configuration approach than CRA
- Excellent developer experience
- Fast build times

---

## ADR-008: Tailwind CSS for Styling

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Need CSS approach for frontend styling.

**Decision**:
Use Tailwind CSS utility-first framework.

**Rationale**:
- Rapid UI development
- Consistent design system
- Small production bundle (purges unused styles)
- No CSS naming conflicts
- Responsive design built-in
- Industry standard for modern apps

**Alternatives Considered**:
- CSS Modules: More boilerplate
- Styled Components: Runtime overhead
- Plain CSS: Harder to maintain consistency

**Consequences**:
- HTML classes can get verbose
- Learning curve for utility-first approach
- Very fast UI development once familiar

---

## ADR-009: Direct SQL vs ORM

**Date**: February 1, 2026

**Status**: Accepted (Temporary)

**Context**:
Choose between writing raw SQL or using an ORM.

**Decision**:
Start with direct SQL using pg library, consider ORM later.

**Rationale**:
- Full control over queries
- Better performance visibility
- Simpler for initial development
- Can add ORM (Prisma/TypeORM) later if needed

**Future Consideration**:
Re-evaluate after Phase 1. Prisma or TypeORM may improve developer experience.

**Consequences**:
- More manual query writing
- Need to manage migrations manually
- Direct control over performance

---

## ADR-010: Self-Hosting First, Cloud Later

**Date**: February 1, 2026

**Status**: Accepted

**Context**:
Deployment strategy for the application.

**Decision**:
Design for self-hosting (VPS, dedicated server, home lab) with cloud migration path.

**Rationale**:
- Lower cost for nonprofits
- Data sovereignty and control
- Aligns with target user base
- Can add cloud deployment later

**Consequences**:
- Need deployment documentation
- Users responsible for infrastructure
- Design must support both approaches

---

## Template for Future ADRs

```markdown
## ADR-XXX: Title

**Date**: YYYY-MM-DD

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-YYY

**Context**:
What is the issue that we're seeing that is motivating this decision or change?

**Decision**:
What is the change that we're proposing and/or doing?

**Rationale**:
Why are we making this decision?

**Alternatives Considered**:
What other options were evaluated?

**Consequences**:
What becomes easier or more difficult as a result of this change?
```
