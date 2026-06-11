import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  buildAuthAliasTelemetryReview,
  readLogRecords,
  renderMarkdownReview,
} from "../auth-alias-telemetry-review.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");

const trackedResponse = (timestamp, method, route) => ({
  timestamp,
  message: "Outgoing response",
  method,
  path: route,
  statusCode: 200,
  requestId: `request-${timestamp}-${route}`,
});

const aliasEvent = (timestamp, route, aliasFields, overrides = {}) => ({
  timestamp,
  message: "auth.alias_input_used",
  event: "auth.alias_input_used",
  route,
  aliasFields,
  correlationId: "corr-1",
  userAgent: "FixtureClient/1.0",
  ...overrides,
});

const allRouteResponsesForDay = (day) => [
  trackedResponse(`${day}T08:00:00.000Z`, "POST", "/api/v2/auth/register"),
  trackedResponse(`${day}T08:05:00.000Z`, "POST", "/api/v2/auth/setup"),
  trackedResponse(`${day}T08:10:00.000Z`, "PUT", "/api/v2/auth/password"),
];

const writeTempFile = (records) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-alias-review-"));
  const file = path.join(dir, "logs.ndjson");
  fs.writeFileSync(
    file,
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    "utf8",
  );
  return file;
};

test("builds clean route rows when every tracked route has traffic and no alias usage", () => {
  const records = [
    ...allRouteResponsesForDay("2026-06-01"),
    ...allRouteResponsesForDay("2026-06-02"),
  ];

  const review = buildAuthAliasTelemetryReview(records, {
    start: "2026-06-01",
    end: "2026-06-02",
  });

  assert.deepEqual(
    review.routeRows.map((row) => [
      row.route,
      row.aliasRequests,
      row.totalRequests,
      row.status,
    ]),
    [
      ["POST /api/v2/auth/register", 0, 2, "clean"],
      ["POST /api/v2/auth/setup", 0, 2, "clean"],
      ["PUT /api/v2/auth/password", 0, 2, "clean"],
    ],
  );
});

test("marks a route inconclusive when one complete day has no denominator traffic", () => {
  const records = [
    ...allRouteResponsesForDay("2026-06-01"),
    trackedResponse(
      "2026-06-02T08:00:00.000Z",
      "POST",
      "/api/v2/auth/register",
    ),
    trackedResponse("2026-06-02T08:05:00.000Z", "POST", "/api/v2/auth/setup"),
  ];

  const review = buildAuthAliasTelemetryReview(records, {
    start: "2026-06-01",
    end: "2026-06-02",
  });
  const passwordRow = review.routeRows.find(
    (row) => row.route === "PUT /api/v2/auth/password",
  );

  assert.equal(passwordRow.status, "inconclusive");
  assert.deepEqual(passwordRow.missingTrafficDays, ["2026-06-02"]);
});

test("marks non-zero alias usage as blocked and renders the handoff tables", () => {
  const records = [
    ...allRouteResponsesForDay("2026-06-01"),
    aliasEvent(
      "2026-06-01T09:00:00.000Z",
      "/api/v2/auth/register",
      ["first_name"],
      {
        correlationId: "corr-register",
        userAgent: "LegacyClient/2.0",
      },
    ),
  ];

  const review = buildAuthAliasTelemetryReview(records, {
    start: "2026-06-01",
    end: "2026-06-01",
  });
  const markdown = renderMarkdownReview(review);
  const registerRow = review.routeRows.find(
    (row) => row.route === "POST /api/v2/auth/register",
  );

  assert.equal(registerRow.status, "blocked");
  assert.equal(registerRow.aliasRequests, 1);
  assert.match(markdown, /Route Review Table/);
  assert.match(
    markdown,
    /`POST \/api\/v2\/auth\/register`\s*\| June 1, 2026\s*\| 1\s*\| 1\s*\| 100\.0000%\s*\| blocked/,
  );
  assert.match(markdown, /LegacyClient\/2\.0/);
  assert.match(markdown, /Exception Check Template/);
});

test("reads NDJSON and exposes the CLI markdown output", () => {
  const input = writeTempFile(allRouteResponsesForDay("2026-06-01"));
  const records = readLogRecords(input);

  assert.equal(records.length, 3);

  const result = spawnSync(
    process.execPath,
    [
      "scripts/auth-alias-telemetry-review.mjs",
      "--input",
      input,
      "--start",
      "2026-06-01",
      "--end",
      "2026-06-01",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Auth Alias Telemetry Review/);
  assert.match(
    result.stdout,
    /`PUT \/api\/v2\/auth\/password`\s*\| June 1, 2026\s*\| 0\s*\| 1\s*\| 0\.0000%\s*\| clean/,
  );
});
