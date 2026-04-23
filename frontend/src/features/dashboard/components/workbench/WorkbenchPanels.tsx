import type { ReactNode } from 'react';
import { QuickActionsWidget, QuickLookupWidget } from '../../../../components/dashboard';
import { useNavigationPreferences } from '../../../../hooks/useNavigationPreferences';
import type { DashboardSettings } from '../../types/viewSettings';
import FocusQueuePanel from './FocusQueuePanel';
import InsightStripPanel from './InsightStripPanel';
import MyWorkPanel from './MyWorkPanel';
import { WorkstreamPanel } from './WorkbenchPanelPrimitives';
import WorkspaceSummaryPanel from './WorkspaceSummaryPanel';
import {
  buildEnabledWorkbenchLinks,
  buildWorkbenchLinks,
  countActiveWorkbenchSections,
} from './workbenchUtils';

interface WorkbenchPanelsProps {
  settings: DashboardSettings;
  setupPanel?: ReactNode;
}

export default function WorkbenchPanels({ settings, setupPanel }: WorkbenchPanelsProps) {
  const { pinnedItems, enabledItems } = useNavigationPreferences();

  const pinnedWorkstreams = buildWorkbenchLinks(pinnedItems);
  const enabledWorkstreams = buildEnabledWorkbenchLinks(enabledItems);
  const activeSectionCount = countActiveWorkbenchSections(enabledItems);

  return (
    <>
      {settings.showFocusQueue ? (
        <div className="mt-6">
          <FocusQueuePanel />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <MyWorkPanel />
        {settings.showQuickLookup ? <QuickLookupWidget className="h-full" /> : null}
      </div>

      {settings.showQuickActions ? (
        <div className="mt-6">
          <QuickActionsWidget />
        </div>
      ) : null}

      {settings.showWorkspaceSummary ? (
        <WorkspaceSummaryPanel
          pinnedWorkstreamsCount={pinnedWorkstreams.length}
          activeSectionCount={activeSectionCount}
        />
      ) : null}

      {settings.showInsightStrip ? (
        <div className="mt-6">
          <InsightStripPanel />
        </div>
      ) : null}

      {setupPanel ? <div className="mt-6">{setupPanel}</div> : null}

      {settings.showPinnedWorkstreams || settings.showModules ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {settings.showPinnedWorkstreams ? (
            <WorkstreamPanel
              title="Pinned Shortcuts"
              description="Keep your saved shortcuts available here as a lower-priority reference beneath the active work queues."
              items={pinnedWorkstreams}
              emptyState="No shortcuts are pinned yet. Open Navigation Settings and pin the modules you revisit every day."
              manageLabel="Manage shortcuts"
              manageTo="/settings/navigation"
              compact
            />
          ) : null}

          {settings.showModules ? (
            <WorkstreamPanel
              title="Enabled Workstreams"
              description="A compact map of the staff modules currently enabled in navigation when you need to reorient."
              items={enabledWorkstreams}
              emptyState="No additional workstreams are enabled right now. Use Navigation Settings to turn modules back on."
              manageLabel="Navigation settings"
              manageTo="/settings/navigation"
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
