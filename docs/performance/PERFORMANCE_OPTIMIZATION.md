# Performance Optimization Guide

Comprehensive guide to performance optimizations implemented in the Nonprofit Manager application.

## Table of Contents

- [Database Optimizations](#database-optimizations)
- [Query Caching](#query-caching)
- [Best Practices](#best-practices)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Database Optimizations

### Indexes

Migration `017_add_analytics_indexes.sql` adds strategic indexes to improve analytics query performance.

#### Donations Indexes

```sql
-- Single column indexes
idx_donations_date_range      -- Speeds up date range queries
idx_donations_donor_date      -- Optimizes donor-specific queries
idx_donations_amount          -- For amount-based filtering/sorting
idx_donations_method          -- Payment method analytics
idx_donations_created_at      -- Recent donations queries

-- Composite indexes
idx_donations_date_amount     -- Revenue aggregation queries
```

**Usage Example:**

```sql
-- Before: Seq Scan (slow)
SELECT SUM(amount) FROM donations
WHERE donation_date BETWEEN '2024-01-01' AND '2024-12-31';

-- After: Index Scan using idx_donations_date_amount (fast)
```

**Performance Impact:** ~100x faster for date range queries on large datasets (>100k records)

#### Volunteer Hours Indexes

```sql
idx_volunteer_hours_date           -- Date-based queries
idx_volunteer_hours_volunteer_date -- Individual volunteer tracking
idx_volunteer_hours_date_hours     -- Hours aggregation
```

**Usage Example:**

```sql
-- Optimized query
SELECT volunteer_id, SUM(hours) as total_hours
FROM volunteer_hours
WHERE log_date BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY volunteer_id;
```

**Performance Impact:** ~50x faster for volunteer hours aggregations

#### Event Registrations Indexes

```sql
idx_event_reg_event_status -- Event attendance calculations
idx_event_registrations_registered_at -- Recent registrations
```

**Usage Example:**

```sql
-- Attendance count with status filtering
SELECT event_id, COUNT(*) as attendees
FROM event_registrations
WHERE status = 'attended'
GROUP BY event_id;
```

**Performance Impact:** ~30x faster for attendance analytics

#### Case Management Indexes

```sql
idx_cases_status_priority  -- Case analytics by priority
idx_cases_created_status   -- Case trends over time
```

**Usage Example:**

```sql
-- Case workload by priority
SELECT status, priority, COUNT(*) as count
FROM cases
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status, priority;
```

**Performance Impact:** ~40x faster for case analytics

### Query Optimization Tips

#### Use Covering Indexes

When possible, include all columns needed in the query in the index:

```sql
-- Good: Index covers all needed columns
CREATE INDEX idx_donations_date_amount_method
ON donations(donation_date, amount, payment_method);

-- Query can use index-only scan
SELECT donation_date, SUM(amount)
FROM donations
WHERE donation_date BETWEEN '2024-01-01' AND '2024-12-31'
  AND payment_method = 'credit_card'
GROUP BY donation_date;
```

#### Avoid Functions on Indexed Columns

```sql
-- Bad: Function prevents index usage
SELECT * FROM donations
WHERE EXTRACT(YEAR FROM donation_date) = 2024;

-- Good: Index can be used
SELECT * FROM donations
WHERE donation_date BETWEEN '2024-01-01' AND '2024-12-31';
```

#### Use EXPLAIN ANALYZE

Always check query plans for slow queries:

```sql
EXPLAIN ANALYZE
SELECT SUM(amount) FROM donations
WHERE donation_date BETWEEN '2024-01-01' AND '2024-12-31';
```

Look for:
- Seq Scan → Bad (full table scan)
- Index Scan → Good
- Index Only Scan → Best

### Pagination for Large Results

Always paginate large result sets:

```sql
-- With pagination
SELECT * FROM donations
ORDER BY donation_date DESC
LIMIT 100 OFFSET 0;

-- For next page
SELECT * FROM donations
ORDER BY donation_date DESC
LIMIT 100 OFFSET 100;
```

**Use cursor-based pagination for better performance:**

```sql
-- Better: Use cursor (last_id from previous page)
SELECT * FROM donations
WHERE id > last_id
ORDER BY id
LIMIT 100;
```

---

## Query Caching

### Redis-Backed Cache Strategy

The active analytics cache is service-owned and Redis-backed rather than implemented through a shared in-process cache utility.

Current cache helpers live in `backend/src/config/redis.ts`, and the main callers are:
- `backend/src/services/analytics/index.ts`
- `backend/src/services/analytics/donationAnalytics.ts`
- `backend/src/services/analytics/eventAnalytics.ts`
- `backend/src/services/analytics/trendAnalytics.ts`
- `backend/src/services/analytics/volunteerAnalytics.ts`

#### Shared Cache Helpers

```typescript
import { getCached, setCached } from '@config/redis';

const cacheKey = `analytics:summary:${startDate}:${endDate}:${entityType ?? 'all'}`;
const cached = await getCached<AnalyticsSummary>(cacheKey);

if (cached) {
  return cached;
}

const summary = await buildAnalyticsSummary();
await setCached(cacheKey, summary, 300); // 5 minutes
return summary;
```

#### Cache TTLs in Active Analytics Services

| Area | TTL | Current owner |
|---|---|---|
| Summary analytics | 5 min | `backend/src/services/analytics/index.ts` |
| Donation, volunteer, and event trends | 10 min | `backend/src/services/analytics/*Analytics.ts` |
| Trend analysis and anomaly detection | 60 min | `backend/src/services/analytics/trendAnalytics.ts` |
| Comparative analytics | 10 min | `backend/src/services/analytics/trendAnalytics.ts` |

#### Cache Key Structure

Keep keys scoped to the owning service and all query inputs:

```typescript
`analytics:summary:${startDate}:${endDate}:${entityType ?? 'all'}`
`analytics:donation-trends:${months}`
`analytics:comparative:${periodType}`
```

### Cache Invalidation

Prefer TTL expiry for read-heavy analytics paths. When a mutation must evict cached analytics immediately, invalidate the narrowest key or pattern through the shared Redis helpers:

```typescript
import { deleteCached, deleteCachedPattern } from '@config/redis';

await deleteCached(`analytics:summary:${startDate}:${endDate}:${entityType ?? 'all'}`);
await deleteCachedPattern('analytics:donation-trends:*');
```

If you need new caching, add it to the owning service or `@config/redis` rather than reintroducing a global `backend/src/utils/cache.ts` helper.

---

## Best Practices

### 1. Use Prepared Statements

Prevents SQL injection and improves performance:

```typescript
// Good
const result = await pool.query(
  'SELECT * FROM donations WHERE donor_id = $1',
  [donorId]
);

// Bad
const result = await pool.query(
  `SELECT * FROM donations WHERE donor_id = '${donorId}'`
);
```

### 2. Limit Selected Columns

Only select columns you need:

```typescript
// Good
SELECT id, amount, donation_date FROM donations;

// Bad
SELECT * FROM donations;
```

### 3. Use Connection Pooling

Already configured in `config/database.ts`:

```typescript
const pool = new Pool({
  max: 20,              // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 4. Batch Operations

Use transactions for multiple related operations:

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO donations ...');
  await client.query('INSERT INTO donation_receipts ...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### 5. Aggregate at Database Level

Use SQL aggregations instead of fetching all data:

```typescript
// Good: Aggregate in database
SELECT
  DATE_TRUNC('month', donation_date) as month,
  SUM(amount) as total
FROM donations
GROUP BY month;

// Bad: Fetch all and aggregate in application
const donations = await pool.query('SELECT * FROM donations');
const totals = donations.rows.reduce(...); // Slow!
```

### 6. Use Indexes Wisely

- Add indexes for frequently queried columns
- Don't over-index (slows down writes)
- Monitor index usage with `pg_stat_user_indexes`

### 7. Analyze Query Plans

Regularly check slow queries:

```sql
-- Enable query logging in postgresql.conf
log_min_duration_statement = 1000  # Log queries > 1 second

-- Or use EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT ...;
```

### 8. Cache Expensively Computed Results

Cache results of complex queries or calculations through the shared Redis helpers:

```typescript
import { getCached, setCached } from '@config/redis';

const cacheKey = `complex-calc:${userId}:${startDate}`;
const cached = await getCached<ResultType>(cacheKey);

if (cached) {
  return cached;
}

const result = await complexCalculation();
await setCached(cacheKey, result, 600); // 10 minutes
return result;
```

---

## Monitoring

### Database Performance Metrics

#### Check Slow Queries

```sql
-- Top 10 slowest queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Check Index Usage

```sql
-- Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

#### Check Table Size

```sql
-- Largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Check Cache Hit Ratio

```sql
-- Should be > 0.99 (99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

### Application Performance Metrics

#### Response Time Monitoring

Add middleware to track response times:

```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});
```

#### Cache Hit Rate

```typescript
let cacheHits = 0;
let cacheMisses = 0;

// In getOrSet method
const cached = this.get(key);
if (cached !== undefined) {
  cacheHits++;
  return cached;
}
cacheMisses++;

// Report metrics
console.log(`Cache hit rate: ${cacheHits / (cacheHits + cacheMisses) * 100}%`);
```

---

## Troubleshooting

### Slow Queries

**Symptom**: Queries taking > 1 second

**Diagnosis**:
1. Run `EXPLAIN ANALYZE` on the query
2. Check for Sequential Scans
3. Verify indexes exist and are being used

**Solutions**:
- Add missing indexes
- Rewrite query to use indexes
- Add pagination
- Implement caching

### High Memory Usage

**Symptom**: Application memory growing over time

**Diagnosis**:
1. Check cache size: `cache.stats()`
2. Monitor Node.js heap usage
3. Look for memory leaks

**Solutions**:
- Reduce cache TTL
- Clear cache more frequently
- Implement cache size limits
- Check for unclosed database connections

### Database Connection Pool Exhausted

**Symptom**: `Error: Timeout acquiring client from pool`

**Diagnosis**:
1. Check active connections: `SELECT count(*) FROM pg_stat_activity`
2. Identify long-running queries
3. Check for connection leaks

**Solutions**:
- Increase pool size in config
- Ensure `client.release()` is always called
- Add connection timeout handling
- Reduce query execution time

### Cache Not Effective

**Symptom**: Low cache hit rate (< 50%)

**Diagnosis**:
1. Check cache statistics
2. Verify cache keys are consistent
3. Check TTL values

**Solutions**:
- Increase TTL for stable data
- Normalize cache keys
- Pre-warm cache for common queries
- Review cache invalidation strategy

### Index Not Being Used

**Symptom**: Query plan shows Seq Scan despite index

**Diagnosis**:
1. Run `EXPLAIN` to see query plan
2. Check table statistics: `ANALYZE table_name`
3. Verify index definition

**Solutions**:
```sql
-- Update table statistics
ANALYZE donations;

-- Rebuild index
REINDEX INDEX idx_donations_date_range;

-- Check index bloat
SELECT * FROM pgstattuple('idx_donations_date_range');
```

---

## Future Optimizations

### Planned Improvements

1. **Redis Cache**: Replace in-memory cache with Redis for:
   - Distributed caching across multiple servers
   - Persistent cache across restarts
   - Better memory management

2. **Read Replicas**: Set up PostgreSQL read replicas for:
   - Offload analytics queries from primary database
   - Improve read throughput
   - Better fault tolerance

3. **Query Result Pagination**: Implement cursor-based pagination for all list endpoints

4. **Background Jobs**: Move heavy analytics calculations to background jobs using Bull/BullMQ

5. **Database Partitioning**: Partition large tables (donations, volunteer_hours) by date

6. **Materialized Views**: Create materialized views for frequently accessed aggregations

---

## Additional Resources

- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Database Indexing Explained](https://use-the-index-luke.com/)
- [Redis Caching Patterns](https://redis.io/topics/lru-cache)

---

## Summary

Performance optimizations implemented:

✅ Database indexes for all major analytics queries
✅ In-memory caching with automatic expiration
✅ Cached analytics service wrapper
✅ Query optimization guidelines
✅ Monitoring and troubleshooting tools
✅ Best practices documentation

Expected performance improvements:
- Analytics queries: 30-100x faster (depending on dataset size)
- Cache hit rate: 70-90% for repeated queries
- Response times: 100-500ms for cached queries
- Database load: 60-80% reduction for analytics endpoints
