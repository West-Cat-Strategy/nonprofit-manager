# Security Incident Response Runbooks

## Critical Incident Runbook Template

### Incident: [Type - e.g., "Unauthorized Data Access", "System Compromise", "DDoS"]

**Severity**: CRITICAL (1 hour response time)  
**Estimated Impact**: Data breach, service outage, or account compromise  
**Escalation**: All hands to war room

---

## Phase 1: INITIAL RESPONSE (0-15 minutes)

### 1.1 Alert & Triage

- [ ] **Incident Detected**: Verify it's not a false alarm
- [ ] **Page On-Call**: Slack: `@security-incident` + call team lead
- [ ] **Create War Room**: Slack channel: `#incident-202X-XX-XX-[type]`
- [ ] **Document Initial Report**:
  ```
  Time Detected: [UTC timestamp]
  Detection Method: [Alert, manual report, etc.]
  Severity: CRITICAL
  Potentially Affected: [Users, systems, data]
  ```

### 1.2 Immediate Actions (Parallel)

**Tech Lead**:
- [ ] Check monitoring dashboard for anomalies
- [ ] Review recent deployments (any recent changes?)
- [ ] Check system logs for errors: `docker logs --tail 500 backend-api`

**Security Lead**:
- [ ] Note this in incident timeline
- [ ] List all team members responding
- [ ] Prepare to notify CEO/Board if data breach suspected

**Infrastructure Lead**:
- [ ] Take baseline snapshots (before making changes):
  ```bash
  docker ps > /tmp/incident-state-$(date +%s).txt
  docker exec postgres pg_dump -U postgres nonprofit_manager > /tmp/incident-backup-$(date +%s).sql
  ```
- [ ] Check API error rates in real-time monitoring
- [ ] Prepare to isolate systems if necessary

### 1.3 Initial Classification

- [ ] Is this a **Data Breach**? (Unauthorized access to PII)
- [ ] Is this a **System Compromise**? (Attacker gained access)
- [ ] Is this a **Service Outage**? (System unavailable)
- [ ] Is this a **Account Compromise**? (Single user access)
- [ ] Is this a **Denial of Service**? (Rate limiting triggered)

**Mark suspected incident type in war room**

---

## Phase 2: INVESTIGATION (15-120 minutes)

### 2.1 Data Breach Investigation

**If PII was potentially accessed**:

```bash
# Query who accessed PII in the time window
docker exec postgres psql -U postgres -d nonprofit_manager << 'SQL'
SELECT * FROM pii_access_audit 
WHERE accessed_at > '2026-02-14 12:00:00'::TIMESTAMP WITH TIME ZONE
AND accessed_at < '2026-02-14 14:00:00'::TIMESTAMP WITH TIME ZONE
ORDER BY accessed_at DESC;
SQL
```

```bash
# Check for unusual database queries
docker logs backend-api | grep -i "SELECT.*contacts" | tail -50
```

**Determine**:
- [ ] What data was accessed? (names, emails, phones, SSNs, payments)
- [ ] Which records? (count affected records)
- [ ] Which users were affected?
- [ ] How long was access possible? (start time to detection time)

### 2.2 System Compromise Investigation

**If attacker may have gained system access**:

```bash
# Check running processes
docker top backend-api

# Check recent file modifications
docker exec backend-api find /app -mtime -1 -type f

# Check environment variables (check for stolen secrets)
docker exec backend-api env | grep -i "secret\|key\|password"

# Check for reverse shells or suspicious connections
docker exec backend-api netstat -tulpn | grep ESTABLISHED
```

**Determine**:
- [ ] How did they get in? (exposed endpoint, vulnerability, credential compromise)
- [ ] What did they do? (run commands, modify files, access data)
- [ ] Are they still inside? (persistent backdoor, scheduled tasks)

### 2.3 Query Logs for Timeline

```bash
# API request logs around incident time
docker logs backend-api --since 2h | grep "2026-02-14 12:" > /tmp/incident-logs.txt

# Check failed authentication attempts
docker logs backend-api | grep -i "failed\|unauthorized" | tail -100

# Check for suspicious API endpoints being hit
docker logs backend-api | grep -E "(admin|users|secrets)" | tail -50
```

### 2.4 Check for Lateral Movement

