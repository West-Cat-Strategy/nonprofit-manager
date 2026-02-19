# Frontend Setup Guide

**Last Updated**: 2026-02-18

Get the nonprofit-manager frontend running locally for development.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** — Check with `node --version`
- **npm 9+** — Check with `npm --version`
- **Git** — For cloning and version control
- **A code editor** — VS Code recommended (with ESLint, TypeScript extensions)

### Check Your Versions

```bash
node --version        # Should be v18.0.0 or higher
npm --version         # Should be 9.0.0 or higher
git --version         # Any recent version is fine
```

If you need to upgrade:
- **macOS/Homebrew**: `brew install node` (or update with `brew upgrade node`)
- **Windows**: Download from https://nodejs.org (LTS version 18+)
- **Linux**: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -` then `sudo apt-get install -y nodejs`

---

## Installation (5-10 minutes)

### Step 1: Clone the Repository

```bash
git clone https://github.com/West-Cat-Strategy/nonprofit-manager.git
cd nonprofit-manager
```

### Step 2: Install Dependencies

```bash
cd frontend
npm install
```

This installs all required packages. Takes 2-3 minutes depending on connection speed.

### Step 3: Create Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set variables (see [Environment Variables](#environment-variables) below).

### Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

**Open http://localhost:5173/ in your browser.** You should see the nonprofit-manager frontend.

---

## Environment Variables

Create `.env.local` in the `frontend/` directory (copy from `.env.example`):

```bash
# Backend API
VITE_API_URL=http://localhost:3000

# Authentication
VITE_AUTH_DOMAIN=dev.example.com
VITE_AUTH_CLIENT_ID=dev-client-id

# Analytics (optional)
VITE_PLAUSIBLE_DOMAIN=localhost  # Disable in dev by commenting out
```

**Required variables**:
- `VITE_API_URL` — Backend API endpoint (default: `http://localhost:3000`)

**Optional variables**:
- `VITE_AUTH_DOMAIN` — For Auth0 integration (development only)
- `VITE_AUTH_CLIENT_ID` — For Auth0 integration (development only)
- `VITE_PLAUSIBLE_DOMAIN` — For analytics (leave empty to disable in dev)

See `.env.example` for complete list of available variables.

---

## Common Commands

**Development**:
```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run preview          # Preview production build locally
```

**Quality**:
```bash
npm run lint             # Check code style (ESLint)
npm run typecheck        # Check TypeScript errors
npm test                 # Run component tests
npm run test:coverage    # Run tests with coverage report
```

**Debugging**:
```bash
npm run dev -- --debug   # Start dev server with debugging info
```

See [package.json](package.json) for all available scripts.

---

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── common/          # Shared UI components
│   │   └── features/        # Feature-specific components
│   ├── pages/               # Page components (routes)
│   │   ├── dashboard.tsx
│   │   ├── people.tsx
│   │   ├── volunteers.tsx
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API calls and external services
│   ├── store/               # State management (Redux/Context)
│   ├── types/               # TypeScript type definitions
│   ├── styles/              # Global styles (Tailwind config)
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── tests/                   # Component tests
├── ESLint config
├── Tailwind config
├── TypeScript config
├── Vite config
└── package.json
```

For detailed component architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming conventions.

### 2. Start Dev Server

```bash
npm run dev
```

Hot reload will automatically refresh changes in the browser.

### 3. Write/Update Code

- Create components in `src/components/`
- Add pages in `src/pages/`
- Write tests alongside components (`.test.tsx` files)
- Follow style guide in [CONVENTIONS.md](../docs/development/CONVENTIONS.md)

### 4. Test Your Changes

```bash
npm test                # Run component tests
npm run typecheck       # Check for TypeScript errors
npm run lint            # Check code style
```

All must pass before committing.

### 5. Commit and Push

```bash
git add .
git commit -m "feat: Add new volunteer dashboard widget"
git push origin feature/your-feature-name
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commit message format.

### 6. Submit Pull Request

Go to GitHub, create PR from your branch to `main`.

Assign reviewer, fill out PR template, and wait for code review.

---

## Testing

### Run Tests

```bash
npm test                # Run all component tests once
npm test -- --watch     # Run tests in watch mode (re-run on changes)
npm run test:coverage   # Run tests and generate coverage report
```

### Write Tests

Component test files should:
- Be co-located with component: `Button.tsx` → `Button.test.tsx`
- Use React Testing Library (not Enzyme or Snapshot testing)
- Test behavior, not implementation

