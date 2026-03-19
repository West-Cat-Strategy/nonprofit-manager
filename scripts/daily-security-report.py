#!/usr/bin/env python3
"""Generate a lightweight daily security report for the repository."""

from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass
class CheckResult:
    name: str
    command: list[str]
    ok: bool
    output: str


def run_check(name: str, command: list[str]) -> CheckResult:
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    output = (completed.stdout or "") + (completed.stderr or "")
    return CheckResult(name=name, command=command, ok=completed.returncode == 0, output=output.strip())


def build_report(checks: list[CheckResult]) -> dict[str, object]:
    failures = [check for check in checks if not check.ok]
    passed = len(checks) - len(failures)
    generated_at = datetime.now(timezone.utc).isoformat()

    return {
        "generated_at": generated_at,
        "summary": {
            "checks_total": len(checks),
            "checks_passed": passed,
            "checks_failed": len(failures),
        },
        "checks": [
            {
                "name": check.name,
                "status": "pass" if check.ok else "fail",
                "command": check.command,
                "output": check.output,
            }
            for check in checks
        ],
        "action_items": [
            f"Investigate {check.name}" for check in failures
        ],
    }


def render_markdown(report: dict[str, object]) -> str:
    summary = report["summary"]
    checks = report["checks"]
    action_items = report["action_items"]
    lines = [
        f"Daily Security Report - {report['generated_at']}",
        "",
        "## Summary",
        f"- Checks passed: {summary['checks_passed']}",
        f"- Checks failed: {summary['checks_failed']}",
        "",
        "## Checks",
    ]

    for check in checks:
        lines.append(f"- {check['name']}: {check['status']}")

    lines.extend(["", "## Action Items"])
    if action_items:
        for item in action_items:
            lines.append(f"- {item}")
    else:
        lines.append("- None")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of markdown.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when any check fails.",
    )
    args = parser.parse_args()

    checks = [
        run_check("rate-limit-key-policy", ["node", "scripts/check-rate-limit-key-policy.ts"]),
        run_check("auth-guard-policy", ["node", "scripts/check-auth-guard-policy.ts"]),
        run_check("express-validator-policy", ["node", "scripts/check-express-validator-policy.ts"]),
        run_check("success-envelope-policy", ["node", "scripts/check-success-envelope-policy.ts"]),
        run_check("route-integrity", ["node", "scripts/check-route-integrity.ts"]),
        run_check("route-catalog-drift", ["node", "scripts/check-route-catalog-drift.ts"]),
        run_check("migration-manifest-policy", ["node", "scripts/check-migration-manifest-policy.ts"]),
    ]

    report = build_report(checks)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(render_markdown(report))

    if args.strict and report["summary"]["checks_failed"] > 0:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
