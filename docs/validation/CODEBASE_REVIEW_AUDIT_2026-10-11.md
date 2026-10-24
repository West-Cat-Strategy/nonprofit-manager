# Full Codebase Review and Audit

**Date:** 2026-10-11  
**Status:** Verification complete; follow-on review findings signed out  
**Context:** Remote parity check on `agent/full-scope-code-review` synced with `origin/main` (commit `8513cf61` + HEAD `e1905ab8`), full test matrix execution, architectural evaluation, and security advisory audit.

## Verification Evidence

| Check | Result |
| --- | --- |
| `git status` / `git pull` | Clean working tree; in sync with `origin/agent/full-scope-code-review` and `origin/main` |
| `npm ci` | Clean dependency install |
| `make lint` | Passed: backend ESLint, frontend ESLint, and 24 repository policy ratchets |
| `make typecheck` | Passed: backend, frontend, and shared contracts |
| `make build` | Passed: backend compile, frontend Vite build, and bundle size budget checks |
| Frontend bundle budget | Passed: 737,382 / 750,000 initial raw bytes; 116,447 / 122,880 startup raw bytes |
| `make test-tooling` | 80/80 tests passed |
| `make check-links` | 291 active docs and 1,580 local links checked; 0 broken links |
| Frontend Vitest (`npm test --workspace frontend -- --run`) | 266 files, 1,444 tests passed |
| `make db-verify` | Passed: 16/16 checks against isolated test DB `127.0.0.1:8012/nonprofit_manager_test` (139 migrations, RLS, FKs, fixtures) |
| Backend Jest (`npm test --workspace backend`) | 290 suites, 2,426 tests passed |
| `npm run audit:prod` | 17 vulnerabilities (1 critical, 6 high, 8 moderate, 2 low) flagged from fresh August–October 2026 CVE advisories |

## Review Findings & Scoped Follow-ups

### 1. Production Dependency Advisory Drift (P1)
While the codebase baseline was clean as of August 2026, new upstream CVEs published between August and October 2026 affect production dependencies:
- `proxy-addr` (1.1.0 - 2.0.7): Critical IP spoofing via IPv4-mapped IPv6 trust subnet (`GHSA-jqcg-44mw-7w3h`).
- `undici` (8.0.0 - 8.10.1): High DoS, response splitting, and TLS validation bypass in BalancedPool (`GHSA-3wwx-pv8p-q78v`, `GHSA-pmjh-fq2x-6v4x`, `GHSA-r53p-7pc4-xj5r`, `GHSA-w293-vg96-wgc3`).
- `multer` (<=2.3.0): High DoS via crafted multipart field names, file descriptor leak on abort, and async fileFilter race (`GHSA-wc9g-mqfw-jrwm`, `GHSA-qvfw-j98x-7q72`).
- `nodemailer` (<=10.0.5): High resolveContent bypass, IDN allow-list bypass, DoS, and process-global DNS cache cross-tenant disclosure (`GHSA-8m3c-c648-2xjj`, `GHSA-wmmp-3585-3rmp`, `GHSA-2x7j-588g-ccc2`).
- `compression` (<1.8.2): High DoS via memory leak on premature response close (`GHSA-vc2v-76pw-4v95`).
- `dompurify` (<=3.4.15): Moderate XSS via armed event handlers on detached subtrees (`GHSA-p98j-92pf-mc4p`).
- `ip-address` (<=10.7.0): Moderate link-local and NAT64 SSRF bypass (`GHSA-rpw4-54j3-4h4q`, `GHSA-2vr4-cq9g-pvrc`).
- `qs` (2.2.5 - 6.15.3) & `morgan` (<=1.12.0): Moderate array-limit bypass and log injection.

*Tracked as:* `P5-T147` (Ready).

### 2. Contact Method Transactional Synchronization (P2)
In `backend/src/modules/contacts/repositories/contactPhonesRepository.ts` and `contactEmailsRepository.ts`, child phone/email inserts and `syncContactMethodSummaries(contactId)` run in separate pool queries outside a database transaction. If summary sync fails or the process restarts, denormalized summary fields on `contacts` can drift.

*Tracked as:* `P5-T148` (Ready).

### 3. Contact Document Multipart Validation & Storage Rollback (P2)
In `backend/src/services/contactDocumentService.ts`, `uploadFile()` writes the file to disk before `pool.query(INSERT ...)` creates the database row. If the database insert throws an error (e.g., constraint error, invalid case_id), the uploaded file remains orphaned in storage. Multipart validation should also atomically verify case/contact/organization ownership.

*Tracked as:* `P5-T149` (Ready).

### 4. Public Report Bearer Token Hashing at Rest (P2)
In `backend/src/modules/publicReports/`, public report links require Bearer token authorization in the fragment `#token=...`, preventing URL leakages. However, tokens in `saved_reports.public_token` remain in plaintext. Hashing tokens at rest using SHA-256 with a migration and lookup index will guard database snapshots.

*Tracked as:* `P5-T150` (Ready).

### 5. Frontend Production Container Hardening (P3)
The production stage of `frontend/Dockerfile` uses `nginx:1.30-alpine-slim` running as root. Transitioning to an unprivileged Nginx user (`USER nginx` or `nginxinc/nginx-unprivileged`) hardens the container execution perimeter.

*Tracked as:* `P5-T151` (Ready).

### 6. Residual Release-Risk Backlog Items (P2/P3)
- Realtime SSE backpressure handling and Redis PubSub clustering for multi-pod deployments.
- Contact, case, and donation list Redux reducers out-of-order request sequence guards.
- Child table RLS policies (`contact_phone_numbers`, `contact_email_addresses`, `contact_notes`, `contact_documents`) as defense-in-depth behind controller scoping.
- Chromium single startup timing sample investigation (7 requests vs cap of 6).
