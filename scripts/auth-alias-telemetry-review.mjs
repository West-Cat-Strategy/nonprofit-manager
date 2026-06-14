#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TRACKED_AUTH_ALIAS_ROUTES = [
  {
    label: "POST /api/v2/auth/register",
    method: "POST",
    route: "/api/v2/auth/register",
    aliasFields: ["first_name", "last_name", "password_confirm"],
  },
  {
    label: "POST /api/v2/auth/setup",
    method: "POST",
    route: "/api/v2/auth/setup",
    aliasFields: [
      "first_name",
      "last_name",
      "password_confirm",
      "organization_name",
    ],
  },
  {
    label: "PUT /api/v2/auth/password",
    method: "PUT",
    route: "/api/v2/auth/password",
    aliasFields: ["current_password", "new_password", "new_password_confirm"],
  },
];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const EXCEPTION_CHECK_ROWS = [
  {
    checkSource: "API owners",
    result: "TBD",
    requiredNote:
      "Record no active exception, or client/owner/expiry/migration plan",
  },
  {
    checkSource: "Support notes",
    result: "TBD",
    requiredNote:
      "Record no active exception, or client/owner/expiry/migration plan",
  },
  {
    checkSource: "Release notes",
    result: "TBD",
    requiredNote:
      "Record no active exception, or client/owner/expiry/migration plan",
  },
  {
    checkSource: "Deployment notes",
    result: "TBD",
    requiredNote:
      "Record no active exception, or client/owner/expiry/migration plan",
  },
  {
    checkSource: "Customer/integrator trackers",
    result: "TBD",
    requiredNote:
      "Record no active exception, or client/owner/expiry/migration plan",
  },
];

export const REVIEW_PACKET_GUARDRAIL =
  "No enforcement is authorized by this packet. Keep legacy auth aliases accepted until the 30-day telemetry gate is satisfied and enforcement is explicitly approved.";

const usage = () => `Usage:
  node scripts/auth-alias-telemetry-review.mjs --input <logs.json|logs.ndjson> [--input <more-logs.json|more-logs.ndjson>] [--start 2026-06-01] [--end 2026-06-16] [--checkpoint-date 2026-06-17] [--format markdown|json] [--output <packet.md|packet.json>]

Reads exported auth alias telemetry plus request-denominator logs and prints or writes the P5-T75 review packet for the complete-day window.
`;

const parseArgs = (argv) => {
  const options = {
    inputs: [],
    start: "2026-06-01",
    end: "2026-06-16",
    checkpointDate: "2026-06-17",
    format: "markdown",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--input") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      options.inputs.push(value);
      index += 1;
      continue;
    }

    if (arg === "--checkpoint-date") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      options.checkpointDate = value;
      index += 1;
      continue;
    }

    if (
      arg === "--start" ||
      arg === "--end" ||
      arg === "--format" ||
      arg === "--output"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && options.inputs.length === 0) {
    throw new Error("--input is required");
  }

  if (!["markdown", "json"].includes(options.format)) {
    throw new Error("--format must be markdown or json");
  }

  assertDate(options.start, "--start");
  assertDate(options.end, "--end");
  assertDate(options.checkpointDate, "--checkpoint-date");

  if (options.start > options.end) {
    throw new Error("--start must be on or before --end");
  }

  return options;
};

const assertDate = (value, label) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }
};

const unwrapRecord = (record) => {
  if (
    record &&
    typeof record === "object" &&
    record._source &&
    typeof record._source === "object"
  ) {
    return { ...record._source, ...(record.fields ?? {}) };
  }

  return record;
};

const parseJsonRecords = (parsed) => {
  if (Array.isArray(parsed)) {
    return parsed.map(unwrapRecord);
  }

  if (Array.isArray(parsed?.hits?.hits)) {
    return parsed.hits.hits.map(unwrapRecord);
  }

  if (Array.isArray(parsed?.records)) {
    return parsed.records.map(unwrapRecord);
  }

  if (parsed && typeof parsed === "object") {
    return [unwrapRecord(parsed)];
  }

  throw new Error(
    'Input JSON must be an object, array, Kibana hits export, or { "records": [...] }',
  );
};

