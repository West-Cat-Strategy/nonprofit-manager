# Security Monitoring & Detection Guide

This guide outlines how to monitor the application for security threats, anomalies, and compliance violations in real-time.

## Table of Contents

1. [Monitoring Architecture](#monitoring-architecture)
2. [Authentication & Access Logs](#authentication--access-logs)
3. [Data Access Monitoring](#data-access-monitoring)
4. [API & Rate Limiting Monitoring](#api--rate-limiting-monitoring)
5. [Infrastructure & System Monitoring](#infrastructure--system-monitoring)
6. [Alert Rules & Thresholds](#alert-rules--thresholds)
7. [Dashboard Construction](#dashboard-construction)
8. [Log Retention & Archival](#log-retention--archival)
9. [Compliance Reporting](#compliance-reporting)
10. [Incident Detection Workflows](#incident-detection-workflows)

---

## Monitoring Architecture

### Log Flow

```
Application Logs
    ↓
Winston Logger (backend/src/config/logger.ts)
    ↓
HttpLogTransport (HTTP POST to Logstash)
    ↓
Logstash (event processing)
    ↓
Elasticsearch (indexed storage)
    ↓
Kibana (visualization & alerting)
    ↓
PagerDuty/Slack (incident notifications)
```

### Key Monitoring Systems

| System | Purpose | Priority | Tool |
|--------|---------|----------|------|
| **Authentication Monitor** | Failed logins, MFA bypasses, session hijacking | CRITICAL | Kibana Alerts + Slack |
| **Data Access Monitor** | PII access patterns, unusual queries | CRITICAL | Kibana Alerts + Sentry |
| **API Rate Limiting** | DDoS detection, brute force attempts | HIGH | Kibana + Custom dashboards |
| **Database Integrity** | Schema changes, trigger failures | HIGH | CloudWatch + Alerts |
| **Application Errors** | Security exceptions, auth failures | MEDIUM | Sentry + Slack |
| **Infrastructure** | Container health, resource utilization | MEDIUM | Docker events + Prometheus |

---

## Authentication & Access Logs

### What to Monitor

```javascript
// Winston logs these events automatically via structuredLogging middleware

// 1. Failed Login Attempts
{
  "level": "error",
  "service": "auth",
  "event_type": "security",
  "action": "login_failed",
  "reason": "invalid_password",
  "user_email": "user@example.com",
  "ip_address": "203.0.113.45",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2026-02-14T12:45:30Z",
  "request_id": "uuid-1234"
}

// 2. MFA Failures
{
  "level": "warn",
  "service": "auth",
  "event_type": "security",
  "action": "mfa_failed",
  "user_id": "uuid-user-123",
  "mfa_type": "totp",
  "attempts": 3,
  "ip_address": "203.0.113.45",
  "timestamp": "2026-02-14T12:46:00Z"
}

// 3. Successful Login
{
  "level": "info",
  "service": "auth",
  "event_type": "audit",
  "action": "login_success",
  "user_id": "uuid-user-123",
  "ip_address": "203.0.113.45",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2026-02-14T12:47:00Z"
}

// 4. Session Revocation
{
  "level": "info",
  "service": "auth",
  "event_type": "audit",
  "action": "logout",
  "user_id": "uuid-user-123",
  "session_duration_seconds": 3600,
  "timestamp": "2026-02-14T13:47:00Z"
}
```

### Kibana Query: Failed Logins by User

```
service:auth AND action:login_failed
| stats count() as failures by user_email, ip_address
| where failures > 3
| sort failures desc
```

### Alert: Brute Force Attack Detection

```yaml
# Alert Rule: Brute Force Detection
name: "Brute Force Attack Detected"
severity: CRITICAL
condition: 
  query: 'service:auth AND action:login_failed'
  group_by: 'user_email'
  threshold: "> 5 failures in 10 minutes"
notification:
  slack: "#security-incidents"
  pagerduty: "on-call security"
  email: "security@company.com"
actions:
  - "Rate limit IP address"
  - "Lock user account (24h)"
  - "Send user password reset link"
```

### Alert: New IP Address Login (Suspicious)

```yaml
# Alert Rule: New IP Login
name: "Login from Unusual Location"
severity: HIGH
condition:
  query: 'service:auth AND action:login_success'
  check: 'IP not in historical_ips AND confidence_score < 0.5'
  threshold: "User's first login from this IP"
notification:
  slack: "#security-monitoring"
actions:
  - "Send 2FA challenge"
  - "Log IP for historical tracking"

# Example: User typically logs in from San Francisco (203.0.113.0/24)
# Today logs in from Singapore (198.51.100.0/24)
# → Alert, require additional 2FA
```

---

## Data Access Monitoring

### PII Access Log Schema

From `structuredLogging.ts` and database `pii_access_audit`:

```sql
-- Structure of logged PII access
{
  user_id: UUID,
  accessed_at: TIMESTAMP WITH TIME ZONE,
  fields_accessed: TEXT[],  -- ['phone', 'email', 'ssn']
  record_id: UUID,
  table_name: VARCHAR,
  action: VARCHAR,  -- 'select', 'export'
  justification: TEXT,
  ip_address: INET,
  request_id: UUID,
  is_authorized: BOOLEAN
}
```

### Kibana Query: All PII Access

```
service:application AND event_type:audit AND action:"pii_accessed"
| table timestamp, user_id, fields_accessed, record_id, action
| sort timestamp desc
```

### Kibana Query: Unusual PII Access Patterns

```
service:application AND action:"pii_accessed" 
| stats count() as access_count by user_id, fields_accessed
| where access_count > 100  -- User accessed PII more than 100 times
| where fields_accessed contains "ssn"  -- And it was SSN data
```

### Alert: Mass PII Access (Potential Data Exfiltration)

```yaml
name: "Mass PII Access Detected"
severity: CRITICAL
condition:
  query: 'service:application AND action:"pii_accessed"'
  group_by: 'user_id'
  threshold: "> 50 PII records accessed in 5 minutes"
notification:
  slack: "#security-incidents"
  pagerduty: "on-call"
actions:
  - "Immediately page Security Lead"
  - "Log user activity to isolated audit file"
  - "Prepare to revoke user session"
```

### Alert: Unauthorized PII Access

```yaml
name: "Unauthorized PII Access"
severity: CRITICAL
condition:
  query: 'service:application AND action:"pii_accessed" AND is_authorized:false'
  threshold: "> 0 unauthorized accesses"
notification:
  slack: "#security-incidents" + "@security-lead"
  email: "security@company.com"
actions:
  - "Block user immediately"
  - "Export access logs to forensics folder"
  - "Trigger incident response protocol"
```

### Alert: Admin PII Access Without Justification

```yaml
name: "Admin PII Access Without Reason"
severity: HIGH
condition:
  query: 'service:application AND action:"pii_accessed" AND user_role:admin 
           AND (justification:null OR justification:"")'
  threshold: "> 0"
notification:
  slack: "#audit-log"
  email: "compliance@company.com"
  message: |
    Admin @{user_email} accessed PII for user ID {record_id} 
    without providing a justification reason.
    This may be unauthorized.
```

---

## API & Rate Limiting Monitoring

### API Health Metrics

```javascript
// Logged by structuredLogging.ts
{
  "level": "info",
  "service": "request",
  "event_type": "http_request",
  "method": "GET",
  "endpoint": "/api/v1/contacts",
  "status_code": 200,
  "response_time_ms": 45,
  "user_id": "uuid",
  "ip_address": "203.0.113.45",
  "api_key_id": "api-key-abc-123",  // If API key auth
  "timestamp": "2026-02-14T12:45:30Z"
}
```

### Kibana Query: API Response Times

```
service:request
| stats average(response_time_ms) as avg_time, 
         max(response_time_ms) as max_time,
         count() as request_count
  by endpoint
| where avg_time > 200  -- Flag slow endpoints
```

### Kibana Query: Error Rate by Endpoint

```
service:request
| stats count() as total, 
         count(status_code:5*) as errors
  by endpoint
| eval error_rate = (errors / total) * 100
| where error_rate > 5  -- More than 5% errors
```

### Alert: High Error Rate

```yaml
name: "API Error Rate Spike"
severity: HIGH
condition:
  query: 'service:request AND status_code:"5*"'
  group_by: 'endpoint'
  threshold: "> 10 errors in 5 minutes OR error_rate > 10%"
notification:
  slack: "#api-incidents"
  pagerduty: "backend-oncall"
actions:
  - "Check backend logs for exceptions"
  - "Verify database connectivity"
  - "Review recent deployments"
```

### Alert: Rate Limit Exceeded

```yaml
name: "Rate Limit Triggered"
severity: MEDIUM
condition:
  query: 'service:request AND status_code:429'
  threshold: "> 5 429 responses in 1 minute"
notification:
  slack: "#api-monitoring"
  message: |
    Rate limit hit for endpoint: {endpoint}
    Hits: {count} from {ip_address}
    Likely: DDoS or brute force attempt
actions:
  - "Check IP reputation in threat intel"
  - "Increase rate limit threshold if legitimate"
  - "Block IP if malicious"
```

### Alert: API Key Usage Anomaly

```yaml
name: "Unusual API Key Activity"
severity: MEDIUM
condition:
  query: 'service:request AND api_key_id:"*"'
  check: 'Request rate unusual for this key'
  baseline: 'Last 30-day average request rate'
  threshold: "> 3x of baseline OR after hours usage"
notification:
  slack: "#api-security"
  email: "api-owner@company.com"
actions:
  - "Notify API key owner"
  - "Request explanation for unusual activity"
  - "Offer to rotate key if compromised"
```

---

## Infrastructure & System Monitoring

### Database Monitoring

```sql
-- Monitor slow queries (> 1 second)
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Monitor table bloat (unused rows = deleted but not cleaned)
SELECT schemaname, tablename, 
       round(100.0 * (CASE WHEN otta>0 THEN sml.relpages-otta ELSE 0 END) / 
             sml.relpages) AS table_waste_ratio
FROM pg_class sml
ORDER BY table_waste_ratio DESC
LIMIT 10;

-- Monitor transaction ID wraparound risk
SELECT * FROM pg_database 
WHERE datname = 'nonprofit_manager';

-- Monitor audit log size (if partitioned by month)
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(tableid)) as size
FROM pg_tables
WHERE tablename LIKE 'audit_log%'
ORDER BY size DESC;
```

### Alert: Database Connection Pool Exhaustion

```yaml
name: "Database Connection Pool Low"
severity: CRITICAL
condition:
  query: 'service:database AND metric:connection_pool_available'
  threshold: "< 2 connections remaining in pool"
notification:
  slack: "#infrastructure-incidents" + "@devops"
  pagerduty: "on-call"
actions:
  - "Check for connection leaks"
  - "Identify long-running queries"
  - "Consider increasing pool size"
  - "Prepare for graceful degradation"
```

### Alert: Audit Log Growth Warning

```yaml
name: "Audit Log Partition Growing Rapidly"
severity: MEDIUM
condition:
  query: 'service:database AND table:audit_log'
  check: 'Growth rate in GB/day'
  threshold: "> 5GB in single month OR retention cleanup failed"
notification:
  slack: "#database-monitoring"
  email: "dba@company.com"
actions:
  - "Verify partition by month is working"
  - "Run retention cleanup if overdue"
  - "Consider archival strategy"
```

### Container Health Monitoring

```bash
# Monitor Docker container status
docker stats --no-stream

# Alert on container restart
docker events --filter type=container | grep restart

# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}"
```

### Alert: Container Restart Loop

```yaml
name: "Container Restarting Repeatedly"
severity: CRITICAL
condition:
  query: 'Container restart detected'
  threshold: "> 3 restarts in 10 minutes"
notification:
  slack: "#infrastructure-critical"
  pagerduty: "on-call"
actions:
  - "Check container logs for errors"
  - "Verify environment variables are set"
  - "Check disk space"
  - "Consider rollback if recent deployment"
```

---

## Alert Rules & Thresholds

### Summary of All Alerts

| Alert Name | Severity | Threshold | Response | AdjustableWeekly |
|---|---|---|---|---|
| Brute Force Attack | CRITICAL | >5 failures/10m | Lock account + notify | Yes |
| Unauthorized PII | CRITICAL | >0 unauthorized | Block + incident | No |
| Admin PII No Reason | HIGH | >0 unmotivated | Review + reevaluate | Change via audit |
| API Error Spike | HIGH | >10 errors/5m OR >10% | Page backend | Yes |
| Rate Limit Hit | MEDIUM | >5 429s/min | Check IP + gauge | Yes |
| Connection Pool Low | CRITICAL | <2 available | Page DBA | Adjust pool size |
| New IP Login | HIGH | First IP + low confidence | 2FA challenge | Fine-tune baseline |
| PII Mass Access | CRITICAL | >50 records/5min | Block + incident | Tune to org pattern |
| Deployment Failure | HIGH | Exit code non-zero | Page DevOps | Track → 100% |
| SSL Certificate Expire | HIGH | <30 days | Alert ops | Auto-renewal check |

### Tuning Thresholds

Each alert should be tuned to your organization:

```python
# Example: Rate Limiting Threshold

baseline_requests_per_sec = 100  # Normal peak
threshold = baseline_requests_per_sec * 1.5  # 150 reqs/sec = alert

# For brute force: 5 failures per 10 minutes is reasonable
# For mass data access: depends on your org (bulk export vs normal = 50 records)
# For error rates: depends on service (API: 5%, background jobs: 10%)
```

---

## Dashboard Construction

### Dashboard 1: Authentication & Security

**Metrics to Display**:

1. **Login Success Rate** (Top left)
   ```
   Query: service:auth AND action:login_success
   Metric: count by hour
   Target: > 99% during business hours
   ```

2. **Failed Logins by Reason** (Top right)
   ```
   Query: service:auth AND action:login_failed
   Visualization: Pie chart
   Breakdown: invalid_password, account_locked, mfa_failed, invalid_user
   Alert: Any reason > 10 in 10min
   ```

3. **Brute Force Attempts** (Middle)
   ```
   Query: service:auth AND action:login_failed
   Visualization: Timeline
   Group by: ip_address
   Alert: IP with >5 failures
   ```

4. **MFA Adoption** (Bottom left)
   ```
   Query: service:auth AND mfa_enabled:true
   Metric: percentage of users with MFA
   Target: > 95% for admins, > 80% overall
   ```

5. **Unusual Login Locations** (Bottom right)
   ```
   Query: service:auth AND action:unusual_ip
   Visualization: World map
   Show: New IP logins by country
   ```

### Dashboard 2: Data Access & PII Monitoring

**Metrics to Display**:

1. **PII Access Timeline** (Top)
   ```
   Query: service:application AND action:pii_accessed
   Visualization: Timeline
   Color: Red if unauthorized, Green if authorized
   ```

2. **PII Access by User** (Left)
   ```
   Query: service:application AND action:pii_accessed
   Visualization: Bar chart
   Group by: user_id
   Alert: User >100 accesses
   ```

3. **PII Fields Accessed** (Right)
   ```
   Query: service:application AND action:pii_accessed
   Visualization: Count by field_type
   Breakdown: phone, email, ssn, payment_method, address
   ```

4. **Unauthorized Access Attempts** (Bottom)
   ```
   Query: service:application AND is_authorized:false
   Visualization: Alert table
   Columns: timestamp, user_id, record_id, reason
   Alert: Any unauthorized attempt
   ```

### Dashboard 3: API Performance & Errors

**Metrics to Display**:

1. **Request Rate** (Top left)
   ```
   Query: service:request
   Metric: requests per second
   Target: <100 during peak hours
   ```

2. **Error Rate by Endpoint** (Top right)
   ```
   Query: service:request
   Visualization: Line chart per endpoint
   Alert: Error rate >5%
   ```

3. **Response Time Distribution** (Middle)
   ```
   Query: service:request
   Visualization: Percentile chart (p50, p95, p99)
   Alert: p99 latency >1000ms
   ```

4. **Rate Limit Events** (Bottom)
   ```
   Query: service:request AND status_code:429
   Visualization: Timeline
   Group by: endpoint, ip_address
   ```

### Dashboard 4: Database & Infrastructure

**Metrics to Display**:

1. **Database Connection Pool** (Top)
   ```
   Query: metric:db_connections
   Visualization: Gauge
   Zones: 
     - Green: 10+ available
     - Yellow: 5-10 available
     - Red: <5 available
   ```

2. **Query Performance** (Upper middle)
   ```
   Query: service:database AND type:slow_query
   Visualization: Histogram of query duration
   Alert: Query >1000ms
   ```

3. **Audit Log Growth** (Lower middle)
   ```
   Query: service:database AND table:audit_log
   Metric: Size in MB
   Trend: Growth rate GB/day
   Alert: >5GB in month
   ```

4. **Container Health** (Bottom)
   ```
   Metrics: CPU, Memory, Disk for each container
   Visualization: Mini gauges
   Alert: CPU >80%, Memory >85%
   ```

---

## Log Retention & Archival

### Retention Policy

```yaml
Log Type               | Retention Period | Archive Location
Authentication logs   | 90 days online   | AWS S3 (2 years)
API request logs      | 30 days online   | AWS S3 (1 year)
Error logs            | 30 days online   | AWS S3 (1 year)
PII access audit logs | 365 days online  | AWS S3 (7 years - GDPR)
Application logs      | 14 days online   | AWS S3 (1 year)
Database audit logs   | Monthly partitions, oldest > 1 year archived
```

### Archival Process

```bash
#!/bin/bash
# scripts/archive-logs.sh

# Monthly archival to S3
MONTH=$(date +%Y-%m)
ARCHIVE_NAME="logs-${MONTH}.tar.gz"

# Export from Elasticsearch
curl -X GET "elasticsearch:9200/logs-*-${MONTH}/_search?scroll=1m" \
  | jq -c '.hits.hits[]' \
  > /tmp/logs-${MONTH}.jsonl

# Encrypt with org's key
openssl enc -aes-256-cbc -in /tmp/logs-${MONTH}.jsonl \
  -out /tmp/logs-${MONTH}.jsonl.enc \
  -K $ARCHIVE_ENCRYPTION_KEY

# Upload to S3 with 7-year retention
aws s3 cp /tmp/logs-${MONTH}.jsonl.enc \
  s3://compliance-archive/logs-${MONTH}/ \
  --storage-class GLACIER \
  --sse AES256

# Cleanup local
rm /tmp/logs-${MONTH}.jsonl*
```

### Long-term Storage

- **AWS S3**: Encrypted at rest, versioning enabled, lifecycle policy to move to Glacier after 90 days
- **Backup**: Daily snapshots to S3 Cross-Region Replication
- **Access Control**: Only compliance officers can access archive
- **Integrity**: Store checksums in separate secure location

---

## Compliance Reporting

### Automated Reports

#### Daily Security Report (Email to Security Team)

```python
# scripts/daily-security-report.py

from datetime import datetime, timedelta
from elasticsearch import Elasticsearch

es = Elasticsearch(['elasticsearch:9200'])
yesterday = datetime.now() - timedelta(days=1)

# Query metrics for past day
failed_logins = es.count(
    index="logs-*",
    body={
        "query": {
            "bool": {
                "must": [
                    {"match": {"action": "login_failed"}},
                    {"range": {"timestamp": {"gte": yesterday}}}
                ]
            }
        }
    }
)

pii_accesses = es.search(
    index="logs-*",
    body={
        "query": {
            "bool": {
                "must": [
                    {"match": {"action": "pii_accessed"}},
                    {"range": {"timestamp": {"gte": yesterday}}}
                ]
            }
        },
        "aggs": {
            "by_type": {
                "terms": {"field": "fields_accessed.keyword"}
            }
        }
    }
)

# Generate email
report = f"""
DAILY SECURITY REPORT - {yesterday.date()}

Authentication:
- Failed logins: {failed_logins['count']}
- MFA failures: [from logs]
- New IP logins: [from logs]

Data Access:
- PII accesses: {pii_accesses['hits']['total']['value']}
- Most accessed field: {pii_accesses['aggregations']['by_type']['buckets'][0]['key']}
- Unauthorized accesses: [from logs]

API:
- Request errors: [from logs]
- Rate limit hits: [from logs]
- Slow queries: [from logs]

Infrastructure:
- Container restarts: [from logs]
- Database connection pool usage: [from logs]

Alerts Triggered:
[List all alerts]

Action Items:
[List any required investigations]
"""

send_email("security@company.com", "Daily Security Report", report)
```

#### Monthly Compliance Report (For Auditors)

```markdown
# Monthly Security Compliance Report - February 2026

## Executive Summary
- Security incidents: 0 critical, 1 high, 0 medium
- PII access violations: 0
- Failed authentication attempts: 234
- System uptime: 99.98%

## Detailed Findings

### 1. Access Controls
- ✓ All admin accounts have 2FA enabled (15/15)
- ✓ No dormant accounts detected
- ✓ Permission changes logged: 23 in past month
- ✓ API key rotation: Last rotated 2026-01-15

### 2. Data Protection
- ✓ PII encryption enabled for all sensitive fields
- ✓ Database encryption in transit: TLS 1.3
- ✓ Data access audit trail complete
- ✓ No unauthorized PII access detected

### 3. System Security
- ✓ All software patches applied within 30 days
- ✓ Security scanning: 0 critical vulnerabilities
- ✓ Incident response playbooks tested
- ✓ Log retention policy enforced

### 4. Incidents & Response
- February 2 @ 14:30: False positive rate limit alert (resolved in 5 min)
- February 18 @ 09:15: Admin password reset required, completed same day
- Average incident response time: 12 minutes

### Compliance Status
- GDPR: ✓ Compliant
- HIPAA: ✓ Compliant (if applicable)
- SOC 2: ✓ Tracking controls
- PCI DSS: ✓ No card data stored
```

---

## Incident Detection Workflows

### Workflow 1: Suspected Data Breach

```
TRIGGER: Alert "Unauthorized PII Access" OR "Mass PII Access"
  ↓
1. IMMEDIATE
   [X] Page Security Lead (PagerDuty)
   [X] Create Slack incident channel (#incident-20260214)
   [X] Export access logs from Elasticsearch
   [ ] Screenshot current metrics
   
2. WITHIN 5 MINUTES
   [ ] Verify data was actually accessed (not false alarm)
   [ ] Determine WHO accessed data (user_id)
   [ ] Determine WHAT data (fields: ssn, email, phone)
   [ ] Determine HOW MANY records (1, 10, 1000)
   
3. WITHIN 15 MINUTES
   [ ] Assess severity:
        - Critical: SSN, all fields, >100 records
        - High: Email, phone, any field, 10-100 records
        - Medium: Partial exposure, <10 records
   [ ] Determine root cause:
        - Authorized user accessing out-of-scope records?
        - SQL injection or unauthorized API access?
        - Leaked API key?
   
4. WITHIN 30 MINUTES
   [ ] All affected users' emails exported
   [ ] Notification email draft reviewed
   [ ] Legal consulted if data breach confirmed
   [ ] Log preservation started
   
5. WITHIN 1 HOUR
   [ ] Customer notification sent
   [ ] Regulatory notification prepared
   [ ] Root cause fix deployed (if vulnerable code)
   [ ] Access revoked (if compromised account)

6. WITHIN 24 HOURS
   [ ] Forensics complete
   [ ] Post-incident review scheduled
   [ ] All evidence archived
```

### Workflow 2: Suspected System Compromise

```
TRIGGER: Alert "Unusual API Usage" OR "Container Restart Loop" 
         OR manual report of suspicious behavior
  ↓
1. IMMEDIATE
   [ ] Page DevOps + Security (PagerDuty)
   [ ] Create war room Slack channel
   [ ] Snapshot system state (before making changes!)
        docker inspect > /tmp/incident-state.json
        docker logs > /tmp/incident-logs.txt
   
2. WITHIN 15 MINUTES
   [ ] Evidence collection (non-destructive):
        [ ] Recent commands in bash history
        [ ] Running processes (docker top)
        [ ] Network connections (netstat)
        [ ] Modified files (find . -mtime -1)
   
   [ ] Identify attack vector:
        [ ] Exposed endpoint (check recent errors)
        [ ] Exploited vulnerability (check code for CVEs)
        [ ] Weak credentials (check Auth logs)
        [ ] Insider threat (check users with recent access)
   
3. WITHIN 1 HOUR
   [ ] Determine if still compromised:
        [ ] Active reverse shell? (netstat -tulpn)
        [ ] Scheduled backdoor? (check cron, systemd timers)
        [ ] Persistent malware? (scan with ClamAV)
   [ ] Assess impact:
        [ ] What data could they access?
        [ ] What commands could they run?
        [ ] Are other systems at risk?
   
4. CONTAINMENT (Parallel to investigation)
   [ ] Revoke compromised credentials
   [ ] Deploy patched code if vulnerability exploited
   [ ] Isolate infected system if suspected malware
   [ ] Increase monitoring on all systems
   
5. RECOVERY
   [ ] Rebuild affected system from clean image
   [ ] Restore from pre-incident backup
   [ ] Verify integrity via checksums
   [ ] Monitor closely for re-compromise
```

### Workflow 3: Rate Limiting/DDoS Detection

```
TRIGGER: Alert "Rate Limit Triggered" >5 times in 1 minute
  ↓
1. IMMEDIATE
   [ ] Identify attacked endpoint(s)
   [ ] Identify attacking IP(s)
   
2. WITHIN 5 MINUTES
   [ ] Check IP reputation:
        curl https://api.abuseipdb.com/api/v2/check?ipAddress=203.0.113.45
   
   [ ] Distinguish attack type:
        - Single IP, single endpoint → Targeted attack/bot
        - Multiple IPs, multiple endpoints → DDoS
        - Single IP, low rate → Brute force attempt
   
3. DECISION TREE
   
   IF legitimate traffic spike (launch announcement, press):
     → Increase rate limit temporarily
     → Monitor for next 6 hours
     → Log incident for capacity planning
   
   IF bot/scraper:
     → Block IP at WAF level (not application)
     → Resume normal operations
     → Review robots.txt and /api/v1/docs
   
   IF DDoS:
     → Enable DDoS protection (AWS Shield, Cloudflare)
     → Activate auto-scaling if available
     → Degrade non-critical services
     → Route traffic through CDN
     → Page on-call
   
   IF brute force (e.g., admin panel):
     → Lock user account (24h)
     → Require email verification to unlock
     → Block IP for 1 hour
```

---

## Integration with Alerting Platforms

### PagerDuty Integration

```yaml
# .env configuration
PAGERDUTY_INTEGRATION_URL=https://events.pagerduty.com/v2/enqueue
PAGERDUTY_ROUTING_KEY=...

# Alert firing example
POST https://events.pagerduty.com/v2/enqueue
{
  "routing_key": "${PAGERDUTY_ROUTING_KEY}",
  "event_action": "trigger",
  "payload": {
    "summary": "Brute Force Attack Detected - 8 failures from 203.0.113.45",
    "severity": "critical",
    "source": "Kibana Security Alert",
    "custom_details": {
      "ip_address": "203.0.113.45",
      "failures": 8,
      "time_window": "10 minutes",
      "affected_users": ["user1@example.com", "user2@example.com"],
      "recommended_action": "Lock accounts and block IP"
    }
  }
}
```

### Slack Integration

```javascript
// backend/src/services/alertService.ts

async function sendSecurityAlert(alert: SecurityAlert) {
  const severity_emoji = {
    CRITICAL: ':rotating_light:',
    HIGH: ':warning:',
    MEDIUM: ':⚠️:',
    LOW: ':information_source:'
  };

  const message = {
    channel: alert.severity === 'CRITICAL' ? '#security-incidents' : '#security-monitoring',
    text: `${severity_emoji[alert.severity]} ${alert.title}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${alert.title}*\n*Severity:* ${alert.severity}\n${alert.description}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Detected:*\n${alert.detected_at}`
          },
          {
            type: 'mrkdwn',
            text: `*Affected:*\n${alert.affected_count} users/records`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recommended Actions:*\n${alert.actions.join('\n')}`
        }
      }
    ]
  };

  await slack.chat.postMessage(message);
}
```

---

## Testing & Validation

### Alert Testing Checklist

- [ ] **Brute Force Alert**: SSH login 10x with wrong password → Should alert in <1 minute
- [ ] **PII Access Alert**: Run query accessing 100 SSN records → Should alert in <5 minutes
- [ ] **Error Rate Alert**: Trigger 404 errors via curl loop → Should alert when >5%
- [ ] **Rate Limit Alert**: Apache Bench 1000 requests/sec → Should trigger rate limit then alert
- [ ] **Database Alert**: Stop PostgreSQL service → Should alert connection pool drop in <2 minutes

### Validation Steps

```bash
# Test Elasticsearch connectivity
curl -s http://elasticsearch:9200 | jq .

# Test Kibana alerting
curl -X GET "kibana:5601/api/alerting/rules"

# Test Slack integration
curl -X POST ${SLACK_WEBHOOK_URL} \
  -d '{"text": "Test alert from monitoring system"}'

# Test log parsing
cat /var/log/app.log | jq . | head -20

# Verify alert rules exist
curl -s http://elasticsearch:9200/_watcher/watch/_all | jq '.watches | length'
```

---

**Last Updated**: February 14, 2026  
**Owner**: Security & DevOps Team  
**Review Frequency**: Quarterly (or after incident)  
**Next Review**: May 14, 2026