Example:

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(onClick).toHaveBeenCalled();
  });
});
```

See [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) for detailed patterns.

---

## Design System

This project uses a **Neo-brutalist design system** with Tailwind CSS.

See [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md) for:
- Color palette
- Typography system
- Component design patterns
- Spacing and layout
- Interactive states

**Key principle**: Minimal decoration, bold typography, explicit structure.

---

## Connecting to Backend

### 1. Start Backend (separate terminal)

Backend must be running for API calls to work:

```bash
cd backend
npm install
npm run dev
```

See [backend/README.md](../backend/README.md) for backend setup.

### 2. Verify API Connection

In `.env.local`, ensure:

```bash
VITE_API_URL=http://localhost:3000
```

Test the connection:

```bash
curl http://localhost:3000/api/health
```

You should see a response with `{"status": "ok"}`.

### 3. Try a Feature

Log in and navigate to a feature that calls the API. Check browser DevTools:
- **Network tab**: See API calls
- **Console**: Look for errors
- **Storage**: Check localStorage for auth tokens

If API calls fail, see [Troubleshooting](#troubleshooting).

---

## Debugging

### Browser DevTools

Press `F12` (Windows/Linux) or `Cmd+Option+I` (macOS) to open DevTools.

**Useful tabs**:
- **Console**: Error messages and debugging logs
- **Network**: See all API requests and responses
- **Storage → LocalStorage**: Check auth tokens, user data
- **Elements/Inspector**: Inspect component structure and CSS

### React Developer Tools

Install [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/) browser extension.

**Useful features**:
- Inspect component props and state
- Jump between element and component code
- Trace re-renders

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src",
      "sourceMapPathOverride": {
        "webpack:///src/*": "${webRoot}/*"
      }
    }
  ]
}
```

Then press `F5` to start debugging.

---

## Troubleshooting

### "Port 5173 already in use"

```bash
# Kill process on port 5173
lsof -ti :5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 5174
```

### "Cannot find module @components"

Path aliases not resolving?

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### "API calls are failing (400, 401, 500)"

1. Check backend is running: `curl http://localhost:3000/api/health`
2. Check `.env.local` has correct `VITE_API_URL`
3. Check browser console for error details
4. Check network tab to see actual request/response
5. See [backend/README.md](../backend/README.md) for backend troubleshooting

### "TypeScript errors in editor"

```bash
npm run typecheck
```

This runs TypeScript compiler and shows all errors. Fix each one before continuing.

### "Tests are failing"

```bash
npm test -- --reporter=verbose
```

See detailed test output. Common issues:
- Component not rendering (mock missing)
- Async operations not awaited
- Event handlers not properly mocked

See [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) for patterns.

### "Changes not showing in browser"

1. Check dev server is running (`npm run dev`)
2. Force refresh browser: `Cmd+Shift+R` (macOS) or `Ctrl+Shift+F5` (Windows/Linux)
3. Clear browser cache: DevTools → Application → Storage → Clear all
4. Restart dev server: Stop (`Ctrl+C`) and run `npm run dev` again

---

## Next Steps

1. **Explore existing code**: Look at a few components to understand patterns
2. **Read guides**:
   - [ARCHITECTURE.md](ARCHITECTURE.md) — Component structure
   - [CONVENTIONS.md](../docs/development/CONVENTIONS.md) — Code style
   - [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md) — Design system
3. **Find an issue**: Check [GitHub Issues](https://github.com/West-Cat-Strategy/nonprofit-manager/issues?label=good%20first%20issue) for beginner-friendly tasks
4. **Make your first PR**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Getting Help

**Questions?**
- See [ARCHITECTURE.md](ARCHITECTURE.md) for component design
- See [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) for testing help
- See [docs/development/TROUBLESHOOTING.md](../docs/development/TROUBLESHOOTING.md) for common issues
- Ask in GitHub Issues or team Slack channel

**Found a problem?**
- Report in GitHub Issues
- Include: error message, steps to reproduce, environment (OS, Node version)

---

## See Also

- [frontend/ARCHITECTURE.md](ARCHITECTURE.md) — Component structure and patterns
- [CONTRIBUTING.md](../CONTRIBUTING.md) — How to contribute
- [docs/development/CONVENTIONS.md](../docs/development/CONVENTIONS.md) — Code style guide
- [NEO-BRUTALIST-GUIDE.md](NEO-BRUTALIST-GUIDE.md) — Design system
- [docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md) — Testing patterns
