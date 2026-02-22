# Log Aggregation Setup Guide

## Overview

This guide explains how to set up centralized log aggregation for the Nonprofit Manager application. Log aggregation is critical for:

- **Debugging**: Trace requests across services using request IDs
- **Monitoring**: Track application health, performance, and errors
- **Security**: Audit access to sensitive data and detect suspicious activity
- **Compliance**: Maintain audit trails for regulatory requirements

## Supported Solutions

### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana) - Self-Hosted

**Best for:** Organizations wanting full control, running on-premises.

#### Setup

1. **Docker Compose Configuration**:

```yaml
# Add to docker-compose.yml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
  ports:
    - "9200:9200"
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data

logstash:
  image: docker.elastic.co/logstash/logstash:8.5.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  ports:
    - "8080:8080"
  depends_on:
    - elasticsearch

kibana:
  image: docker.elastic.co/kibana/kibana:8.5.0
  ports:
    - "5601:5601"
  environment:
    - ELASTICSEARCH_HOSTS=elasticsearch:9200
  depends_on:
    - elasticsearch
```

2. **Logstash Configuration** (`logstash.conf`):

```conf
input {
  http {
    port => 8080
    codec => json
  }
}

filter {
  if [timestamp] {
    date {
      match => [ "timestamp", "ISO8601" ]
      target => "@timestamp"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{+YYYY.MM.dd}"
  }
}
```

3. **Environment Variables** (`.env.production`):

```bash
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_HOST=logstash
LOG_AGGREGATION_PORT=8080
LOG_AGGREGATION_PATH=/logs
LOG_AGGREGATION_PROTOCOL=http
```

4. **Kibana Dashboard**:
   - Visit `localhost:5601`
   - Create index pattern: `logs-*`
   - Create dashboards to monitor:
     - Request rates by endpoint
     - Error rates over time
     - Response times (p50, p95, p99)
     - API key usage
     - Authentication failures
     - PII access logs

---

### Option 2: Loki (Grafana) - Lightweight

**Best for:** Kubernetes deployments, lower resource footprint.

#### Setup

1. **Loki Docker Compose**:

```yaml
loki:
  image: grafana/loki:latest
  ports:
    - "3100:3100"
  volumes:
    - ./loki-config.yaml:/etc/loki/local-config.yaml
  command: -config.file=/etc/loki/local-config.yaml

grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
  depends_on:
    - loki
```

2. **Loki Configuration** (`loki-config.yaml`):

```yaml
auth_enabled: false

ingester:
  chunk_idle_period: 3m
  max_chunk_age: 1h
  max_streams_per_user: 10000
  lifecycler:
    ring:
      kvstore:
        store: inmemory

limits_config:
  enforce_metric_name: false
  ingestion_burst_size_mb: 20
  ingestion_rate_mb: 10

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema:
        prefix: index_
        period: 24h

server:
  http_listen_port: 3100
```

3. **Configure Application**:

We use a custom HTTP transport that logs to Loki via HTTP endpoint, not syslog directly.

```bash
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_HOST=loki
LOG_AGGREGATION_PORT=3100
LOG_AGGREGATION_PATH=/loki/api/v1/push
LOG_AGGREGATION_PROTOCOL=http
```

---

### Option 3: Datadog - Managed Service

**Best for:** Organizations wanting managed, SaaS solution with advanced features.

#### Setup

1. **Create Datadog Account**:
   - Visit https://www.datadoghq.com
   - Sign up and get API key from Settings > Organization

2. **Docker Agent Configuration**:

```yaml
datadog:
  image: gcr.io/datadoghq/agent:latest
  environment:
    - DD_API_KEY=${DATADOG_API_KEY}
    - DD_SITE=datadoghq.com
    - DD_LOGS_ENABLED=true
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - /proc:/host/proc:ro
    - /sys/fs/cgroup:/host/sys/fs/cgroup:ro
```

3. **Environment Variables**:

Create Datadog HTTP API endpoint using their Logs API:

```bash
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_HOST=http-intake.logs.datadoghq.com
LOG_AGGREGATION_PORT=443
LOG_AGGREGATION_PATH=/v1/input/${DATADOG_API_KEY}
LOG_AGGREGATION_PROTOCOL=https
LOG_AGGREGATION_API_KEY=${DATADOG_API_KEY}
```

---

### Option 4: CloudWatch - AWS

**Best for:** AWS-native deployments.

#### Setup

1. **IAM Permissions** (add to ECS task role):

```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "arn:aws:logs:*:*:*"
}
```

2. **Docker Compose** (using awslogs driver):

```yaml
services:
  api:
    image: nonprofit-manager-api:latest
    logging:
      driver: awslogs
      options:
        awslogs-group: /nonprofit-manager/api
        awslogs-region: us-east-1
        awslogs-stream-prefix: api-
```

3. **Disable HTTP transport - CloudWatch uses native driver**:

```bash
LOG_AGGREGATION_ENABLED=false
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_AGGREGATION_ENABLED` | No | `false` | Enable log aggregation |
| `LOG_AGGREGATION_HOST` | Yes (if enabled) | - | Hostname/IP of log aggregation service |
| `LOG_AGGREGATION_PORT` | No | `8080` | Port of log aggregation service |
| `LOG_AGGREGATION_PATH` | No | `/logs` | HTTP path for logs endpoint |
| `LOG_AGGREGATION_PROTOCOL` | No | `http` | `http` or `https` |
| `LOG_AGGREGATION_API_KEY` | No | - | API key if required by service |
| `LOG_LEVEL` | No | `info` | Log level: `error`, `warn`, `info`, `debug` |

