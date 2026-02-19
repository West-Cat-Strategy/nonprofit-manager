# Getting Started

**Last Updated**: 2026-02-18

Welcome! This guide will get you set up to develop on nonprofit-manager in **~2 hours**. 

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Choose Your Path](#choose-your-path)
- [Path A: Frontend Only](#path-a-frontend-only-20-minutes)
- [Path B: Backend Only](#path-b-backend-only-20-minutes)
- [Path C: Full Stack](#path-c-full-stack-30-45-minutes)
- [Verify Installation](#verify-installation)
- [Next Steps](#next-steps)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure your system has:

### Required

- **Git** — Version control (any recent version)
- **Node.js 18+** — JavaScript runtime
- **npm 9+** — Package manager (comes with Node.js)

### Optional but Recommended

- **PostgreSQL 14+** — Database (if working on backend)
- **Docker** — For running database in container (easier than installing PostgreSQL)
- **VS Code** — Code editor with TypeScript, ESLint extensions

### Check What You Have

```bash
git --version
node --version    # Should be v18.0.0 or higher
npm --version     # Should be 9.0.0 or higher
```

### Install Missing Tools

**macOS (using Homebrew)**:
```bash
# Install Homebrew first if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm)
brew install node

# Optional: Install PostgreSQL
brew install postgresql
```

**Windows**:
1. Download Node.js LTS from https://nodejs.org (includes npm)
2. Run installer and follow prompts
3. Restart terminal or command prompt
4. Verify: `node --version`

**Linux (Ubuntu/Debian)**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Choose Your Path

Pick **one** based on your focus:

| Experience | Role | Time | Path |
|-----------|------|------|------|
| Frontend only | React/UI developer | 20 min | [Path A](#path-a-frontend-only-20-minutes) |
| Backend only | Node.js/Database developer | 20 min | [Path B](#path-b-backend-only-20-minutes) |
| Full stack | Full-stack or new contributors | 30-45 min | [Path C](#path-c-full-stack-30-45-minutes) |

---

## Path A: Frontend Only (20 minutes)

**For**: UI/React developers working on frontend features

### Step 1: Clone Repository

```bash
git clone https://github.com/West-Cat-Strategy/nonprofit-manager.git
cd nonprofit-manager/frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

Takes 2-3 minutes.

### Step 3: Start Development Server

```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in 123 ms
➜  Local:   http://localhost:5173/
```

Open http://localhost:5173/ in your browser. You should see the frontend!

### Step 4: Verify Setup

Run tests to confirm everything works:

```bash
# In another terminal (keep dev server running)
npm test
```

Tests should pass.

### Got an Error?

See [Troubleshooting](#troubleshooting) section below, or check [frontend/SETUP.md](../../frontend/SETUP.md).

### Next Step

Move to [Next Steps](#next-steps) below.

---

## Path B: Backend Only (20 minutes)

**For**: Node.js/database developers working on API and business logic

### Step 1: Clone Repository

```bash
git clone https://github.com/West-Cat-Strategy/nonprofit-manager.git
cd nonprofit-manager/backend
```

### Step 2: Set Up Database with Docker

The easiest way is to use Docker:

```bash
# Start database container
docker-compose -f ../docker-compose.dev.yml up -d nonprofit-db-dev

# Wait for database to be ready (30 seconds)
sleep 30
```

If you prefer installing PostgreSQL locally instead, see [backend/README.md](../../backend/README.md#database-setup).

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Set Up Environment

Copy example environment file:

```bash
cp .env.example .env
```

Verify `DATABASE_URL` in `.env` matches Docker container (default is correct).

### Step 5: Run Database Migrations

```bash
npm run migrate
```

This creates tables in the database.

### Step 6: Start Backend Server

```bash
npm run dev
```

You should see:
```
[03:45:32] Server running at http://localhost:3000
```

Test it:
```bash
curl http://localhost:3000/api/health
```

Should return: `{"status":"ok"}`

### Step 7: Verify Setup

Run tests:

```bash
npm test
```

Tests should pass.

### Got an Error?

See [Troubleshooting](#troubleshooting) section, or check [backend/README.md](../../backend/README.md).

### Next Step

Move to [Next Steps](#next-steps) below.

---

## Path C: Full Stack (30-45 minutes)

**For**: Full-stack developers or getting the complete development environment

### Part 1: Frontend Setup (15 minutes)

```bash
git clone https://github.com/West-Cat-Strategy/nonprofit-manager.git
cd nonprofit-manager

# Frontend
cd frontend
npm install
npm run dev
# Verify at http://localhost:5173/
```

Keep the dev server running. Open a **new terminal window** for backend setup.

### Part 2: Backend Setup (20 minutes)

**In new terminal:**

```bash
# From project root
cd nonprofit-manager/backend

# Start database with Docker
docker-compose -f ../docker-compose.dev.yml up -d nonprofit-db-dev

# Wait for database
sleep 30

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run migrations
npm run migrate

# Start backend
npm run dev
```

Backend should start at `http://localhost:3000/`.

Test it:
```bash
curl http://localhost:3000/api/health
```

### Part 3: Verify Both Services (5 minutes)

**Terminal 1** (Frontend): Running `npm run dev` in `frontend/` ✅
**Terminal 2** (Backend): Running `npm run dev` in `backend/` ✅

Test the connection:

```bash
# In a third terminal
curl http://localhost:3000/api/health

# Should return: {"status":"ok"}
```

Run tests:

```bash
# Terminal 1 - Frontend tests
cd nonprofit-manager/frontend
npm test

# Terminal 2 - Backend tests  
cd nonprofit-manager/backend
npm test
```

Both should pass. 🎉

### Got an Error?

See [Troubleshooting](#troubleshooting) or check:
- [frontend/SETUP.md](../../frontend/SETUP.md)
- [backend/README.md](../../backend/README.md)

---

## Verify Installation

After completing your path, verify everything is working:

### Frontend ✅

```bash
cd nonprofit-manager/frontend
npm run typecheck    # No TypeScript errors
npm run lint         # No style issues
npm test             # Tests pass
```

### Backend ✅

```bash
cd nonprofit-manager/backend
npm run typecheck    # No TypeScript errors
npm run lint         # No style issues
npm test             # Tests pass
```

If all pass, **you're ready to start coding!**

---

## Next Steps

Congrats! Your environment is set up. Now:

### 1. Read the Code Style Guide (10 minutes)

Review code standards you need to follow:

→ [docs/development/CONVENTIONS.md](../../docs/development/CONVENTIONS.md)

Key highlights:
- TypeScript: Strict null checking, explicit types
- Functions: Should have JSDoc comments
- Testing: Aim for 80%+ code coverage
- Components: Use functional components with hooks

### 2. Understand the Architecture (15 minutes)

Learn why the system is built this way:

→ [docs/development/ARCHITECTURE.md](../../docs/development/ARCHITECTURE.md)

### 3. Find Your First Task (30 minutes)

Pick an issue to work on:

1. Go to [GitHub Issues](https://github.com/West-Cat-Strategy/nonprofit-manager/issues)
2. Filter by `good first issue` label
3. Read the description and ask questions if unclear
4. Create a branch and start coding

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for workflow details.

### 4. Make Your First Contribution (1-2 hours)

Follow the contribution checklist in [CONTRIBUTING.md](../../CONTRIBUTING.md):

- [ ] Create a feature branch
- [ ] Make your changes
- [ ] Write/update tests
- [ ] Run linting and tests
- [ ] Open a pull request
- [ ] Address code review feedback

---

## Troubleshooting

### "node: command not found"

Node.js not installed:

```bash
# Install Node.js
# macOS: brew install node
# Windows: Download from https://nodejs.org
# Linux: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs

# Verify
node --version
```

### "npm: command not found"

npm is not installed (comes with Node.js):

```bash
# Reinstall Node.js from https://nodejs.org (LTS version)
# Then verify
npm --version
```

### "Port 5173 (frontend) already in use"

Another process is using the port:

```bash
# Kill process on that port
lsof -ti :5173 | xargs kill -9

# Or use different port
cd frontend
npm run dev -- --port 5174
```

### "Port 3000 (backend) already in use"

```bash
lsof -ti :3000 | xargs kill -9

# Or use different port
cd backend
PORT=3001 npm run dev
```

### "Cannot connect to database"

**If using Docker**:

```bash
# Check if container is running
docker ps | grep nonprofit-db-dev

# If not running, start it
docker-compose -f docker-compose.dev.yml up -d nonprofit-db-dev

# Check logs
docker logs nonprofit-db-dev
```

**If using local PostgreSQL**:

```bash
# Check if PostgreSQL is running
# macOS: brew services list | grep postgres
# Linux: sudo systemctl status postgresql

# Start it if needed
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### "npm install fails"

Clear npm cache and reinstall:

```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### "TypeScript errors"

Run type checker:

```bash
npm run typecheck
```

Fix each error listed. Common issues:
- Missing type annotation on variable
- Using `any` type (not allowed)
- `null` or `undefined` check missing

### "Tests are failing"

Check test output:

```bash
npm test -- --reporter=verbose
```

Common causes:
- Changes not saved
- Different understanding of test
- Missing test setup/mocks

Ask in GitHub Issues if stuck.

### "Changes not showing in browser"

1. Ensure dev server is running (`npm run dev`)
2. Force browser refresh: `Cmd+Shift+R` (macOS) or `Ctrl+Shift+F5` (Windows)
3. Check for TypeScript errors: `npm run typecheck`
4. Restart dev server: `Ctrl+C` then `npm run dev`

---

## Still Stuck?

**Check these resources**:

1. [frontend/SETUP.md](../../frontend/SETUP.md) — Frontend-specific setup
2. [backend/README.md](../../backend/README.md) — Backend-specific setup
3. [docs/development/TROUBLESHOOTING.md](../../docs/development/TROUBLESHOOTING.md) — Common issues
4. [docs/INDEX.md](../../docs/INDEX.md) — Full documentation index

**Ask for help**:

- Comment on [GitHub Issue](https://github.com/West-Cat-Strategy/nonprofit-manager/issues)
- Ask in team Slack channel
- Create a new issue with **questions** label

---

## See Also

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — Code contribution workflow
- [docs/development/CONVENTIONS.md](../../docs/development/CONVENTIONS.md) — Code style guide
- [docs/development/ARCHITECTURE.md](../../docs/development/ARCHITECTURE.md) — System architecture
- [frontend/SETUP.md](../../frontend/SETUP.md) — Frontend-specific setup
- [backend/README.md](../../backend/README.md) — Backend-specific info
- [docs/INDEX.md](../../docs/INDEX.md) — Full documentation index

---

**Welcome to the team!** 🎉

You're now set up to contribute. Pick a task, make a pull request, and help nonprofits manage their operations more effectively.

Questions? Ask in GitHub Issues or ask a team member.