```bash
# Did attacker try to access other systems?
docker exec backend-api curl -s internal-wiki.company.local 2>&1 | head

# Check if they modified database users
docker exec postgres psql -U postgres -d nonprofit_manager -c "SELECT * FROM pg_user;"

# Check if they created backdoor accounts
SELECT * FROM users WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## Phase 3: CONTAINMENT (Parallel to Investigation)

### 3.1 Immediate Mitigation (Non-Destructive)

```bash
# If API under active attack, rate limit more aggressively
# (without blocking legitimate traffic)
docker exec backend-api curl -X POST localhost:3000/admin/ratelimit \
  -d '{"limit": 10, "window": "1m"}'

# Revoke potentially compromised API keys
docker exec postgres psql -U postgres -d nonprofit_manager << 'SQL'
UPDATE api_keys SET is_active = false 
WHERE created_at < NOW() - INTERVAL '24 hours'
AND last_used_at > NOW() - INTERVAL '1 hour';
SQL
```

### 3.2 Isolate If Necessary

**Only if system is still under active attack**:

```bash
# Take API offline (before debugging)
docker-compose down

# Preserve all logs/data
tar -czvf incident-$(date +%s).tar.gz \
  backend/logs \
  /var/lib/docker/volumes \
  /tmp/incident-*

# Restart with temporary measures
docker-compose up -d
```

### 3.3 Credential Rotation (High Priority)

```bash
# Generate new secrets (scripts/generate-secrets.sh)
NEW_JWT_SECRET=$(openssl rand -hex 32)
NEW_DB_PASSWORD=$(openssl rand -base64 32)
NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Update .env and restart
# Rotate all authentication tokens
# Force password resets for users
```

---

## Phase 4: EVIDENCE PRESERVATION

**Critical: Do NOT delete anything yet**

```bash
# Capture complete state
docker inspect backend-api > /tmp/incident-container-state.json
docker ps -a > /tmp/incident-all-containers.txt

# Export database
pg_dump -U postgres nonprofit_manager > /tmp/incident-db-export.sql
pg_dump -U postgres nonprofit_manager audit_log | gzip > /tmp/incident-audit-log.sql.gz

# Export logs (10 days)
docker logs --tail 100000 backend-api > /tmp/backend-logs.txt 2>&1

# Preserve directory structure
tar -cvf /tmp/incident-filesystem.tar $(docker exec backend-api find / -mtime -1 -type f 2>/dev/null | head -1000)

# Create checksums (proof of integrity)
sha256sum /tmp/incident-* > /tmp/incident-checksums.txt
```

**Store all files in S3/Cloud Storage immediately**

---

## Phase 5: ROOT CAUSE ANALYSIS (During/After)

- [ ] **Timeline**: When did each action occur?
- [ ] **Attack Vector**: How did attacker get in?
- [ ] **Detection**: Why was it not caught sooner?
- [ ] **Impact**: What was accessed/modified?
- [ ] **Mitigation**: How was it stopped?

**Example: Unauthorized API Access**
```
10:00 - Attacker discovers /api/contacts endpoint (reconnaissance)
10:15 - Attacker makes 100 requests (probing for vulnerabilities)
10:20 - Rate limiting triggered, attacker IP blocked (GOOD)
10:25 - Attacker switches IP, continues probing (PROBLEM: Rate limit per-IP)
10:35 - Attacker finds SQL injection in search parameter
10:40 - Attacker extracts all contact records (1+ hour of exposure)
11:45 - Alert triggered by Sentry (ERROR: Too late!)
12:00 - Incident detected and response started
```

**Root Causes**:
1. Rate limiting was per-IP (should be per-API-key or per-user)
2. Error tracking was too slow to detect
3. SQL injection vulnerability in search parameter

**Fixes**:
1. Implement rate limiting per-API-key and per-user
2. Create alert for > 100 API errors in 5 minutes
3. Code review all search/filter endpoints for SQL injection

---

## Phase 6: NOTIFICATION & COMMUNICATION

### 6.1 Internal Notification (Immediate)

**War Room Update**: Every 15 minutes
```
Current Status: INVESTIGATING
Severity: CRITICAL
Potential Impact: [PII exposure for X users]
Actions Taken: [Revoked API keys, isolated systems]
ETA to Containment: [30 minutes]
```

### 6.2 Customer Notification (Within 1 Hour if Data Breach)

**Subject**: "Security Alert: Action Required"

```
We have detected suspicious activity on our systems that may have exposed 
your personal information.

What We Know:
- On [DATE] at [TIME], unauthorized access was detected
- The following information may have been accessed: [SPECIFIC FIELDS]
- Your account: [ACCOUNT_ID]
- Other affected accounts: [COUNT]

What We're Doing:
- Immediate investigation underway
- Incident response team fully mobilized
- Systems have been isolated to prevent further access
- Law enforcement notified

