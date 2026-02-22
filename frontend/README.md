# Frontend Service

**Last Updated**: 2026-02-18

React + TypeScript + Vite frontend for nonprofit-manager platform.

---

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Frontend will start at `localhost:5173`.

For detailed setup instructions, see [SETUP.md](SETUP.md) or [docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md).

---

## What This Service Does

The frontend provides:

- **User Interface** — Dashboard, CRM, volunteers, events, reporting
- **Authentication** — Login UI, permission-based access control
- **Real-time Interactions** — Form submission, data updates, notifications
- **Responsive Design** — Works on desktop, tablet, mobile
- **Neo-brutalist Design System** — Bold typography, minimal decoration
- **Component Library** — Reusable UI components with Tailwind CSS

---

## Technology Stack

- **React 18** — UI framework with hooks
- **TypeScript** — Strict static typing
- **Vite** — Fast build tool and dev server
- **Tailwind CSS** — Utility-first CSS framework
- **Vitest** — Fast unit testing (similar to Jest)
- **React Router** — Client-side routing
- **Axios** — HTTP client for API calls

---

## Development

### Installation

```bash
npm install
```

Installs all dependencies from `package.json`.

### Start Dev Server

```bash
npm run dev
```

Server starts at `localhost:5173` with hot reload enabled.

Changes to code automatically refresh in browser.

### Stop the Server

Press `Ctrl+C` in the terminal.

---

## Testing

### Run Tests

```bash
npm test                # Run all tests once
npm test -- --watch     # Watch mode (re-run on changes)
npm run test:coverage   # Run with coverage report
```

### Write Tests

Co-locate test files with components:

```
Button.tsx
Button.test.tsx    ← Test file
```

Use React Testing Library to test behavior (not implementation).

See [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) for patterns.

---

## Code Quality

### Type Checking

```bash
npm run typecheck
```

Verify TypeScript for errors (strict mode enabled).

### Linting

```bash
npm run lint
```

Check code style with ESLint.

```bash
npm run lint:fix
```

Auto-fix style issues.

---

## Building for Production

```bash
npm run build
```

Creates optimized build in `dist/` directory.

```bash
npm run preview
```

Preview the production build locally at `localhost:4173`.

---

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── common/          # Shared UI (Button, Modal, etc.)
│   │   ├── features/        # Feature-specific components
│   │   └── layout/          # Layout wrapper components
│   ├── pages/               # Page components (one per route)
│   │   ├── Dashboard.tsx
│   │   ├── People.tsx
│   │   ├── Volunteers.tsx
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API calls and external services
│   │   └── api.ts           # Base API client
│   ├── store/               # State management (Redux, Context, etc.)
│   ├── types/               # TypeScript interfaces
│   ├── styles/              # Global styles (Tailwind config)
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Static assets (images, etc.)
├── tests/                   # Component tests
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint configuration
└── package.json
```

For detailed architecture, see [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager).

---

## Design System

This project uses a **Neo-brutalist design system** emphasizing:

- **Bold Typography** — Clear, large, readable text
- **Minimal Decoration** — Avoid unnecessary visual elements
- **Explicit Structure** — Clear information hierarchy
- **High Contrast** — Good accessibility and readability

See [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md) for:
- Color palette
- Typography scales
- Component patterns
- Spacing system
- Interactive states

**Styling approach**: Use Tailwind CSS utility classes (never inline styles).

---

## Environment Variables

Create `.env.local` (copy from `.env.example`):

```bash
VITE_API_URL=localhost:3000
```

**Required**:
- `VITE_API_URL` — Backend API base URL

See `.env.example` for all available variables.

---

## Connecting to Backend

Backend must be running for API calls to work.

**In separate terminal**:

```bash
cd ../backend
npm run dev
```

Backend should start at `localhost:3000`.

**Check connection**:

```bash
curl localhost:3000/api/health
```

If failing, see [backend/README.md](../backend/README.md) troubleshooting.

---

## Code Standards

All code follows standards in [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md):

- **TypeScript** — Strict null checking, explicit types, no `any`
- **Components** — Functional components with hooks
- **Naming** — Clear, consistent, camelCase for variables
- **Comments** — Explain "why", not "what" (code explains itself)
- **Testing** — Component tests for all interactive features

---

## Common Commands

```bash
npm run dev              # Start dev server with hot reload
npm run build            # Production build
npm run preview          # Preview production build
npm test                 # Run tests once
npm test -- --watch      # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run typecheck        # Check TypeScript errors
npm run lint             # Check code style
npm run lint:fix         # Auto-fix style issues
```

---

## Debugging

### Browser DevTools

Press `F12` (Windows/Linux) or `Cmd+Option+I` (macOS).

**Useful tabs**:
- **Console** — Error messages, debug logs
- **Network** — See API requests and responses
- **Storage** — Check LocalStorage for auth tokens, user data
- **Elements** — Inspect component structure and CSS

### React DevTools

Install [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/) extension.

Inspect component props, state, and re-renders.

### VS Code Debugging

See [SETUP.md](SETUP.md#vs-code-debugging) for VS Code debugger configuration.

---

## Troubleshooting

### Port 5173 Already in Use

```bash
lsof -ti :5173 | xargs kill -9
npm run dev -- --port 5174
```

### Import Errors (Cannot Find Module)

Path alias not resolving?

```bash
rm -rf node_modules
npm install
npm run dev
```

### TypeScript Errors

```bash
npm run typecheck
```

Fix all errors before continuing.

### Tests Failing

```bash
npm test -- --reporter=verbose
```

See [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) for patterns and best practices.

### Changes Not Showing in Browser

1. Ensure dev server is running (`npm run dev`)
2. Force browser refresh: `Cmd+Shift+R` (macOS) or `Ctrl+Shift+F5` (Windows/Linux)
3. Clear browser cache and restart dev server

---

## Architecture & Patterns

For deeper understanding:

- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Component architecture, state management
- [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md) — Code style and naming
- [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md) — Design system
- [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) — Testing patterns

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Git workflow (branching, commits)
- Code review process
- PR submission template
- Common issues and solutions

---

## See Also

- [SETUP.md](SETUP.md) — Detailed setup and environment configuration
- [https://github.com/West-Cat-Strategy/nonprofit-manager](https://github.com/West-Cat-Strategy/nonprofit-manager) — Component structure and patterns
- [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md) — Design system
- [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md) — Code style
- [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) — Testing guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contribution guidelines
