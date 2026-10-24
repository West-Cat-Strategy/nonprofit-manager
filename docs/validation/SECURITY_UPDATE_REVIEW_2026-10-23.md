# Security and Dependency Update Review Verification Report

**Date:** 2026-10-23  
**Status:** Verification complete; 0 vulnerabilities across production and dev dependency trees  
**Context:** Security posture review and dependency update audit prompted by late October 2026 cybersecurity disclosures and supply-chain advisories.

---

## Executive Summary

A comprehensive security and dependency update review was executed across the Nonprofit Manager codebase. Upstream security advisories spanning JavaScript/Node.js ecosystems were remediated through targeted dependency updates and root lockfile overrides. Application-level defensive controls (token hashing, atomic file upload rollback, multi-tenant Row-Level Security, non-root containers) and full automated test matrices were verified.

Both production audits (`npm run audit:prod`) and full workspace audits (`npm audit`) now report **0 vulnerabilities**.

---

## 1. Upstream Vulnerabilities Remediated

| Package | Previous Version | Fixed Version | Severity | Advisory / CVE Summary |
| --- | --- | --- | --- | --- |
| **dompurify** | `3.4.16` | `3.4.17` | **Critical** | `GHSA-cg2g-xh64-v4q7`: Split template expressions survive attached shadow root content in template modes; `GHSA-mrv2-3pqr-j5jr`: Armed event handlers on detached subtrees. |
| **handlebars** | `4.7.9` | `4.7.10` | **Critical** | `GHSA-xw65-4hp5-5hc7`, `GHSA-8r5x-fm3f-whwj`: AST type confusion and prototype check bypass in compile. |
| **zod** | `^4.4.3` | `^4.6.7` | **High** | `GHSA-mrhx-c7xc-m3w5`: Memory exhaustion / DoS when validating oversized constrained collections. |
| **body-parser** | `2.3.0` | `2.4.0` | **High** | `GHSA-27r3-jxmh-p828`: Denial of service via trailing bytes after a compressed request body. |
| **follow-redirects** | `1.16.0` | `1.16.1` | **High** | `GHSA-q3jh-wrc6-jgq8`: Array-form headers bypass cross-origin credential stripping; regex escaping leak. |
| **undici** | `8.11.2` / `7.30.0` | `8.12.3` / `7.30.1` | **High** | `GHSA-4qv8-2p9j-2685`: EventSource unbounded memory; `GHSA-f72v-6w45-q472`: SRI non-lowercase token bypass; `GHSA-xjj6-f33q-929c`: Content-encoding DoS; BalancedPool TLS dropped connect options. |
| **multer** | `2.4.0` | `2.5.0` | **High** | `GHSA-q7qp-rjg7-q26m`: DoS via pending asynchronous fileFilter after request teardown. |
| **vite** | `8.0.16` | `8.3.5` | **High** | `GHSA-9jrq-w75r-8gcw`: Cross-origin script execution via custom middleware; `GHSA-698v-4r3x-3vcv`, `GHSA-r825-w8mm-5pxw`: Editor CLI command injection. |
| **browserslist** | `<=4.28.6` | `4.29.4` | **High** | `GHSA-c83g-rgw3-j3cx`: Unbounded memory growth (no cache eviction) OOM; `GHSA-73wf-gq98-2v4g`: Prototype write via untrusted stats. |
| **js-yaml** | `3.15.1` | `3.15.2` | **High** | `GHSA-2883-xcg3-v3hh`: Uncontrolled CPU consumption for empty merge keys. |
| **source-map-js** | `<=1.2.1` | `1.2.2` | **High** | `GHSA-68fv-2mgg-jv7q`: Event-loop denial of service through indexed section offsets. |
| **smol-toml** | `<=1.8.0` | `1.8.1` | **High** | `GHSA-7w5x-hrqm-74c2`, `GHSA-r4xh-jqrq-34v2`: Denial of service via malformed TOML documents. |
| **nodemailer** | `10.1.0` | `10.2.1` | **Moderate** | `GHSA-8c8m-p3m8-cjg8`, `GHSA-m943-m63m-w62w`, `GHSA-85x2-q946-cp5h`: Address parser comment and quote early termination leaking recipients and domains. |
| **@vitest/mocker** | `<=4.1.11` | `4.1.12` | **Moderate** | `GHSA-82fw-gwwq-j7x9`: Path traversal / arbitrary file read; `GHSA-qxg6-89mg-rqv8`: Code injection via mock registration. |

---

## 2. Defensive Hardening & Application Security Verification

1. **Token Security at Rest:**
   - Saved report public tokens (`saved_reports.public_token`) are stored hashed with SHA-256 (Migration 141), protecting database backups and snapshots from credential exposure.
2. **Contact Document Storage Atomicity:**
   - `contactDocumentService.ts` ensures uploaded files on disk are asynchronously rolled back and unlinked if database metadata insertion fails.
3. **Multi-Tenant Row-Level Security:**
   - Migration 142 enforces `FORCE RLS` on `contact_phone_numbers`, `contact_email_addresses`, `contact_notes`, and `contact_documents` for tenant organization isolation.
4. **Container Perimeter Security:**
   - `frontend/Dockerfile` runs as unprivileged user `USER nginx` with explicit directory ownership on runtime paths (`/var/run/nginx.pid`, `/var/cache/nginx`, `/usr/share/nginx/html`).
   - `backend/Dockerfile` runs as unprivileged user `USER node` with non-root ownership on `/app/exports`, `/app/logs`, and `/app/uploads`.
5. **Secret Scanning:**
   - Gitleaks scan of 103+ MB across the working tree found 0 leaked credentials or API keys.

---

## 3. Automated Verification Evidence

| Verification Target | Command | Result | Details |
| --- | --- | --- | --- |
| **Production Dependency Audit** | `npm run audit:prod` | **PASS** | 0 vulnerabilities (clean) |
| **Full Dependency Audit** | `npm audit` | **PASS** | 0 vulnerabilities across 1,096 packages |
| **Secret Scanning** | `gitleaks detect ...` | **PASS** | 0 leaks found across ~103.3 MB worktree |
| **Database Parity & RLS Contract** | `make db-verify` | **PASS** | 16/16 checks passed against isolated PostgreSQL (127.0.0.1:8012) |
| **Policy Linters & Ratchets** | `make lint` | **PASS** | Backend ESLint, frontend ESLint, and 24 policy ratchets clean |
| **TypeScript Typecheck** | `make typecheck` | **PASS** | Backend, frontend, and `@nonprofit-manager/contracts` clean |
| **Tooling Regression Matrix** | `make test-tooling` | **PASS** | 80/80 tests passed |
| **Frontend Unit & Integration** | `make test-frontend` | **PASS** | 268 test files, 1,462 tests passed (41.8s) |
| **Backend Unit & Integration** | `make test-backend` | **PASS** | 291 test suites, 2,433 tests passed (49.1s) |
| **Production Build & Budgets** | `make build` | **PASS** | Backend compiled; Vite bundle 744,968 raw bytes (<750,000 cap) |
