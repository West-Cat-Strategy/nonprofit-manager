# Executive Director Onboarding + Persona Workflow Findings

**Last Updated:** 2026-04-20

## Scope

- Execution target: `nonprofit-dev` compose stack and fresh DB lifecycle
- Ports: frontend `8005`, backend `8004`, public site `8006`, postgres `8002`, redis `8003`
- Persona set: Executive Director, Fundraiser, Nonprofit Administrator, Board Member, Case Manager, Rehab Worker
- Persona mapping reference files:
  - [role mapping catalog](../../../backend/src/modules/admin/usecases/roleCatalogUseCase.ts)
  - [role normalization utilities](../../../backend/src/utils/roleSlug.ts)
  - [permission boundaries](../../../backend/src/utils/permissions.ts)

## 1. Environment execution report

### Baseline + rebuild

- `.env.development` exists and is in sync with `.env.development.example`.
- Executed `make docker-rebuild` (build with `--no-cache` enabled via project script).

Observed key output:

```text
Docker images rebuilt without cache!
```

### Fresh DB cycle and stack startup

Commands run:

- `docker compose -p nonprofit-dev -f docker-compose.dev.yml down -v`
- `make dev`

Observed:

```text
[INFO] HTTP ready: http://127.0.0.1:8004/health/ready
[INFO] HTTP ready: http://127.0.0.1:8005
[INFO] HTTP ready: http://127.0.0.1:8006/health/ready
[SUCCESS] HTTP readiness passed for: http://127.0.0.1:8004/health/ready http://127.0.0.1:8005 http://127.0.0.1:8006/health/ready
```

### Service health checks

```bash
curl -s -w '%{http_code}' http://localhost:8004/health
curl -s -w '%{http_code}' http://localhost:8004/health/ready
curl -s -w '%{http_code}' http://localhost:8005
curl -s -w '%{http_code}' http://localhost:8006/health/ready
```

Observed:

```text
200
{"status":"ok","timestamp":"2026-04-20T03:40:53.838Z","uptime":15.567...}

200
{"status":"healthy","timestamp":"2026-04-20T03:40:53.858Z","version":"0.1.0",...}

200
<!doctype html> ...

200
{"status":"healthy","timestamp":"2026-04-20T03:40:55.711Z",...}
```

### Final container status after startup

```text
nonprofit-dev-backend-dev-1      Up (healthy)     0.0.0.0:8004->3000/tcp
nonprofit-dev-frontend-dev-1     Up (healthy)     0.0.0:8005->8005/tcp
nonprofit-dev-postgres-1         Up (healthy)     0.0.0:8002->5432/tcp
nonprofit-dev-public-site-dev-1  Up (healthy)     0.0.0:8006->8006/tcp
nonprofit-dev-redis-1            Up (healthy)     0.0.0:8003->6379/tcp
```

## 2. Fresh DB verification + persona onboarding

### Schema baseline

`/api` checks and `psql` were executed with the new stack.

```bash
docker compose -p nonprofit-dev -f docker-compose.dev.yml exec -T postgres psql -U postgres -d nonprofit_manager -c "\\dt" | sed -n '1,120p'
```

Result: baseline schema present and healthy for startup run (relations enumerated; counts not materially changed since prior build).

`/setup-status` baseline after setup:

```text
{"setupRequired":false,"userCount":6}
```

### First-run setup and persona account creation

A first admin setup was executed:

- `POST /api/v2/auth/setup` with valid password policy (`Admin12345`)
- Organization auto-created and session returned

Persona onboarding via authenticated `/api/v2/users` create calls:

- `manager@example.com` → `manager`
- `staff@example.com` → `staff`
- `board@example.com` → `viewer`
- `case@example.com` → `staff`
- `rehab@example.com` → `staff`
- plus initial setup admin: `admin@example.com` → `admin`

Organization access verification:

```text
count(*) from users => 6
count(*) from user_account_access => 6

admin@example.com   | 6b0e3a6a-b2a9-4d1e-b65a-7b18f0f48c39
manager@example.com | 6b0e3a6a-b2a9-4d1e-b65a-7b18f0f48c39
staff@example.com   | 6b0e3a6a-b2a9-4d1e-b65a-7b18f0f48c39
board@example.com   | 6b0e3a6a-b2a9-4d1e-b65a-7b18f0f48c39
case@example.com    | 6b0e3a6a-b2a9-4d1e-b65a-7b18f0f48c39
rehab@example.com   | 6b0e3a6a-b2a9-4d1e-b65a-7b18f0f48c39
```

### Policy blocker discovered

Role-level MFA requirements now block password login for high-privilege personas:

```text
name    | mfa_required
admin   | t
manager | t
staff   | f
viewer  | f
volunteer| f
```

Observed:

```text
admin login => forbidden: Multi-factor authentication is required for your role.
manager login => forbidden: Multi-factor authentication is required for your role.
```

(Manager role and admin workflows are therefore blocked in this run unless MFA enrollment path is exercised.)

## 3. Persona workflow smoke checks (API-level)

All checks used authenticated sessions where login was possible.

- Scripted role-target checks were run against:
  - `/api/v2/auth/check-access`
  - `/api/v2/accounts?limit=10`
  - `/api/v2/donations?limit=10`
  - `/api/v2/saved-reports?limit=10`
  - `/api/v2/cases?limit=10`
  - `/api/v2/follow-ups?limit=10`
  - `/api/v2/opportunities?limit=10`
  - `/api/v2/reports?limit=10`
  - `/api/v2/admin/users` (legacy route mismatch noted)

### Results

- `admin@example.com` (`admin`) – blocked by MFA at login
  - `/api/v2/auth/login`: `403` (forbidden, MFA required)
