# Dashboard & Alerts API Reference

Complete API documentation for customizable dashboards and analytics alert configuration.

## Table of Contents

- [Dashboard API](#dashboard-api)
- [Alerts API](#alerts-api)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Dashboard API

Manage customizable dashboard configurations with drag-and-drop widget layouts.

### List User Dashboards

Get all dashboard configurations for the authenticated user.

```
GET /api/dashboard/configs
```

**Response**: `200 OK`

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Default Dashboard",
    "is_default": true,
    "widgets": [
      {
        "id": "widget-donation-summary",
        "type": "donation_summary",
        "title": "Donation Summary",
        "enabled": true,
        "layout": {
          "i": "widget-donation-summary",
          "x": 0,
          "y": 0,
          "w": 4,
          "h": 2
        }
      }
    ],
    "layout": [...],
    "breakpoints": { "lg": 1200, "md": 996, "sm": 768, "xs": 480 },
    "cols": { "lg": 12, "md": 10, "sm": 6, "xs": 4 },
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Get Default Dashboard

Get the user's default dashboard, or create one if it doesn't exist.

```
GET /api/dashboard/configs/default
```

**Response**: `200 OK` (same format as above)

**Note**: This endpoint automatically creates a default dashboard for new users.

---

### Get Specific Dashboard

Get a single dashboard configuration by ID.

```
GET /api/dashboard/configs/:id
```

**Parameters**:
- `id` (path, UUID) - Dashboard ID

**Response**: `200 OK`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Custom Dashboard",
  "is_default": false,
  ...
}
```

**Errors**:
- `404 Not Found` - Dashboard not found or doesn't belong to user

---

### Create Dashboard

Create a new dashboard configuration.

```
POST /api/dashboard/configs
```

**Request Body**:

```json
{
  "name": "My Custom Dashboard",
  "is_default": false,
  "widgets": [
    {
      "id": "widget-1",
      "type": "donation_summary",
      "title": "Donations",
      "enabled": true,
      "layout": {
        "i": "widget-1",
        "x": 0,
        "y": 0,
        "w": 4,
        "h": 2
      }
    }
  ],
  "layout": [
    { "i": "widget-1", "x": 0, "y": 0, "w": 4, "h": 2 }
  ],
  "breakpoints": { "lg": 1200, "md": 996, "sm": 768, "xs": 480 },
  "cols": { "lg": 12, "md": 10, "sm": 6, "xs": 4 }
}
```

**Required Fields**:
- `name` (string) - Dashboard name
- `widgets` (array) - Array of widget configurations
- `layout` (array) - Array of widget layouts

**Optional Fields**:
- `is_default` (boolean) - Set as default dashboard (default: false)
- `breakpoints` (object) - Responsive breakpoints
- `cols` (object) - Column counts for each breakpoint

**Response**: `201 Created`

**Note**: If `is_default` is true, any existing default dashboard will be unmarked.

---

### Update Dashboard

Update an existing dashboard configuration.

```
PUT /api/dashboard/configs/:id
```

**Parameters**:
- `id` (path, UUID) - Dashboard ID

**Request Body**: Same as Create (all fields optional)

```json
{
  "name": "Updated Dashboard Name",
  "widgets": [...],
  "layout": [...]
}
```

**Response**: `200 OK`

**Errors**:
- `404 Not Found` - Dashboard not found

---

### Update Dashboard Layout

Quick update for just the layout (useful during drag-and-drop).

```
PUT /api/dashboard/configs/:id/layout
```

**Parameters**:
- `id` (path, UUID) - Dashboard ID

**Request Body**:

```json
{
  "layout": [
    { "i": "widget-1", "x": 0, "y": 0, "w": 6, "h": 3 },
    { "i": "widget-2", "x": 6, "y": 0, "w": 6, "h": 3 }
  ]
}
```

**Response**: `200 OK`

---

### Delete Dashboard

Delete a dashboard configuration.

```
DELETE /api/dashboard/configs/:id
```

**Parameters**:
- `id` (path, UUID) - Dashboard ID

**Response**: `204 No Content`

**Errors**:
- `400 Bad Request` - Cannot delete default dashboard
- `404 Not Found` - Dashboard not found

**Note**: You cannot delete the default dashboard. Set another dashboard as default first.

---

## Alerts API

Configure and manage analytics alerts for monitoring key metrics.

### List Alert Configurations

Get all alert configurations for the authenticated user.

```
GET /api/alerts/configs
```

**Response**: `200 OK`

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Low Donation Alert",
    "description": "Alert when daily donations drop below threshold",
    "metric_type": "donations",
    "condition": "drops_below",
    "threshold": 10,
    "frequency": "daily",
    "channels": ["email", "in_app"],
    "severity": "high",
    "enabled": true,
    "recipients": ["admin@example.com"],
    "filters": {},
    "created_by": "uuid",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "last_triggered": "2024-01-20T08:00:00Z"
  }
]
```

---

### Get Alert Configuration

Get a specific alert configuration.

```
GET /api/alerts/configs/:id
```

**Parameters**:
- `id` (path, UUID) - Alert configuration ID

**Response**: `200 OK`

**Errors**:
- `404 Not Found` - Alert not found

---

### Create Alert Configuration

Create a new alert configuration.

```
POST /api/alerts/configs
```

**Request Body**:

```json
{
  "name": "High Volunteer Hours Alert",
  "description": "Alert when volunteer hours exceed weekly target",
  "metric_type": "volunteer_hours",
  "condition": "exceeds",
  "threshold": 200,
  "frequency": "weekly",
  "channels": ["email", "slack"],
  "severity": "low",
  "enabled": true,
  "recipients": ["manager@example.com"],
  "filters": {}
}
```

**Required Fields**:
- `name` (string) - Alert name
- `metric_type` (enum) - Type of metric to monitor
  - `donations` | `donation_amount` | `volunteer_hours` | `event_attendance` | `case_volume` | `engagement_score`
- `condition` (enum) - Trigger condition
  - `exceeds` | `drops_below` | `changes_by` | `anomaly_detected` | `trend_reversal`
- `frequency` (enum) - Check frequency
  - `real_time` | `daily` | `weekly` | `monthly`
- `channels` (array) - Notification channels
  - `email` | `in_app` | `slack` | `webhook`
- `severity` (enum) - Alert severity
  - `low` | `medium` | `high` | `critical`

**Conditional Fields**:
- `threshold` (number) - Required for `exceeds` and `drops_below` conditions
- `percentage_change` (number) - Required for `changes_by` condition
- `sensitivity` (number, 1.0-4.0) - Optional for `anomaly_detected` (default: 2.0)

**Optional Fields**:
- `description` (string) - Alert description
- `enabled` (boolean) - Enable immediately (default: true)
- `recipients` (array) - Email addresses or user IDs
- `filters` (object) - Additional metric filters

**Response**: `201 Created`

**Validation Errors**:
- `400 Bad Request` - Invalid metric type, condition, or missing required fields

---

### Update Alert Configuration

Update an existing alert configuration.

```
PUT /api/alerts/configs/:id
```

**Parameters**:
- `id` (path, UUID) - Alert configuration ID

**Request Body**: Same as Create (all fields optional)

**Response**: `200 OK`

---

### Delete Alert Configuration

Delete an alert configuration.

```
DELETE /api/alerts/configs/:id
```

**Parameters**:
- `id` (path, UUID) - Alert configuration ID

**Response**: `204 No Content`

---

### Toggle Alert

Toggle an alert's enabled status.

```
PATCH /api/alerts/configs/:id/toggle
```

**Parameters**:
- `id` (path, UUID) - Alert configuration ID

**Response**: `200 OK`

Returns the updated alert configuration with toggled `enabled` field.

---

### Test Alert Configuration

Test an alert configuration without saving it.

```
POST /api/alerts/test
```

**Request Body**: Same as Create Alert

**Response**: `200 OK`

```json
{
  "would_trigger": true,
  "current_value": 75,
  "threshold_value": 50,
  "message": "Current value 75 exceeds threshold 50",
  "details": {
    "metric_type": "donations",
    "condition": "exceeds"
  }
}
```

**Use Case**: Test alert conditions before saving to ensure they work as expected.

---

### Get Alert Instances

Get triggered alert instances (historical alerts).

```
GET /api/alerts/instances?status=triggered&severity=high&limit=50
```

**Query Parameters**:
- `status` (optional, string) - Filter by status: `triggered` | `resolved`
- `severity` (optional, string) - Filter by severity: `low` | `medium` | `high` | `critical`
- `limit` (optional, number, 1-100) - Limit results (default: 100)

**Response**: `200 OK`

```json
[
  {
    "id": "uuid",
    "alert_config_id": "uuid",
    "alert_name": "Low Donations Alert",
    "metric_type": "donations",
    "condition": "drops_below",
    "severity": "high",
    "status": "triggered",
    "triggered_at": "2024-01-20T08:00:00Z",
    "resolved_at": null,
    "current_value": 5,
    "threshold_value": 10,
    "message": "Daily donations dropped below threshold",
    "details": {},
    "acknowledged_by": null,
    "acknowledged_at": null
  }
]
```

---

### Acknowledge Alert Instance

Mark an alert instance as acknowledged.

```
PATCH /api/alerts/instances/:id/acknowledge
```

**Parameters**:
- `id` (path, UUID) - Alert instance ID

**Response**: `200 OK`

Sets `acknowledged_by` and `acknowledged_at` fields.

---

### Resolve Alert Instance

Mark an alert instance as resolved.

```
PATCH /api/alerts/instances/:id/resolve
```

**Parameters**:
- `id` (path, UUID) - Alert instance ID

**Response**: `200 OK`

Sets `status` to `resolved` and `resolved_at` timestamp.

---

### Get Alert Statistics

Get comprehensive alert statistics for the current user.

```
GET /api/alerts/stats
```

**Response**: `200 OK`

```json
{
  "total_alerts": 15,
  "active_alerts": 12,
  "triggered_today": 3,
  "triggered_this_week": 18,
  "triggered_this_month": 47,
  "by_severity": {
    "low": 5,
    "medium": 20,
    "high": 18,
    "critical": 4
  },
  "by_metric": {
    "donations": 15,
    "volunteer_hours": 12,
    "event_attendance": 8,
    "case_volume": 7,
    "donation_amount": 5
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful deletion
- `400 Bad Request` - Invalid request data or validation error
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Examples

### Complete Dashboard Workflow

```bash
# 1. Get user's dashboards
curl -X GET localhost:3000/api/dashboard/configs \
  -H "Authorization: Bearer $TOKEN"

# 2. Create custom dashboard
curl -X POST localhost:3000/api/dashboard/configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Executive Dashboard",
    "is_default": false,
    "widgets": [{
      "id": "widget-1",
      "type": "donation_summary",
      "title": "Donations",
      "enabled": true,
      "layout": {"i": "widget-1", "x": 0, "y": 0, "w": 6, "h": 2}
    }],
    "layout": [{"i": "widget-1", "x": 0, "y": 0, "w": 6, "h": 2}]
  }'