---

## What Gets Logged

### Request Logs

Every HTTP request logs:
- Request ID (unique trace ID)
- Method, path, query parameters
- Status code, response size, response time
- User ID and role (if authenticated)
- Client IP address and user agent

Example:
```json
{
  "level": "info",
  "message": "Incoming request",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/v1/contacts/abc123",
  "userId": "user-id",
  "userRole": "admin",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-02-14T12:34:56.789Z"
}
```

### Error Logs

Errors include full stack trace:
```json
{
  "level": "error",
  "message": "Request error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/v1/donations",
  "statusCode": 500,
  "error": {
    "name": "DatabaseError",
    "message": "Connection pool exhausted",
    "stack": "..."
  },
  "timestamp": "2025-02-14T12:34:56.789Z"
}
```

### Audit Logs

Business-critical operations are logged:
```json
{
  "level": "info",
  "message": "Audit event",
  "eventType": "contact.updated",
  "resourceType": "contact",
  "resourceId": "contact-123",
  "changes": {
    "email": {
      "old": "old@example.com",
      "new": "new@example.com"
    }
  },
  "userId": "user-id",
  "timestamp": "2025-02-14T12:34:56.789Z"
}
```

### Security Events

Failed authentication, unauthorized access, etc.:
```json
{
  "level": "warn",
  "message": "Security event",
  "eventType": "login.failed",
  "severity": "medium",
  "userId": "user-id",
  "reason": "invalid_password",
  "ip": "192.168.1.1",
  "timestamp": "2025-02-14T12:34:56.789Z"
}
```

### API Key Usage

Every API key request is logged:
```json
{
  "level": "info",
  "message": "API key usage",
  "apiKeyId": "app_xxxxx",
  "endpoint": "/api/v1/contacts",
  "method": "GET",
  "statusCode": 200,
  "duration": "145ms",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-02-14T12:34:56.789Z"
}
```

### PII Access Logs

Access to sensitive data:
```json
{
  "level": "info",
  "message": "PII access audit",
  "tableName": "contacts",
  "recordId": "contact-123",
  "fieldName": "phone",
  "accessType": "read",
  "userId": "user-id",
  "reason": "GET /api/v1/contacts/contact-123",
  "ip": "192.168.1.1",
  "timestamp": "2025-02-14T12:34:56.789Z"
}
```

---

## Querying Logs

### ELK/Kibana

Find all failed logins:
```json
{
  "query": {
    "multi_match": {
      "query": "login.failed",
      "fields": ["eventType", "message"]
    }
  }
}
```

Find slow requests:
```json
{
  "query": {
    "range": {
      "duration": {
        "gte": 1000
      }
    }
  }
}
```

### Loki/Grafana

Find requests for a user:
```
{userId="user-123"} | json
```

Find errors:
```
{level="error"} | json | statusCode > 499
```

Find API key usage for a key:
```
{apiKeyId="app_xxxxx"} | json
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Error Rate**: Alert if > 1% of requests fail
2. **Response Time**: Alert if p95 > 2 seconds
3. **Database Slow Queries**: Alert if > 100 queries/hour > 1 second
4. **Failed Logins**: Alert if > 5 failures from same IP in 5 mins
5. **PII Access**: Alert on unauthorized PII access
6. **API Key Abuse**: Alert on unusual API key usage patterns

### Example Alert Rules (Kibana)

**Failed Login Alert**:
```
Condition: Count() > 5
Filters: eventType: "login.failed" AND ip: <ip>
Time Window: 5 minutes
```

**Slow Query Alert**:
```
Condition: Max(duration) > 1000
Filters: message: "Slow database query"
Time Window: 10 minutes
```

---

## Retention & Cost

| Solution | Daily Volume | Monthly Cost | Retention | Notes |
|----------|--------------|--------------|-----------|-------|
| ELK Stack | Up to 10GB | $0 (self-hosted) | Unlimited | Requires infrastructure |
| Loki | Up to 50GB | $0 (self-hosted) | Unlimited | Lower resource footprint |
| Datadog | 1GB/day | ~$15-100/month | 15 days | Managed, advanced features |
| CloudWatch | 1GB/day | ~$5-50/month | Configurable | AWS-native |

---

## Troubleshooting

### Logs not appearing in aggregation service

1. Check network connectivity:
```bash
docker exec backend curl -v logstash:8080/logs
```

2. Check environment variables:
```bash
docker exec backend env | grep LOG_AGGREGATION
```

3. Check backend logs:
```bash
docker logs backend | grep -i "log aggregation"
```

4. Verify HTTP transport is initialized:
```bash
# Check logger.ts for HttpLogTransport registration
```

### Performance issues with log aggregation

1. Reduce log level in production:
```bash
LOG_LEVEL=warn  # Instead of info/debug
```

2. Increase batch size for HTTP transport:
```javascript
// In logger.ts, add batching logic
```

3. Configure sampling:
```bash
LOG_SAMPLE_RATE=0.1  # Log 10% of requests
```

---

## Next Steps

1. Choose log aggregation solution based on infrastructure
2. Deploy service (Docker) or create managed account
3. Configure environment variables
4. Run `make deploy-local` to test
5. Verify logs appear in dashboard
6. Create dashboards and alerts
7. Set up log retention policy
8. Document runbooks for operations team
