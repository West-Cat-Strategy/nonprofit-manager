# Telemetry and Monitoring

The Nonprofit Manager includes a self-hosted monitoring system to track application health, performance, and user activity without sacrificing privacy.

## Prometheus Metrics

The application exposes Prometheus-compatible metrics for real-time monitoring of various system aspects.

### Key Metrics Tracked
- **HTTP Requests**: Total count, duration (percentiles: p50, p95, p99), and success/error rates.
- **Process Info**: Memory usage (heap, RSS), uptime, and version information.
- **Organization Traffic**: Requests per organization (correlation ID tracking).
- **Database Health**: Connection pool status and query latency.

### Endpoints
- `/metrics`: Standard Prometheus exposition format.
- `/metrics/json`: Developer-friendly JSON snapshot of current metrics.

### Security
In production, the metrics endpoint is protected by an `X-Metrics-Key` header (configured via `METRICS_AUTH_KEY` environment variable).

## Telemetry Events

We use a lightweight telemetry system to track specific business-level events (e.g., "Report Generated", "Invoice Paid").

- **Anonymization**: All telemetry events are anonymized by default. No PII is stored in the telemetry logs.
- **Storage**: Events are initially buffered in-memory and periodically flushed to the data store (or exported to an external collector if configured).
- **Audit Logs**: High-security events are also recorded in the **Audit Logs** table for compliance.

## Dashboard Visualization

Administrators can view a high-level summary of system performance and activity under **Admin Panel** > **System Status**.

- **Latency Overview**: Real-time chart of API response times.
- **Error Rates**: Tracking of 4xx and 5xx errors by route.
- **Active Users**: Pulse of concurrent sessions and active organization context.

## Technical Details

- **Middleware**: `backend/src/middleware/metrics.ts`
- **Configuration**: `PROMETHEUS_ENABLED`, `METRICS_AUTH_KEY` in environment variables.