# 3. Update layout after drag-and-drop
curl -X PUT localhost:3000/api/dashboard/configs/$DASHBOARD_ID/layout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "layout": [{"i": "widget-1", "x": 6, "y": 0, "w": 6, "h": 2}]
  }'
```

### Complete Alert Workflow

```bash
# 1. Test alert configuration
curl -X POST localhost:3000/api/alerts/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Alert",
    "metric_type": "donations",
    "condition": "drops_below",
    "threshold": 10,
    "frequency": "daily",
    "channels": ["email"],
    "severity": "high",
    "enabled": true
  }'

# 2. Create alert if test passes
curl -X POST localhost:3000/api/alerts/configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... same body as test ... }'

# 3. Get alert statistics
curl -X GET localhost:3000/api/alerts/stats \
  -H "Authorization: Bearer $TOKEN"

# 4. Get triggered alerts
curl -X GET "localhost:3000/api/alerts/instances?status=triggered&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 5. Acknowledge an alert
curl -X PATCH localhost:3000/api/alerts/instances/$INSTANCE_ID/acknowledge \
  -H "Authorization: Bearer $TOKEN"
```

---

## Widget Types Reference

### Available Widget Types

1. **donation_summary** - Donation metrics overview
2. **recent_donations** - List of recent donations
3. **donation_trends** - Donation trends chart
4. **volunteer_hours** - Volunteer hours summary
5. **event_attendance** - Event attendance metrics
6. **recent_contacts** - Recently added contacts
7. **case_summary** - Case management overview
8. **upcoming_events** - Calendar of upcoming events
9. **quick_actions** - Shortcuts to common tasks
10. **activity_feed** - Recent activity across organization

### Widget Layout Properties

- `i` (string) - Unique widget identifier
- `x` (number) - X position in grid (0-11 for 12-column grid)
- `y` (number) - Y position in grid
- `w` (number) - Width in grid units
- `h` (number) - Height in grid units
- `minW`, `minH` - Minimum dimensions
- `maxW`, `maxH` - Maximum dimensions
- `static` (boolean) - If true, widget cannot be moved/resized

---

## Rate Limiting

All API endpoints are subject to rate limiting:
- **General API**: 100 requests per 15 minutes per IP
- **Test endpoint**: 20 requests per 15 minutes (to prevent abuse)

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Postman Collection

Import the complete Postman collection from:
`docs/postman/Nonprofit-Manager-API.postman_collection.json`

The collection includes all dashboard and alerts endpoints with example requests.