export const readLogRecords = (filePath) => {
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) {
    return [];
  }

  try {
    return parseJsonRecords(JSON.parse(text));
  } catch (error) {
    const records = [];
    const errors = [];

    for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
      if (!line.trim()) {
        continue;
      }

      try {
        records.push(unwrapRecord(JSON.parse(line)));
      } catch (lineError) {
        errors.push(`line ${lineIndex + 1}: ${lineError.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Could not parse input as JSON or NDJSON (${errors.join("; ")})`,
      );
    }

    return records;
  }
};

const normalizeString = (value) => {
  if (Array.isArray(value)) {
    return normalizeString(value[0]);
  }

  return typeof value === "string" ? value : "";
};

const normalizeAliasFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).sort();
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
      .sort();
  }

  return [];
};

const readTimestamp = (record) =>
  normalizeString(record.timestamp) ||
  normalizeString(record["@timestamp"]) ||
  normalizeString(record.time);

const readDay = (record) => {
  const timestamp = readTimestamp(record);
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

const dateRange = (start, end) => {
  const days = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);

  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
};

const sameDayWindow = (day, start, end) => day >= start && day <= end;

const routeForPath = (pathValue, methodValue) => {
  const pathOnly = normalizeString(pathValue).split("?", 1)[0];
  const method = normalizeString(methodValue).toUpperCase();
  return TRACKED_AUTH_ALIAS_ROUTES.find(
    (route) => route.route === pathOnly && route.method === method,
  );
};

const routeForAlias = (record) => {
  const routeValue =
    normalizeString(record.route) || normalizeString(record.path);
  return TRACKED_AUTH_ALIAS_ROUTES.find(
    (route) => route.route === routeValue.split("?", 1)[0],
  );
};

const isAliasEvent = (record) =>
  normalizeString(record.event) === "auth.alias_input_used" ||
  normalizeString(record.message) === "auth.alias_input_used";

const parseMorganResponse = (record) => {
  const message = normalizeString(record.message);
  const match = message.match(
    /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\S+)\s+(\d{3})\b/i,
  );
  if (!match) {
    return undefined;
  }

  return {
    method: match[1].toUpperCase(),
    path: match[2],
    statusCode: Number(match[3]),
  };
};

const isStructuredResponseEvent = (record) =>
  normalizeString(record.message) === "Outgoing response";

const readResponseRoute = (record) => {
  if (isStructuredResponseEvent(record)) {
    return routeForPath(record.path, record.method);
  }

  const parsed = parseMorganResponse(record);
  return parsed ? routeForPath(parsed.path, parsed.method) : undefined;
};

const createRouteAccumulator = () =>
  Object.fromEntries(
    TRACKED_AUTH_ALIAS_ROUTES.map((route) => [
      route.route,
      {
        route,
        aliasRequests: 0,
        totalRequests: 0,
        aliasRequestsByDay: {},
        totalRequestsByDay: {},
      },
    ]),
  );

const addDayCount = (target, day) => {
  target[day] = (target[day] ?? 0) + 1;
};

const rollupKey = (route, aliasFields, correlationId, userAgent) =>
  JSON.stringify({
    route: route.route,
    aliasFields,
    correlationId,
    userAgent,
  });

