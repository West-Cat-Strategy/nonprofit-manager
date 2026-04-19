# P4-T9H Explain Summary

**Last Updated:** 2026-04-19


Generated: 2026-03-13 23:26:04Z
Search pattern: `%supportwave%`
Dataset: synthetic Docker-backed PostgreSQL 16 capture from `scripts/perf/p4-t9h-capture.sh`

| Domain | Old count+list ms | New list ms | Improvement ms | Old plan signals | New plan signals | Notes |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Accounts | 48.497 | 17.108 | 31.389 | Aggregate plus sorted page query, both using `Seq Scan on accounts` | `WindowAgg`, `Limit`, `Sort`, `Seq Scan on accounts` | Total drops by removing the duplicate count pass even though this synthetic scale still prefers a base-table seq scan. |
| Contacts | 163.641 | 27.188 | 136.453 | Aggregate count plus page query with global scans/aggregates across `contact_phone_numbers`, `contact_email_addresses`, `contact_relationships`, and `contact_notes` | `WindowAgg` plus page-scoped bitmap/index probes for contact methods, relationships, notes, and role assignments | Biggest gain comes from limiting related-count work to the current page instead of aggregating every related row in the table. |
| Tasks | 55.402 | 2.347 | 53.055 | Aggregate count plus sorted page query over `tasks` | `WindowAgg`, `Bitmap Index Scan` via `idx_tasks_staff_search_trgm`, `Bitmap Heap Scan on tasks` | This is the clearest trigram win in the synthetic capture; the list path no longer needs a separate count query either. |
| Cases | 39.230 | 13.812 | 25.418 | Aggregate count plus page query with correlated note/document count probes | `WindowAgg` plus page-scoped `case_notes` / `case_documents` index probes | Correlated per-row counts were replaced with page-scoped aggregate joins, cutting repeated related-table work. |

The raw explain-plan JSON bundle captured during the task was pruned on 2026-04-19 after this summary and the final report retained the important measurements and plan-level takeaways.
