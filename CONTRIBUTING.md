# Contributing to Nonprofit Manager

**Last Updated**: 2026-02-18

Thank you for contributing! This guide helps you get started with development, understand our workflow, and submit high-quality code.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Git Workflow](#git-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Review Process](#code-review-process)
- [Common Issues](#common-issues)

---

## Quick Start

1. **Read the documentation** (5 min):
   - [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) — Full setup guide
   - [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md) — Code style guide

2. **Set up your environment** (30 min):
   - Follow [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for frontend and/or backend setup

3. **Make your change** (varies):
   - Create a feature branch: `git checkout -b feature/your-feature-name`
   - Follow code standards in [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md)
   - Write/update tests to maintain 80%+ coverage
   - Commit with clear messages (see [Git Workflow](#git-workflow))

4. **Submit a pull request**:
   - See [Submitting a Pull Request](#submitting-a-pull-request) section below

---

## Development Setup

### Full Setup (30-45 minutes)

Complete setup for both frontend and backend:

```bash
# Clone the repository
git clone https://github.com/West-Cat-Strategy/nonprofit-manager.git
cd nonprofit-manager

# Follow the platform-specific setup
# macOS/Linux: Follow docs/development/GETTING_STARTED.md
# Windows: Follow docs/development/GETTING_STARTED.md (WSL2 recommended)

# Install dependencies
npm install --workspaces

# Start development services
npm run dev:all  # Or start each service individually
```

For detailed instructions, see [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md).

### Frontend-Only Setup (20 minutes)

If you're only working on frontend:

```bash
git clone https://github.com/West-Cat-Strategy/nonprofit-manager.git
cd nonprofit-manager/frontend

npm install
npm run dev
```

See [frontend/SETUP.md](frontend/SETUP.md) for details.

### Backend-Only Setup (20 minutes)

If you're only working on backend:

```bash
git clone https://github.com/West-Cat-Strategy/nonprofit-manager.git
cd nonprofit-manager/backend

npm install
npm run dev
```

See [backend/README.md](backend/README.md) for details.

---

## Git Workflow

### Branch Naming

Use descriptive branch names following this pattern:

```
feature/short-description      # New feature
bugfix/issue-description       # Bug fix
docs/update-description        # Documentation
refactor/component-name        # Code refactoring
test/improvement-area          # Test improvements
```

**Examples**:
- ✅ `feature/add-volunteer-portal`
- ✅ `bugfix/fix-auth-token-expiry`
- ✅ `docs/update-api-reference`
- ❌ `myfeature` (too vague)
- ❌ `fix-stuff` (too generic)

### Commit Messages

Write clear, descriptive commit messages:

```
[Type] Brief description (50 chars max)

Optional longer explanation if the change is complex.
- List any side effects
- Note any breaking changes
- Reference related issues: Closes #123

Example:
feat: Add Zod validation to volunteer endpoints

- Updated 4 volunteer route handlers with validation middleware
- Created volunteerValidationSchemas module
- Added 12 validation tests
- Closes #234
```

**Types**:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `refactor:` — Code restructuring (no functionality change)
- `test:` — Test updates only
- `chore:` — Dependencies, tooling, etc.
- `style:` — Formatting (no functional change)

### Push to GitHub

```bash
git push origin feature/your-feature-name
```

GitHub Actions will automatically run tests on your branch.

---

## Code Standards

All code must follow the standards documented in [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md).

### Key Rules

**TypeScript**:
- Strict null checking enabled
- No `any` types (use `unknown` and narrow with type guards)
- Explicit return types on functions
- Use `const` by default, then `let` if needed

**Backend (Node.js + Express)**:
- Follow MVC pattern: Route → Controller → Service → Database
- Validate all inputs with Zod schemas
- Use dependency injection via container
- Write integration tests for new endpoints

**Frontend (React + TypeScript)**:
- Functional components with hooks
- Component testing with Vitest/React Testing Library
- No inline styles (use Tailwind utilities)
- Follow Neo-brutalist design system

**Documentation**:
- Add JSDoc comments for public functions
- Required for complex logic: explain the "why"
- Update related docs when changing behavior

For complete details, see [docs/development/CONVENTIONS.md](docs/development/CONVENTIONS.md).

---

## Testing Requirements

**Backend**: Minimum 80% code coverage
- Unit tests for services and utilities: `npm test` in backend/
- Integration tests for API endpoints: `npm run test:integration`
- Run before pushing: `npm run test:coverage`

**Frontend**: Updated tests for all components
- Component tests: `npm test` in frontend/
- E2E tests: `npm test` in e2e/ (if relevant)

**CI/CD Verification**:
- Push triggers GitHub Actions tests automatically
- All tests must pass before merge
- No TypeScript errors or lint issues allowed

See [docs/testing/TESTING.md](docs/testing/TESTING.md) for testing strategies and patterns.

---

## Submitting a Pull Request

### Before Creating PR

- [ ] Tests pass locally (`npm test` in relevant directory)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Code follows [CONVENTIONS.md](docs/development/CONVENTIONS.md)
- [ ] Documentation is updated if behavior changed
- [ ] Commit messages are clear and descriptive

### Creating the PR

```bash
# 1. Push your branch
git push origin feature/your-feature-name

# 2. Go to GitHub and create a pull request
# Title: Clear description of changes
# Description: Follow template below
```

### PR Description Template

```markdown
## Description
Brief explanation of what this PR does and why.

## Related Issue
Closes #123 (optional, if fixing a reported issue)

## Changes
- What changed 1
- What changed 2
- What changed 3

## Type of Change
- [ ] Feature (non-breaking new feature)
- [ ] Bug fix (non-breaking bug fix)
- [ ] Breaking change (feature/fix that breaks existing functionality)
- [ ] Documentation update

## Testing
Describe how you tested these changes:
- Manual test: "Ran feature X and verified Y"
- Unit tests: "Added 5 tests covering edge cases"
- E2E tests: "Tested auth flow end-to-end"

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] TypeScript has no errors
- [ ] Documentation is updated
- [ ] No new console.log or debug statements (except debug builds)
```

### After Creating PR

1. GitHub Actions runs automated tests (wait for ✅ or ❌)
2. Code review from team members
3. Address feedback and push updates
4. Get approval from at least one maintainer
5. PR is merged and auto-deployed (config dependent)

---

## Code Review Process

### What We Look For

✅ **Good**:
- Follows CONVENTIONS.md standards
- Has clear commit messages
- Tests verify the behavior
- Documentation is updated
- No unnecessary complexity

🟡 **Needs Work**:
- Uses patterns not in CONVENTIONS.md (discuss first)
- Missing test coverage
- Hard to understand (needs refactoring or comments)
- Breaks existing functionality without migration plan
- Significantly different style from codebase

❌ **Blocker**:
- No tests for new features
- TypeScript errors or lint failures
- Doesn't actually fix the stated issue
- Introduces security vulnerability

### Responding to Feedback

- Re-read the suggestion carefully
- Clarify if you don't understand (ask!)
- Push fixes as new commits (don't force-push during review)
- Mark suggestions as resolved once addressed
- Reply to comments explaining the fix

### Multiple Reviewers

We may assign multiple reviewers for:
- Large changes (100+ lines)
- Security-related code
- Architecture changes
- Changes affecting multiple services

Each reviewer must approve before merge.

---

## Common Issues

### "Tests are failing locally"

1. Ensure you're in the right directory: `cd backend` or `cd frontend`
2. Run `npm install` to refresh dependencies
3. Check Node.js version matches project (see GETTING_STARTED.md)
4. Clear cache: `npm run clean` or delete `node_modules/`
5. Try test again: `npm test`

If still stuck, ask in GitHub issue or PR comment.

### "TypeScript errors in my code"

```bash
npm run typecheck  # See all errors
# Fix errors based on suggestions
npm run typecheck  # Verify errors are gone
```

### "Git says my branch is out of sync"

```bash
# Update your branch with latest main
git fetch origin
git rebase origin/main
# Resolve any conflicts, then push
git push origin feature/your-feature-name --force-with-lease
```

### "I need to make changes based on feedback"

```bash
# Make changes
git add .
git commit -m "Address code review feedback"
# Push (don't force-push, so reviewer sees incremental changes)
git push origin feature/your-feature-name
```

### "Can I work on multiple issues at once?"

**Not recommended**. Keep each PR focused:
- One feature per branch
- One bug fix per branch
- Easier to review, test, and revert if needed

If changes are interdependent, discuss in GitHub issue first.

---

## Getting Help

**Questions?**
- Check [docs/development/GETTING_STARTED.md](docs/development/GETTING_STARTED.md) for setup help
- Check [docs/development/TROUBLESHOOTING.md](docs/development/TROUBLESHOOTING.md) for common issues
- Ask in GitHub Discussions or issue comments (be specific about your problem)

**Want to discuss a large change first?**
- Open a GitHub Issue describing your proposal
- Tag `@West-Cat-Strategy` for feedback
- Discuss before investing time on implementation

**Code review taking a while?**
- GitHub Actions tests must pass first (automatic)
- Reviewers may be busy; a gentle ping after 24 hours is OK
- Ping in team Slack if extremely urgent

---

## Thank You! 🙏

We appreciate your contribution to the nonprofit-manager project. Your code helps nonprofits manage their operations more effectively.

Questions or suggestions about this guide? Open an issue with label `documentation`.

**Happy coding!**