export const buildAuthAliasTelemetryReview = (
  records,
  {
    start = "2026-06-01",
    end = "2026-06-16",
    checkpointDate = "2026-06-17",
  } = {},
) => {
  assertDate(start, "start");
  assertDate(end, "end");
  assertDate(checkpointDate, "checkpointDate");

  const days = dateRange(start, end);
  const routes = createRouteAccumulator();
  const eventRollups = new Map();
  const skipped = {
    noTimestamp: 0,
    outsideWindow: 0,
    untracked: 0,
  };

  for (const record of records) {
    if (!record || typeof record !== "object") {
      skipped.untracked += 1;
      continue;
    }

    const day = readDay(record);
    if (!day) {
      skipped.noTimestamp += 1;
      continue;
    }

    if (!sameDayWindow(day, start, end)) {
      skipped.outsideWindow += 1;
      continue;
    }

    if (isAliasEvent(record)) {
      const route = routeForAlias(record);
      if (!route) {
        skipped.untracked += 1;
        continue;
      }

      const routeStats = routes[route.route];
      const aliasFields = normalizeAliasFields(record.aliasFields);
      const correlationId = normalizeString(record.correlationId) || "unknown";
      const userAgent = normalizeString(record.userAgent) || "Unknown";
      const key = rollupKey(route, aliasFields, correlationId, userAgent);
      const existing = eventRollups.get(key) ?? {
        route,
        aliasFields,
        correlationIds: new Set(),
        userAgents: new Set(),
        count: 0,
        firstSeen: day,
        lastSeen: day,
      };

      existing.count += 1;
      existing.firstSeen = existing.firstSeen < day ? existing.firstSeen : day;
      existing.lastSeen = existing.lastSeen > day ? existing.lastSeen : day;
      existing.correlationIds.add(correlationId);
      existing.userAgents.add(userAgent);
      eventRollups.set(key, existing);

      routeStats.aliasRequests += 1;
      addDayCount(routeStats.aliasRequestsByDay, day);
      continue;
    }

    const responseRoute = readResponseRoute(record);
    if (!responseRoute) {
      skipped.untracked += 1;
      continue;
    }

    const routeStats = routes[responseRoute.route];
    routeStats.totalRequests += 1;
    addDayCount(routeStats.totalRequestsByDay, day);
  }

  const routeRows = TRACKED_AUTH_ALIAS_ROUTES.map((route) => {
    const stats = routes[route.route];
    const missingTrafficDays = days.filter(
      (day) => (stats.totalRequestsByDay[day] ?? 0) === 0,
    );
    const ratio =
      stats.totalRequests === 0
        ? null
        : stats.aliasRequests / stats.totalRequests;
    let status = "clean";

    if (stats.aliasRequests > 0) {
      status = "blocked";
    } else if (missingTrafficDays.length > 0) {
      status = "inconclusive";
    }

    return {
      route: route.label,
      routePath: route.route,
      method: route.method,
      completeDayWindow: formatDateWindow(start, end),
      aliasRequests: stats.aliasRequests,
      totalRequests: stats.totalRequests,
      ratio,
      status,
      missingTrafficDays,
    };
  });

  const overallOutcome = routeRows.some((row) => row.status === "blocked")
    ? "blocked"
    : routeRows.some((row) => row.status === "inconclusive")
      ? "inconclusive"
      : "clean";
  const skippedRecords = {
    ...skipped,
    total: skipped.noTimestamp + skipped.outsideWindow + skipped.untracked,
  };
  const packetSummary = {
    checkpointDate,
    completeDayWindow: formatDateWindow(start, end),
    overallOutcome,
    skippedRecords,
    guardrail: REVIEW_PACKET_GUARDRAIL,
  };

  return {
    checkpointDate,
    start,
    end,
    completeDayWindow: formatDateWindow(start, end),
    overallOutcome,
    packetSummary,
    routeRows,
    eventRollups: [...eventRollups.values()]
      .map((rollup) => ({
        route: rollup.route.label,
        aliasFields: rollup.aliasFields,
        correlationIds: [...rollup.correlationIds].sort(),
        userAgents: [...rollup.userAgents].sort(),
        count: rollup.count,
        firstSeen: rollup.firstSeen,
        lastSeen: rollup.lastSeen,
      }))
      .sort(
        (left, right) =>
          left.route.localeCompare(right.route) ||
          left.aliasFields
            .join(",")
            .localeCompare(right.aliasFields.join(",")) ||
          left.userAgents.join(",").localeCompare(right.userAgents.join(",")),
      ),
    exceptionCheckRows: EXCEPTION_CHECK_ROWS,
    skipped,
  };
};

export const formatDateWindow = (start, end) => {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startLabel = `${monthNames[startMonth - 1]} ${startDay}`;
  const endLabel = `${monthNames[endMonth - 1]} ${endDay}`;

  if (start === end) {
    return `${startLabel}, ${startYear}`;
  }

  if (startYear === endYear && startMonth === endMonth) {
    return `${startLabel}-${endDay}, ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startLabel}-${endLabel}, ${startYear}`;
  }

  return `${startLabel}, ${startYear}-${endLabel}, ${endYear}`;
};

