# Auth Alias Telemetry Operations Guide

Date: 2026-04-14

This guide defines the production-facing query and dashboard workflow for `P4-T9I`. Use it to measure legacy auth alias usage for:

- `/api/v2/auth/register`
- `/api/v2/auth/setup`
- `/api/v2/auth/password`

The source implementation remains:

- alias event middleware: `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts`
- HTTP request logging path: `backend/src/index.ts` (Morgan -> shared Winston logger with correlation IDs)
- logger transport contract: `backend/src/config/logger.ts`

## Event Contract

`auth.alias_input_used` is emitted when a request body uses one or more accepted legacy snake_case auth fields before validation transforms run.

Event name:

- `auth.alias_input_used`

Fields emitted by the middleware:

- `event`
- `route`
- `aliasFields`
- `correlationId`
- `userAgent`
- `timestamp`

Fields added by the shared logger transport and request context when available:

- `message`
- `level`
- `service`
- `environment`
- `version`

The companion denominator for daily ratios comes from the existing HTTP response log stream routed through the shared logger transport:

- message: `Outgoing response`
- fields used here: `method`, `path`, `statusCode`, `requestId`, `timestamp`

## Daily Ratio Definition

Compute one daily ratio per tracked endpoint:

`alias_requests / total_requests`

Where:

- `alias_requests` is the daily count of `auth.alias_input_used` events for a route.
- `total_requests` is the daily count of `Outgoing response` logs for the matching route and method.

Route-to-method mapping for the denominator:

| Route | Method |
|---|---|
| `/api/v2/auth/register` | `POST` |
| `/api/v2/auth/setup` | `POST` |
| `/api/v2/auth/password` | `PUT` |

Count all completed requests for the denominator. Do not limit the denominator to only successful responses, because the goal is to measure alias-field usage across the full request stream seen by the auth endpoints.

## Kibana Queries

### Alias Events By Route

KQL:

```text
message:"auth.alias_input_used" and route:("/api/v2/auth/register" or "/api/v2/auth/setup" or "/api/v2/auth/password")
```

Suggested fields:

- `@timestamp`
- `route`
- `aliasFields`
- `correlationId`
- `userAgent`

### Daily Alias Counts

ES|QL:

```text
FROM logs-*
| WHERE message == "auth.alias_input_used"
| WHERE route IN ("/api/v2/auth/register", "/api/v2/auth/setup", "/api/v2/auth/password")
| EVAL day = DATE_TRUNC(1 day, TO_DATETIME(timestamp))
| STATS alias_requests = COUNT(*) BY day, route
| SORT day DESC, route ASC
```

### Daily Total Request Counts

ES|QL:

```text
FROM logs-*
| WHERE message == "Outgoing response"
| WHERE (
    (method == "POST" AND path IN ("/api/v2/auth/register", "/api/v2/auth/setup")) OR
    (method == "PUT" AND path == "/api/v2/auth/password")
  )
| EVAL day = DATE_TRUNC(1 day, TO_DATETIME(timestamp))
| STATS total_requests = COUNT(*) BY day, path, method
| SORT day DESC, path ASC
```

### Route-Specific Spot Checks

Register:

```text
message:"auth.alias_input_used" and route:"/api/v2/auth/register"
```

Setup:

```text
message:"auth.alias_input_used" and route:"/api/v2/auth/setup"
```

Password:

```text
message:"auth.alias_input_used" and route:"/api/v2/auth/password"
```

## Dashboard Recipe

Build the dashboard in Kibana Lens with one ratio visualization per route plus one detail table.

### Ratio Panels

Create three Lens metric or line-chart panels using `timestamp` as the date histogram and these formulas:

Register ratio:

```text
count(kql='message:"auth.alias_input_used" and route:"/api/v2/auth/register"')
/
count(kql='message:"Outgoing response" and method:"POST" and path:"/api/v2/auth/register"')
```

Setup ratio:

```text
count(kql='message:"auth.alias_input_used" and route:"/api/v2/auth/setup"')
/
count(kql='message:"Outgoing response" and method:"POST" and path:"/api/v2/auth/setup"')
```

Password ratio:

```text
count(kql='message:"auth.alias_input_used" and route:"/api/v2/auth/password"')
/
count(kql='message:"Outgoing response" and method:"PUT" and path:"/api/v2/auth/password"')
```

Display each panel as a percent with at least 4 decimal places so near-zero usage is still visible.

### Detail Table

Add a saved-search or table panel filtered to:

```text
message:"auth.alias_input_used"
```

Show:

- `@timestamp`
- `route`
- `aliasFields`
- `correlationId`
- `userAgent`

Use this table to inspect which aliases are still active and whether usage is concentrated in a specific client or rollout.

## Operational Review Rules

Interpret the telemetry gate from [auth-alias-deprecation-checklist.md](auth-alias-deprecation-checklist.md) this way:

- A day counts as clean only when all three route ratios are exactly `0`.
- The retirement gate requires 30 consecutive clean days in production-like traffic.
- Reset the streak if any route shows a non-zero ratio on any day.
- If request volume for a route is `0`, treat that day as inconclusive for that route rather than clean.

## Suggested Alerting And Escalation

Use manual review at first, then add alerting if the dashboard becomes operationally important.

- Weekly review: confirm each route remains at `0` or is trending down.
- 14 days before July 1, 2026: open a blocker if any route still shows non-zero alias usage.
- 7 days before July 1, 2026: notify API owners and document any approved integrator exception.
- Do not remove alias support until the 30-day zero-usage streak is complete and any exception list is empty.

## Related Artifacts

- [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md)
- [auth-alias-deprecation-checklist.md](auth-alias-deprecation-checklist.md)
- [../security/SECURITY_MONITORING_GUIDE.md](../security/SECURITY_MONITORING_GUIDE.md)
