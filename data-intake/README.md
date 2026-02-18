# Nonprofit Manager Data Intake Service

Standalone ingestion preview service for CSV, TSV, Excel, JSON, and XML that suggests schema mappings and normalization actions against a versioned schema bundle.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

## Endpoints

- `GET /v1/health`
- `POST /v1/schema/validate`
- `POST /v1/preview` (multipart upload)
- `POST /v1/preview-text` (text payload)

## Auth

Set `API_KEY` and send `x-api-key` header for `/v1/*` endpoints except `/v1/health`.
