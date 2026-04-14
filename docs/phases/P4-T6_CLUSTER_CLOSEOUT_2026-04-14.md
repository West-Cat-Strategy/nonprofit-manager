# P4-T6 Cluster Closeout

**Date:** 2026-04-14  
**Rows reviewed:** `P4-T6`, `P4-T6A`, `P4-T6B`, `P4-T6D`

## Summary

- Audited the remaining workflow-first UX review cluster against the current tree and current test evidence before removing any more rows.
- `P4-T6B` is specific enough, and the current cases/intake implementation plus the fresh frontend reruns are strong enough, to close today.
- `P4-T6`, `P4-T6A`, and `P4-T6D` still stay broader or looser than the row-local proof gathered in this pass, so they remain in `Review`.

## Validation

- `cd frontend && npm run type-check`
  - Result: Passed.
- `make check-links`
  - Result: Passed. Checked `91` files and `682` local links with no broken active-doc links.
- `cd frontend && npm test -- --run src/routes/__tests__/setupRedirects.test.tsx src/features/teamChat/__tests__/TeamMessengerConversationPanel.test.tsx src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx src/features/reports/hooks/__tests__/useWorkflowCoverageReportController.test.tsx src/features/portal/pages/__tests__/PortalCaseDetailPage.test.tsx src/test/ux/RouteUxSmoke.test.tsx src/features/adminOps/pages/adminSettings/hooks/__tests__/adminSettingsHooks.test.ts`
  - Result: Passed. `7` files, `44` tests.
- `cd frontend && npm test -- --run src/features/accounts/pages/__tests__/AccountListPage.test.tsx src/features/cases/pages/__tests__/CaseListPage.test.tsx src/features/events/pages/__tests__/EventDetailPage.test.tsx src/features/finance/pages/__tests__/DonationListPage.test.tsx`
  - Result: Passed. `4` files, `9` tests.
- `cd frontend && npm test -- --run src/features/teamChat/__tests__/CaseTeamChatPanel.test.tsx src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx`
  - Result: Passed. `2` files, `5` tests.
- `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx`
  - Result: Passed. `1` file, `2` tests.

## Row Assessment

- `P4-T6`
  - Current-tree proof: the cases/intake routes are live through `frontend/src/routes/workflowRoutes.tsx`, `frontend/src/features/cases/pages/CaseListPage.tsx`, and `frontend/src/features/workflows/pages/IntakeNewPage.tsx`; the full portal route surface remains live through `frontend/src/routes/portalRoutes.tsx`.
  - Mismatch: the parent row still bundles both the cases/intake and full-portal halves together, which is broader than the row-local closeout proof gathered here.
  - Conclusion: keep in `Review`.
- `P4-T6A`
  - Current-tree proof: shared UX primitives exist in `frontend/src/features/workflows/components/WorkflowStepper.tsx`, `frontend/src/components/portal/PortalPageShell.tsx`, `frontend/src/components/portal/PortalListToolbar.tsx`, and `frontend/src/components/portal/PortalListCard.tsx`.
  - Mismatch: the row remains underspecified around its “follow-ups QoL” scope, and the gathered proof is still indirect rather than a dedicated row-local closeout package.
  - Conclusion: keep in `Review`.
- `P4-T6B`
  - Current-tree proof: cases/intake workflow behavior is concrete in `frontend/src/features/cases/pages/CaseListPage.tsx`, `frontend/src/features/cases/pages/__tests__/CaseListPage.test.tsx`, `frontend/src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx`, `frontend/src/features/workflows/pages/IntakeNewPage.tsx`, and `frontend/src/test/ux/RouteUxSmoke.test.tsx`.
  - Existing supplemental proof: the current tree still matches the existing cases/intake docs and E2E surfaces, including `docs/help-center/staff/cases.html` and `e2e/tests/cases.spec.ts`.
  - Conclusion: close today and remove from the live workboard.
- `P4-T6D`
  - Current-tree proof: several portal secondary-page surfaces still have direct tests, including `frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx`, `frontend/src/features/portal/pages/__tests__/PortalCalendarPage.test.tsx`, and `frontend/src/features/portal/pages/__tests__/PortalEventsPage.test.tsx`.
  - Mismatch: the row still speaks broadly about portal secondary pages, while this pass did not produce equally direct proof for every route in the current secondary-page set.
  - Conclusion: keep in `Review`.

## Conclusion

- This note is the row-local proof artifact for the 2026-04-14 UX cluster pass.
- `P4-T6B` can be removed from the workboard using this note plus the validation matrix above.
- `P4-T6`, `P4-T6A`, and `P4-T6D` stay in `Review` with this note as the explanation of what is still missing.
