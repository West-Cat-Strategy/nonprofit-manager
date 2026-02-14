# Analytics Export API Reference

Complete API documentation for exporting analytics data to CSV and Excel formats.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Export Formats](#export-formats)
- [Endpoints](#endpoints)
- [Examples](#examples)
- [Error Handling](#error-handling)

---

## Overview

The Export API allows users to download analytics data in CSV or Excel format. All exports are generated on-demand and automatically deleted after download.

**Features:**
- Export to CSV or Excel (.xlsx)
- Multiple data types: donations, volunteers, events, analytics summary
- Comprehensive reports with multiple sheets (Excel only)
- Automatic file cleanup after download
- Filter data by date ranges and other criteria

---

## Authentication

All endpoints require authentication and analytics permissions:

```
Authorization: Bearer <your_jwt_token>
```

**Required Permissions:**
- User must have analytics view permissions (role: admin, manager, or staff)

---

## Export Formats

### CSV Format

- Single sheet only
- Compatible with Excel, Google Sheets, and text editors
- Smaller file size
- Good for simple data exports

### Excel Format

- Multiple sheets supported
- Better for comprehensive reports
- Preserves formatting and column widths
- Native Excel file (.xlsx)

---

## Endpoints

### Export Analytics Summary

Export overall analytics metrics.

```
POST /api/export/analytics-summary
```

**Request Body:**

```json
{
  "format": "excel",
  "filename": "analytics-summary-2024",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "donor_type": "individual",
  "payment_method": "credit_card"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | No | Export format: `csv` or `excel` (default: `csv`) |
| `filename` | string | No | Custom filename (without extension) |
| `start_date` | string (ISO 8601) | No | Filter start date |
| `end_date` | string (ISO 8601) | No | Filter end date |
| `donor_type` | string | No | Filter by donor type |
| `payment_method` | string | No | Filter by payment method |

**Response:**

Downloads a file with metrics including:
- Total donations (count and amount)
- Average donation
- Total donors (active and inactive)
- Volunteer metrics (count and hours)
- Event metrics (count and attendees)

---

### Export Donations

Export detailed donation records.

```
POST /api/export/donations
```

**Request Body:**

```json
{
  "format": "csv",
  "filename": "donations-q1-2024",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-03-31T23:59:59Z",
  "donor_id": "uuid",
  "payment_method": "credit_card",
  "min_amount": 50,
  "max_amount": 10000
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | No | Export format (default: `csv`) |
| `filename` | string | No | Custom filename |
| `start_date` | string | No | Filter start date |
| `end_date` | string | No | Filter end date |
| `donor_id` | string (UUID) | No | Filter by specific donor |
| `payment_method` | string | No | Filter by payment method |
| `min_amount` | number | No | Minimum donation amount |
| `max_amount` | number | No | Maximum donation amount |

**Response:**

Downloads a file with columns:
- Date
- Donor Name
- Amount (USD)
- Payment Method
- Campaign
- Notes

---

### Export Volunteer Hours

Export volunteer hours logs.

```
POST /api/export/volunteer-hours
```

**Request Body:**

```json
{
  "format": "excel",
  "filename": "volunteer-hours-2024",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "volunteer_id": "uuid",
  "activity_type": "food_bank"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | No | Export format |
| `filename` | string | No | Custom filename |
| `start_date` | string | No | Filter start date |
| `end_date` | string | No | Filter end date |
| `volunteer_id` | string (UUID) | No | Filter by specific volunteer |
| `activity_type` | string | No | Filter by activity type |

**Response:**

Downloads a file with columns:
- Date
- Volunteer Name
- Hours
- Activity Type
- Description

---

### Export Events

Export event attendance data.

```
POST /api/export/events
```

**Request Body:**

```json
{
  "format": "excel",
  "filename": "events-2024",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "event_type": "fundraiser",
  "status": "completed"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | No | Export format |
| `filename` | string | No | Custom filename |
| `start_date` | string | No | Filter start date |
| `end_date` | string | No | Filter end date |
| `event_type` | string | No | Filter by event type |
| `status` | string | No | Filter by event status |

**Response:**

Downloads a file with columns:
- Event Name
- Date
- Event Type
- Registered Count
- Attended Count
- Attendance Rate (%)

---

### Export Comprehensive Report

Export a comprehensive report with multiple data types.

```
POST /api/export/comprehensive
```

**Request Body:**

```json
{
  "format": "excel",
  "filename": "comprehensive-report-2024",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | No | Export format (`excel` recommended for multi-sheet) |
| `filename` | string | No | Custom filename |
| `start_date` | string | Yes | Start date for data |
| `end_date` | string | Yes | End date for data |

**Response:**

Downloads an Excel file with multiple sheets:
1. **Summary** - Overall analytics metrics
2. **Donations** - Up to 1,000 most recent donations
3. **Volunteer Hours** - Up to 1,000 most recent volunteer logs
4. **Events** - Event attendance data

**Note:** CSV format only exports the Summary sheet.

---

## Examples

### Export Donations for Q1 2024 (CSV)

```bash
curl -X POST http://localhost:3000/api/export/donations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filename": "q1-2024-donations",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-03-31T23:59:59Z"
  }' \
  --output q1-2024-donations.csv
```

### Export Volunteer Hours by Activity (Excel)

```bash
curl -X POST http://localhost:3000/api/export/volunteer-hours \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "filename": "food-bank-hours",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "activity_type": "food_bank"
  }' \
  --output food-bank-hours.xlsx
```

### Export Comprehensive Report (Excel)

```bash
curl -X POST http://localhost:3000/api/export/comprehensive \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "filename": "annual-report-2024",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z"
  }' \
  --output annual-report-2024.xlsx
```

### Export with Filters

```bash
# Export large donations only
curl -X POST http://localhost:3000/api/export/donations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "filename": "major-gifts-2024",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "min_amount": 1000
  }' \
  --output major-gifts-2024.xlsx
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status Code | Meaning | Solution |
|-------------|---------|----------|
| `400 Bad Request` | Invalid parameters or missing required fields | Check request body parameters |
| `401 Unauthorized` | Missing or invalid token | Include valid JWT token |
| `403 Forbidden` | Insufficient permissions | User needs analytics view permissions |
| `500 Internal Server Error` | Server-side error during export | Check server logs, try again |

### Example Error Responses

**Invalid Format:**
```json
{
  "error": "Invalid format"
}
```

**Missing Required Fields:**
```json
{
  "error": "Start date is required"
}
```

**Permission Denied:**
```json
{
  "error": "Insufficient permissions to access analytics"
}
```

---

## Best Practices

### File Naming

Use descriptive filenames with dates:
- `donations-q1-2024`
- `volunteer-hours-jan-2024`
- `annual-report-2024`

### Date Ranges

Always specify date ranges to limit data size:
```json
{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z"
}
```

### Format Selection

- Use **CSV** for simple, single-table exports
- Use **Excel** for comprehensive reports with multiple sheets
- Use **Excel** when preserving formatting matters

### Large Exports

For large datasets:
1. Use date range filters to limit data
2. Export in smaller batches (monthly/quarterly)
3. Use CSV for faster processing
4. Consider using the comprehensive export endpoint for multiple data types

### Automation

Exports can be automated using cron jobs or scheduled tasks:

```bash
#!/bin/bash
# Monthly donation export script

TOKEN="your-jwt-token"
MONTH=$(date -d "last month" +%Y-%m)

curl -X POST http://localhost:3000/api/export/donations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"format\": \"excel\",
    \"filename\": \"donations-$MONTH\",
    \"start_date\": \"$MONTH-01T00:00:00Z\",
    \"end_date\": \"$(date -d "$MONTH-01 +1 month -1 day" +%Y-%m-%d)T23:59:59Z\"
  }" \
  --output "donations-$MONTH.xlsx"
```

---

## File Cleanup

Exported files are automatically deleted 5 seconds after download. Files older than 1 hour are also periodically cleaned up.

**Note:** Download files immediately after export. The file URLs are not persistent.

---

## Rate Limiting

Export endpoints are subject to the same rate limits as other API endpoints:
- **General API**: 100 requests per 15 minutes per IP

For bulk exports, contact your administrator about rate limit increases.

---

## Additional Resources

- [Main API Reference](./API_REFERENCE.md)
- [Analytics API Reference](./API_REFERENCE_ANALYTICS.md)
- [Dashboard & Alerts API](./API_REFERENCE_DASHBOARD_ALERTS.md)

---

## Summary

**Available Exports:**
- ✅ Analytics summary
- ✅ Donation records
- ✅ Volunteer hours
- ✅ Event attendance
- ✅ Comprehensive multi-sheet reports

**Formats:**
- ✅ CSV (Comma-Separated Values)
- ✅ Excel (.xlsx)

**Features:**
- ✅ Flexible date range filtering
- ✅ Custom filenames
- ✅ Automatic file cleanup
- ✅ Permission-based access control
- ✅ Multiple data types in single export