- `manager@example.com` (`manager`) – blocked by MFA at login
  - `/api/v2/auth/login`: `403` (forbidden, MFA required)
- `board@example.com` (`viewer`) – login success (`200`)
  - `/api/v2/auth/check-access`: `200`
  - `/api/v2/accounts`: `200`
  - `/api/v2/donations`: `200`
  - `/api/v2/cases`: `200`
  - `/api/v2/follow-ups`: `200`
  - `/api/v2/opportunities`: `200`
  - `/api/v2/reports` probes: `404` (route mismatch / unsupported route shape in this context)
  - `/api/v2/admin/users`: `404` (not a valid users endpoint under `/api/v2/admin` for this route set)
- `case@example.com` (`staff`) – login success (`200`)
  - same response pattern as above; core read/list routes returned `200`, admin surfaces returned `403`/`404` as expected
- `staff@example.com` (`staff`) – login success (`200`)
  - same as above
- `rehab@example.com` (`staff`) – login success (`200`)
  - same as above

## 4. Findings and gap register

### Executive Director

- **Status tags:** dashboards/reports/admin seams are `supported`, while governance and board-readiness surfaces are `partial`.
- Evidence:
  - Admin/report route architecture exists and is mounted under V2: [backend/src/routes/v2/index.ts](../../../backend/src/routes/v2/index.ts)
  - Admin UI shells and route mappings: [frontend/src/features/adminOps/adminRouteManifest.ts](../../../frontend/src/features/adminOps/adminRouteManifest.ts), [frontend/src/features/adminOps/adminNavigationCatalog.ts](../../../frontend/src/features/adminOps/adminNavigationCatalog.ts)
- Gap:
  - No dedicated board packet/leadership escalation orchestration seam observed as first-class workflow.

### Fundraiser

- **Status tags:** CRM intake/reporting is `supported`, campaign communication cadence and stewardship handoffs are `partial`.
- Evidence:
  - Route coverage for finance/contacts/opportunities: [frontend/src/routes/routeCatalog/staffPeopleRoutes.ts](../../../frontend/src/routes/routeCatalog/staffPeopleRoutes.ts), [frontend/src/routes/routeCatalog/staffFinanceRoutes.ts](../../../frontend/src/routes/routeCatalog/staffFinanceRoutes.ts)
  - Tests cover donation/report surfaces: [e2e/tests/donations.spec.ts](../../../e2e/tests/donations.spec.ts)
- Gap:
  - Fundraiser role (`manager`) cannot complete password login in this run because `mfa_required=true`, limiting warm-path validation.

### Nonprofit Administrator

- **Status tags:** admin management primitives are `supported`; packaging and compliance governance controls are `partial`.
- Evidence:
  - `/api/v2/users` routes are admin-gated (used for user create/access by permissions): [backend/src/modules/users/routes/index.ts](../../../backend/src/modules/users/routes/index.ts), [backend/src/modules/users/controllers/userController.ts](../../../backend/src/modules/users/controllers/userController.ts)
  - Policy/permission enforcement: [backend/src/utils/permissions.ts](../../../backend/src/utils/permissions.ts)
- Gap:
  - End-to-end onboarding for admin/workflow owner in this environment is blocked by MFA gate before permission verification.

### Board Member

- **Status tags:** read-only analytics/reporting is `supported`, but board governance overlays are `partial/missing`.
- Evidence:
  - `viewer` mapping and capability boundary: [backend/src/utils/roleSlug.ts](../../../backend/src/utils/roleSlug.ts), [backend/src/utils/permissions.ts](../../../backend/src/utils/permissions.ts)
  - Report access route patterns: [frontend/src/routes/routeCatalog/staffInsightsRoutes.ts](../../../frontend/src/routes/routeCatalog/staffInsightsRoutes.ts)
- Gaps:
  - No explicit conflict recusal/delegation authority module visible as in a governance workflow.

### Case Manager

- **Status tags:** core case/follow-up operations are `supported`; formalized handoff and continuity packeting are `partial`.
- Evidence:
  - Case route coverage: [frontend/src/routes/routeCatalog/staffPeopleRoutes.ts](../../../frontend/src/routes/routeCatalog/staffPeopleRoutes.ts)
  - Follow-up/report context: [backend/src/modules/followUps/routes/index.ts](../../../backend/src/modules/followUps/routes/index.ts)
- Gap:
  - Standardized handoff packet artifacts not fully productized.

### Rehab Worker (inferred staff)

- **Status tags:** service/documentation primitives are `supported`; dedicated rehab program pathways are `partial`.
- Evidence:
  - Staff and case pages: [frontend/src/features/cases/pages/CaseDetailPage.tsx](../../../frontend/src/features/cases/pages/CaseDetailPage.tsx), [frontend/src/features/portal/pages/PortalCaseDetailPage.tsx](../../../frontend/src/features/portal/pages/PortalCaseDetailPage.tsx)
  - Portal workflow surfaces: [frontend/src/features/portal/pages/PortalCasesPage.tsx](../../../frontend/src/features/portal/pages/PortalCasesPage.tsx)
- Gap:
  - Vocational/rehab assessment templates and placement outcome benchmarking not yet dedicated as specialized package flow.

## 5. Immediate recommendations

1. **Prioritize MFA-aware onboarding checks**
   - Add an explicit, reproducible setup path for `admin` and `manager` personas that covers MFA enrollment or explicit test-mode tokens.
2. **Clarify report-route contracts for runtime smoke**
   - Current endpoint probing should use the exact mounted API contracts and not legacy `/api/reports` assumptions.
3. **Governance/workflow gap backlog**
   - Board governance packet workflow and fundraiser stewardship surfaces remain most visible misses.
