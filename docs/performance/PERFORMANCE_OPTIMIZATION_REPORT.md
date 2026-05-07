# Performance Optimization Report

**Last Updated:** 2026-05-07

This is a historical summary of earlier performance waves. It is retained for provenance, not as a current benchmark claim. Use [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) for current posture and [README.md](README.md) for the performance evidence index.

## Historical Summary

Earlier optimization work focused on:

- Backend compression and shared database pool cleanup
- Frontend bundle splitting and lazy route loading
- Memoized Redux selectors and expensive chart components
- Analytics/query cache ownership
- Pagination and query-path improvements for large datasets
- Startup/request-path measurements for Phase 4 performance rows

The original detailed report included old timing claims and code snapshots that can drift as the app changes. Keep those claims historical unless the measurements are rerun in the current tree.

## Retained Evidence

| Evidence | Use |
|---|---|
| [p4-t9a-startup-request-map.md](p4-t9a-startup-request-map.md) | Startup request-map notes |
| [p4-t9d-baseline-notes.md](p4-t9d-baseline-notes.md) | Baseline notes for P4-T9D |
| [p4-t9d-final-report.md](p4-t9d-final-report.md) | P4-T9D closeout and measurement summary |
| [p4-t9h-final-report.md](p4-t9h-final-report.md) | P4-T9H closeout evidence |
| [artifacts/p4-t9h/summary.md](artifacts/p4-t9h/summary.md) | Retained P4-T9H measurement table |

## Current Rule

Before using historical numbers in a new plan, rerun the relevant measurement path and capture a dated proof note. Do not copy old performance percentages into active roadmap or acceptance docs without fresh evidence.
