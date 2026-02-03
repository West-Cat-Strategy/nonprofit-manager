# Data Backup API Reference

Admin-only API documentation for exporting a full data backup.

## Overview

The Backup API generates an on-demand export of all tables in the `public` schema as a single **gzipped JSON** file.

By default, known secret fields are **redacted** (set to `null`) unless you explicitly request a full export.

## Authentication & Authorization

All endpoints require:

- `Authorization: Bearer <jwt>`
- User role: `admin`

## Endpoint

### Export Backup

```
POST /api/backup/export
```

**Request Body (JSON):**

```json
{
  "filename": "my-backup-20260203",
  "include_secrets": false,
  "compress": true
}
```

| Field | Type | Required | Default | Notes |
|------|------|----------|---------|------|
| `filename` | string | No | auto | Base filename (extension is added automatically) |
| `include_secrets` | boolean | No | `false` | When `false`, secret fields are redacted |
| `compress` | boolean | No | `true` | When `true`, output is `.json.gz` |

**Response:**

- `200 OK` with a downloadable file (`.json.gz` by default)

**Redacted fields (when `include_secrets=false`):**

- `users.password_hash`
- `users.mfa_totp_secret_enc`
- `users.mfa_totp_pending_secret_enc`
- `portal_users.password_hash`
- `portal_admins.password_hash`
- `user_invitations.token`
- `portal_invitations.token`

## Notes

- This export is intended for portability and convenience. For disaster recovery, you should still use database-native backups (e.g. `pg_dump`) as described in `docs/DEPLOYMENT.md`.