const formatRatio = (ratio) =>
  ratio === null ? "N/A" : `${(ratio * 100).toFixed(4)}%`;

const markdownTable = (headers, rows) => {
  const escapeCell = (value) => String(value).replaceAll("|", "\\|");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
};

export const renderMarkdownReview = (review) => {
  const routeRows = review.routeRows.map((row) => [
    `\`${row.route}\``,
    row.completeDayWindow,
    row.aliasRequests,
    row.totalRequests,
    formatRatio(row.ratio),
    row.status,
  ]);

  const sections = [
    "# Auth Alias Telemetry Review Packet",
    "",
    `Checkpoint date: ${review.checkpointDate}`,
    `Complete-day window reviewed: ${review.completeDayWindow}`,
    `Overall route outcome: ${review.overallOutcome}`,
    `Guardrail: ${review.packetSummary?.guardrail ?? REVIEW_PACKET_GUARDRAIL}`,
    `Skipped records: ${review.packetSummary?.skippedRecords?.total ?? 0} total (${review.skipped.noTimestamp} without timestamps, ${review.skipped.outsideWindow} outside the window, ${review.skipped.untracked} untracked).`,
    "",
    "## Route Review Table",
    "",
    markdownTable(
      [
        "Route",
        "Complete-day window reviewed",
        "`auth.alias_input_used` count",
        "Total completed requests",
        "Ratio",
        "Clean, inconclusive, or blocked",
      ],
      routeRows,
    ),
    "",
  ];

  const missingTrafficRows = review.routeRows
    .filter((row) => row.missingTrafficDays.length > 0)
    .map((row) => [`\`${row.route}\``, row.missingTrafficDays.join(", ")]);

  if (missingTrafficRows.length > 0) {
    sections.push(
      "## Inconclusive Route Days",
      "",
      markdownTable(
        ["Route", "Zero-denominator complete days"],
        missingTrafficRows,
      ),
      "",
    );
  }

  sections.push("## Alias Event Rollup", "");

  if (review.eventRollups.length === 0) {
    sections.push(
      "No `auth.alias_input_used` events were found in the complete-day window.",
      "",
    );
  } else {
    sections.push(
      markdownTable(
        [
          "Route",
          "Alias field(s)",
          "Correlation ID(s)",
          "User agent/client",
          "Classification",
          "Follow-up owner",
        ],
        review.eventRollups.map((rollup) => [
          `\`${rollup.route}\``,
          rollup.aliasFields.map((field) => `\`${field}\``).join(", ") ||
            "Unknown",
          rollup.correlationIds.join(", "),
          rollup.userAgents.join(", "),
          "TBD",
          "TBD",
        ]),
      ),
      "",
    );
  }

  sections.push(
    "## Exception Check Template",
    "",
    markdownTable(
      ["Check source", "Result", "Required note"],
      (review.exceptionCheckRows ?? EXCEPTION_CHECK_ROWS).map((row) => [
        row.checkSource,
        row.result,
        row.requiredNote,
      ]),
    ),
    "",
    `Skipped records detail: ${review.skipped.noTimestamp} without timestamps, ${review.skipped.outsideWindow} outside the window, ${review.skipped.untracked} untracked.`,
    "",
  );

  return sections.join("\n");
};

const writePacketOutput = (filePath, content) => {
  const outputPath = path.resolve(filePath);
  if (fs.existsSync(outputPath)) {
    throw new Error(`Refusing to overwrite existing output: ${outputPath}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf8");
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const records = options.inputs.flatMap((input) =>
    readLogRecords(path.resolve(input)),
  );
  const review = buildAuthAliasTelemetryReview(records, {
    start: options.start,
    end: options.end,
    checkpointDate: options.checkpointDate,
  });

  const output =
    options.format === "json"
      ? `${JSON.stringify(review, null, 2)}\n`
      : renderMarkdownReview(review);

  if (options.output) {
    writePacketOutput(options.output, output);
    return;
  }

  process.stdout.write(output);
};

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exit(1);
  }
}
