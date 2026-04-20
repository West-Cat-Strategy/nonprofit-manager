# Telemetry And Monitoring

**Last Updated:** 2026-04-20

Use this doc for the current observability surfaces that are visible in the repo today. It focuses on mounted metrics endpoints, structured telemetry already emitted by the backend, and the source files that own those contracts.

## Current Observability Surfaces

- Prometheus-compatible runtime metrics are exposed by both the main backend runtime and the public-site runtime.
- Structured request and security-oriented events flow through the shared backend logger.
- Compatibility telemetry for auth alias usage is active and has its own operational workflow.

## Runtime Metrics

### Exposed Endpoints

- `/metrics` - Prometheus exposition format.
- `/metrics/json` - JSON snapshot of the registered metrics.

These routes are mounted by both:

- `backend/src/index.ts`
- `backend/src/public-site.ts`

### Current Metrics Captured

- `app_info`
- `http_requests_total`
- `http_requests_in_progress`
- `http_request_duration_ms`
- `http_errors_total`
- Default Node.js process/runtime metrics collected through `prom-client`

Request metrics normalize dynamic IDs in route paths before they are recorded, so dashboard queries stay stable across individual records.

### Access Control

- Metrics are open in non-production environments.
- In production, metrics access is gated by `X-Metrics-Key` when `METRICS_AUTH_KEY` is set.
- The protection logic lives in `backend/src/middleware/metrics.ts`.

## Structured Telemetry Already In Use

### Request And Error Signals

- HTTP request totals, latency, and error counts are recorded through the metrics middleware.
- Shared backend logging supplies the operational event stream used by the security and telemetry docs.

### Auth Alias Usage Telemetry

- The backend emits `auth.alias_input_used` when legacy snake_case auth fields are used before validation transforms run.
- Source middleware: `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts`
- Current operations guide: [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md)
- Current deprecation checklist: [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md)
- Current evidence note: [../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md)

## Source Files

- `backend/src/middleware/metrics.ts`
- `backend/src/index.ts`
- `backend/src/public-site.ts`
- `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts`

## Related Docs

- [../security/SECURITY_MONITORING_GUIDE.md](../security/SECURITY_MONITORING_GUIDE.md)
- [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md)
- [../validation/README.md](../validation/README.md)

## Scope Note

This doc intentionally describes only the current telemetry and monitoring surfaces that are visible in the repo. It does not serve as a future analytics roadmap or a generic event-design specification.
