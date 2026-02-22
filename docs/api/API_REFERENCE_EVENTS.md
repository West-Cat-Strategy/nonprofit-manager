# Events API Reference

Complete API documentation for event scheduling and registration management.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Event Types](#event-types)
- [Status Values](#status-values)
- [Event Endpoints](#event-endpoints)
- [Registration Endpoints](#registration-endpoints)
- [Examples](#examples)
- [Error Handling](#error-handling)

---

## Overview

The Events API provides comprehensive event scheduling and registration management capabilities. It supports event creation, capacity management, attendee registration, check-in tracking, and attendance reporting.

**Features:**
- Event scheduling with start/end dates
- Capacity management with automatic enforcement
- Registration deadlines and requirements
- Attendee check-in tracking
- Event filtering and search
- Attendance statistics and reporting
- Multiple event types and statuses
- Duplicate registration prevention

---

## Authentication

All endpoints require authentication:

```
Authorization: Bearer <your_jwt_token>
```

**Required Permissions:**
- **View events**: All authenticated users
- **Create/Edit events**: Staff, Manager, or Admin role
- **Register for events**: All authenticated users
- **Check-in attendees**: Staff, Manager, or Admin role

---

## Event Types

Events can be categorized into the following types:

| Type | Description |
|------|-------------|
| `fundraiser` | Fundraising events |
| `volunteer_opportunity` | Volunteer recruitment events |
| `community_event` | Community gatherings |
| `training` | Training sessions |
| `meeting` | Organizational meetings |
| `workshop` | Educational workshops |
| `conference` | Conferences |
| `social` | Social gatherings |
| `other` | Other event types |

---

## Status Values

### Event Status

| Status | Description |
|--------|-------------|
| `draft` | Event is being planned (not visible to public) |
| `published` | Event is published and open for registration |
| `cancelled` | Event has been cancelled |
| `completed` | Event has concluded |

### Registration Status

| Status | Description |
|--------|-------------|
| `registered` | Initial registration |
| `confirmed` | Registration confirmed |
| `attended` | Attendee checked in |
| `no_show` | Attendee did not show up |
| `cancelled` | Registration cancelled |

---

## Event Endpoints

### List Events

Retrieve all events with optional filtering.

```
GET /api/events
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search in event name and description |
| `event_type` | string | Filter by event type |
| `status` | string | Filter by event status |
| `start_date` | string (ISO 8601) | Filter events starting after this date |
| `end_date` | string (ISO 8601) | Filter events starting before this date |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |

**Example Request:**

```bash
curl localhost:3000/api/events?event_type=fundraiser&status=published \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "events": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Annual Gala",
      "description": "Our annual fundraising gala",
      "event_type": "fundraiser",
      "start_date": "2024-06-15T18:00:00Z",
      "end_date": "2024-06-15T23:00:00Z",
      "location": "Grand Ballroom",
      "capacity": 200,
      "registration_required": true,
      "registration_deadline": "2024-06-14T23:59:59Z",
      "status": "published",
      "organizer_id": "organizer_uuid",
      "created_by": "user_uuid",
      "created_at": "2024-05-01T10:00:00Z",
      "updated_at": "2024-05-01T10:00:00Z",
      "registered_count": 45,
      "is_full": false
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

---

### Get Event by ID

Retrieve details for a specific event.

```
GET /api/events/:id
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Annual Gala",
  "description": "Our annual fundraising gala",
  "event_type": "fundraiser",
  "start_date": "2024-06-15T18:00:00Z",
  "end_date": "2024-06-15T23:00:00Z",
  "location": "Grand Ballroom",
  "capacity": 200,
  "registration_required": true,
  "registration_deadline": "2024-06-14T23:59:59Z",
  "status": "published",
  "organizer_id": "organizer_uuid",
  "created_by": "user_uuid",
  "created_at": "2024-05-01T10:00:00Z",
  "updated_at": "2024-05-01T10:00:00Z",
  "registered_count": 45,
  "is_full": false
}
```

---

### Create Event

Create a new event.

```
POST /api/events
```

**Request Body:**

```json
{
  "name": "Annual Gala",
  "description": "Our annual fundraising gala",
  "event_type": "fundraiser",
  "start_date": "2024-06-15T18:00:00Z",
  "end_date": "2024-06-15T23:00:00Z",
  "location": "Grand Ballroom",
  "capacity": 200,
  "registration_required": true,
  "registration_deadline": "2024-06-14T23:59:59Z",
  "status": "published"
}
```

**Required Fields:**
- `name` (string): Event name
- `event_type` (string): Must be one of the valid event types
- `start_date` (string, ISO 8601): Event start date/time

**Optional Fields:**
- `description` (string): Event description
- `end_date` (string, ISO 8601): Event end date/time
- `location` (string): Event location
- `capacity` (number): Maximum attendees (null = unlimited)
- `registration_required` (boolean): Whether registration is required (default: false)
- `registration_deadline` (string, ISO 8601): Last date to register
- `status` (string): Event status (default: 'draft')
- `organizer_id` (string, UUID): User ID of the organizer

**Response:** Returns the created event object (201 Created)

---

### Update Event

Update an existing event.

```
PUT /api/events/:id
```

**Request Body:** Same fields as Create Event (all optional)

```json
{
  "name": "Annual Gala - Updated",
  "capacity": 250,
  "status": "published"
}
```

**Response:** Returns the updated event object

---

### Delete Event

Delete an event.

```
DELETE /api/events/:id
```

**Response:** 204 No Content

**Note:** This will also delete all associated registrations due to CASCADE delete.

---

### Get Event Statistics

Retrieve attendance statistics for an event.

```
GET /api/events/:id/stats
```

**Response:**

```json
{
  "event_id": "123e4567-e89b-12d3-a456-426614174000",
  "event_name": "Annual Gala",
  "total_registrations": 45,
  "registered_count": 30,
  "confirmed_count": 10,
  "attended_count": 5,
  "no_show_count": 0,
  "cancelled_count": 0,
  "capacity": 200,
  "spaces_remaining": 155,
  "attendance_rate": 11.11,
  "is_full": false
}
```

---

## Registration Endpoints

### List Event Registrations

Get all registrations for an event.

```
GET /api/events/:id/registrations
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by registration status |
| `search` | string | Search attendee name or email |

**Response:**

```json
{
  "registrations": [
    {
      "id": "reg_uuid",
      "event_id": "event_uuid",
      "contact_id": "contact_uuid",
      "attendee_name": "John Doe",
      "attendee_email": "john@example.com",
      "attendee_phone": "555-0100",
      "status": "confirmed",
      "registration_date": "2024-05-15T10:00:00Z",
      "check_in_time": null,
      "checked_in_by": null,
      "notes": null,
      "created_at": "2024-05-15T10:00:00Z",
      "updated_at": "2024-05-15T10:00:00Z"
    }
  ]
}
```

---

### Register for Event

Create a new registration for an event.

```
POST /api/events/:id/register
```

**Request Body:**

```json
{
  "contact_id": "contact_uuid",
  "attendee_name": "John Doe",
  "attendee_email": "john@example.com",
  "attendee_phone": "555-0100",
  "notes": "Dietary restrictions: vegetarian"
}
```

**Required Fields:**
- `attendee_name` (string): Attendee's name
- `attendee_email` (string): Attendee's email

**Optional Fields:**
- `contact_id` (string, UUID): Link to existing contact
- `attendee_phone` (string): Contact phone number
- `notes` (string): Additional notes

**Response:** Returns the created registration (201 Created)

**Validation:**
- Checks if event is at full capacity
- Validates registration deadline hasn't passed
- Prevents duplicate registrations for the same contact
- Automatically sets status to 'registered'

---

### Update Registration

Update a registration's details or status.

```
PUT /api/events/:eventId/registrations/:registrationId
```

**Request Body:**

```json
{
  "status": "confirmed",
  "notes": "Updated dietary restrictions"
}
```

**Response:** Returns the updated registration

---

### Check-in Attendee

Mark an attendee as checked in.

```
POST /api/events/:eventId/registrations/:registrationId/checkin
```

**Request Body:** Empty object `{}`

**Response:**

```json
{
  "id": "reg_uuid",
  "status": "attended",
  "check_in_time": "2024-06-15T18:05:00Z",
  "checked_in_by": "user_uuid",
  ...
}
```

**Note:** Automatically sets status to 'attended' and records check-in timestamp and user.

---

### Delete Registration

Cancel/delete a registration.

```
DELETE /api/events/:eventId/registrations/:registrationId
```

**Response:** 204 No Content

**Note:** This frees up capacity for new registrations.

---

## Examples

### Create Event with Registration

```bash
# 1. Create event
curl -X POST localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Volunteer Orientation",
    "event_type": "training",
    "start_date": "2024-07-01T10:00:00Z",
    "end_date": "2024-07-01T12:00:00Z",
    "location": "Main Office",
    "capacity": 20,
    "registration_required": true,
    "status": "published"
  }'

# Save the event_id from response

# 2. Register attendee
curl -X POST localhost:3000/api/events/{event_id}/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attendee_name": "Jane Smith",
    "attendee_email": "jane@example.com",
    "attendee_phone": "555-0101"
  }'
```

### Search Events

```bash
# Search for fundraiser events
curl "localhost:3000/api/events?search=gala&event_type=fundraiser" \
  -H "Authorization: Bearer $TOKEN"

# Get upcoming published events
curl "localhost:3000/api/events?status=published&start_date=2024-06-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

### Check-in Workflow

```bash
# 1. Get event registrations
curl localhost:3000/api/events/{event_id}/registrations \
  -H "Authorization: Bearer $TOKEN"

# 2. Check in specific attendee
curl -X POST localhost:3000/api/events/{event_id}/registrations/{reg_id}/checkin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# 3. Get updated statistics
curl localhost:3000/api/events/{event_id}/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Capacity Management

```bash
# Check event capacity before registering
curl localhost:3000/api/events/{event_id} \
  -H "Authorization: Bearer $TOKEN"

# Response includes:
# - capacity: 50
# - registered_count: 48
# - is_full: false

# Attempt registration (will succeed if not full)
curl -X POST localhost:3000/api/events/{event_id}/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attendee_name": "Bob Johnson",
    "attendee_email": "bob@example.com"
  }'

# If event is full, returns:
# { "error": "Event is at full capacity" }
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
| `400 Bad Request` | Invalid parameters or business rule violation | Check request body and validation rules |
| `401 Unauthorized` | Missing or invalid token | Include valid JWT token |
| `403 Forbidden` | Insufficient permissions | User needs appropriate role |
| `404 Not Found` | Event or registration not found | Verify IDs exist |
| `500 Internal Server Error` | Server-side error | Check server logs |

### Business Rule Errors

**Event at Full Capacity:**
```json
{
  "error": "Event is at full capacity"
}
```

**Registration Deadline Passed:**
```json
{
  "error": "Registration deadline has passed"
}
```

**Duplicate Registration:**
```json
{
  "error": "Already registered for this event"
}
```

**Invalid Event Type:**
```json
{
  "error": "Invalid event type. Must be one of: fundraiser, volunteer_opportunity, community_event, training, meeting, workshop, conference, social, other"
}
```

---

## Validation Rules

### Event Creation

- `name`: Required, non-empty string (max 255 characters)
- `event_type`: Required, must be valid event type
- `start_date`: Required, valid ISO 8601 date/time
- `end_date`: Optional, must be after start_date if provided
- `capacity`: Optional, must be positive integer if provided
- `status`: Optional, must be valid status value
- `registration_deadline`: Optional, should be before start_date

### Registration

- `attendee_name`: Required, non-empty string (max 255 characters)
- `attendee_email`: Required, valid email format (max 255 characters)
- `attendee_phone`: Optional, string (max 50 characters)
- Event must not be at full capacity
- Registration deadline must not have passed
- Contact cannot already be registered (if contact_id provided)

---

## Best Practices

### Event Management

1. **Set Realistic Capacities**: Always set a capacity to prevent over-registration
2. **Use Registration Deadlines**: Set deadlines at least 24 hours before event start
3. **Publish Events Early**: Give attendees time to register
4. **Monitor Capacity**: Check `is_full` field before promoting events
5. **Update Status**: Mark events as 'completed' after they finish

### Registration Flow

1. **Validate Before Registering**: Check capacity and deadline first
2. **Link to Contacts**: Use `contact_id` to link registrations to existing contacts
3. **Confirm Registrations**: Update status to 'confirmed' after verification
4. **Check-in on Time**: Use check-in feature during event for accurate attendance
5. **Handle No-Shows**: Update status to 'no_show' for better metrics

### Capacity Planning

```bash
# Get current capacity status
curl localhost:3000/api/events/{event_id}/stats \
  -H "Authorization: Bearer $TOKEN"

# If approaching capacity, consider:
# 1. Increasing capacity (if possible)
# 2. Creating a waitlist
# 3. Scheduling additional sessions
```

---

## Rate Limiting

Event endpoints are subject to standard API rate limits:
- **General API**: 100 requests per 15 minutes per IP

For bulk operations, contact your administrator.

---

## Additional Resources

- [Main API Reference](https://github.com/West-Cat-Strategy/nonprofit-manager)
- [Analytics API Reference](https://github.com/West-Cat-Strategy/nonprofit-manager)
- [Export API Reference](./API_REFERENCE_EXPORT.md)

---

## Summary

**Available Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List all events with filters |
| GET | `/api/events/:id` | Get event details |
| POST | `/api/events` | Create new event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/events/:id/stats` | Get event statistics |
| GET | `/api/events/:id/registrations` | List event registrations |
| POST | `/api/events/:id/register` | Register for event |
| PUT | `/api/events/:eventId/registrations/:regId` | Update registration |
| POST | `/api/events/:eventId/registrations/:regId/checkin` | Check-in attendee |
| DELETE | `/api/events/:eventId/registrations/:regId` | Cancel registration |

**Features:**
- ✅ Event CRUD operations
- ✅ Capacity management with enforcement
- ✅ Registration with duplicate prevention
- ✅ Deadline validation
- ✅ Check-in tracking
- ✅ Attendance statistics
- ✅ Event filtering and search
- ✅ Multiple event types and statuses