What You Should Do:
1. Change your password immediately
2. Monitor your accounts for unauthorized activity
3. Consider credit monitoring (we'll cover the cost)
4. Contact us with questions: [SUPPORT EMAIL]

Sincerity & Transparency:
This was our mistake and we take full responsibility. We have notified
law enforcement and are cooperating fully.
```

### 6.3 Regulatory Notification (Within 72 hours for GDPR, 60 days for HIPAA)

**Contact**: Legal team to file required notices

---

## Phase 7: RECOVERY & REMEDIATION

### 7.1 System Recovery Steps

- [ ] Patch vulnerability that was exploited
- [ ] Deploy patched version to staging + test
- [ ] Deploy to production during low-traffic window
- [ ] Verify monitoring shows incident is resolved
- [ ] Run full security scan to ensure no other backdoors

### 7.2 Access & Credential Changes

- [ ] All potentially exposed API keys rotated
- [ ] All user passwords reset
- [ ] All sessions invalidated (force re-login)  
- [ ] New encryption keys generated
- [ ] Audit permissions for any elevated access granted

### 7.3 Process Improvements

- [ ] Implement missing monitoring (if this slipped through)
- [ ] Implement missing validation (if this was exploited)
- [ ] Schedule security training for team
- [ ] Update incident response playbooks based on learnings

---

## Phase 8: POST-INCIDENT REVIEW (1 Week Later)

### 8.1 Full Timeline

From first log entry to last:
```
10:00 UTC - Reconnaissance began
10:40 UTC - Data access began
11:45 UTC - Alert triggered
12:00 UTC - Incident detected
12:15 UTC - Response team mobilized
12:45 UTC - Systems isolated
13:30 UTC - Root cause identified
14:00 UTC - Patch deployed
14:30 UTC - Verification complete
```

**Total exposure: 50 minutes** (11:45 detection → 10:40 access start)

### 8.2 What Went Well

- [ ] Response team mobilized quickly
- [ ] Communications were clear
- [ ] Evidence was preserved
- [ ] Root cause was identified

### 8.3 What Could Be Better

- [ ] Detection took X minutes (target: <5 min)
- [ ] Rate limiting should have blocked sooner
- [ ] Security testing should have found vulnerability
- [ ] Need monitoring for [missing metric]

### 8.4 Action Items for Next Sprint

```
P0 (Blocker):
- [ ] Deploy patch for SQL injection in search endpoint
- [ ] Implement per-user rate limiting layer
- [ ] Add alert for > 100 errors in 5 minutes

P1 (High):
- [ ] Security code review of all input validation
- [ ] Performance test SQL injection fix
- [ ] Update incident response runbook

P2 (Medium):
- [ ] Security training for team
- [ ] Document vulnerability in knowledge base
- [ ] Schedule quarterly security reviews
```

---

## Emergency Contact Sheet

```
PRIMARY INCIDENT COMMANDER:
Name: Bryan Crockett
Title: CTO
Phone: [EMERGENCY NUMBER]
Email: bryan.crockett@westcat.ca

SECONDARY (If primary unavailable):
Name: [DevOps Lead]
Phone: [PHONE]

LEGAL COUNSEL:
Company: [Law firm]
Contact: [Email/Phone]
Available: 24/7 for data breach

CEO/BOARD:
[Name]
[Personal phone number]
[When to notify: If > 1000 users affected OR data breach detected]

EXTERNAL PARTNERS:
AWS Support: [Account manager]
Database Vendor: [Support contact]
Sentry/Monitoring: [Support portal]
```

---

## Checklist: POST-INCIDENT COMPLETION

- [ ] All evidence preserved and documented
- [ ] Root cause identified and documented
- [ ] All forensics completed
- [ ] All customer communications sent
- [ ] All regulatory notifications completed
- [ ] All credentials rotated
- [ ] All patches deployed
- [ ] All systems verified safe
- [ ] Team debrieft completed
- [ ] Action items assigned and tracked
- [ ] Runbook updated with learnings
- [ ] Incident closed in ticketing system

---

## Incident Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|-----------|----------------|------------|
| **CRITICAL (P1)** | Active data breach, RCE, system down | 15 minutes | All hands |
| **HIGH (P2)** | Potential breach, significant vulnerability | 1 hour | On-call team |
| **MEDIUM (P3)** | Security flaw, no active exploitation | 8 hours | Assigned engineer |
| **LOW (P4)** | Best practice, documentation, minor flaw | 5 days | Backlog |

---

**Document Version**: 1.0  
**Last Updated**: February 14, 2026  
**Next Review**: August 14, 2026  
**Owner**: Security Team
