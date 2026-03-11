# Frontend Setup Guide

**Last Updated:** 2026-03-11

Use this file when you only need the frontend. For the full contributor path, start at [../README.md](../README.md).

## Prerequisites

- Node.js `20.19+`
- npm `10+`
- A running backend at either `http://localhost:3000` or `http://localhost:8004`

## Direct Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm ci
```

Set `VITE_API_URL` in `frontend/.env.local`:

- `http://localhost:3000/api` if the backend is running directly
- `http://localhost:8004/api` if the backend is running in the Docker dev stack

Start the frontend:

```bash
npm run dev
```

The direct frontend runtime uses:

- Frontend: `http://localhost:8005`

## Common Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run type-check
npm test -- --run
npm run test:coverage
```

## Debugging

- Browser dev tools for requests, console, and storage
- React DevTools for component inspection
- [../e2e/README.md](../e2e/README.md) for Playwright-driven UI debugging

## Related Docs

- [README.md](README.md)
- [../docs/development/GETTING_STARTED.md](../docs/development/GETTING_STARTED.md)
- [../docs/testing/COMPONENT_TESTING.md](../docs/testing/COMPONENT_TESTING.md)
- [../docs/testing/TESTING.md](../docs/testing/TESTING.md)
