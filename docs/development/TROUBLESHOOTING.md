# Troubleshooting Guide

## Common Issues

### Backend tests hang or exit with open handles
- Ensure `NODE_ENV=test` is set when running Jest.
- Run `npm test -- --runInBand --detectOpenHandles` in `backend/` for details.

### Database connection errors
- Verify PostgreSQL is running and reachable.
- Confirm `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- For migration verification, ensure `DB_NAME` ends with `_test`.

### Frontend lint errors
- Run `npm run lint` in `frontend/`.
- Check regex literals and unused variables in list pages.

### Local CI audit fails
- `npm audit` requires network access to the npm registry.
- If running in a restricted environment, rerun when network is available.

### Auth failures (401/403)
- Confirm `JWT_SECRET` matches the value used to sign tokens.
- Ensure the `Authorization` header includes `Bearer <token>`.

## Getting More Detail

- Backend: `npm run type-check`, `npm test -- --runInBand --detectOpenHandles`
- Frontend: `npm run type-check`, `npm test -- --run`
- Local CI: `./scripts/local-ci.sh --audit --build`

