import { Children, isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnalyticsRoutes } from '../analyticsRoutes';
import { createBuilderRoutes } from '../builderRoutes';
import { createEngagementRoutes } from '../engagementRoutes';
import { createFinanceRoutes } from '../financeRoutes';
import { createGrantsRoutes } from '../grantsRoutes';
import { createPeopleRoutes } from '../peopleRoutes';
import { getRouteHref, matchRouteCatalogEntry } from '../routeCatalog';
import { createWebsiteRoutes } from '../websiteRoutes';
import { createWorkflowRoutes } from '../workflowRoutes';

const Wrapper = ({ children }: { children: ReactNode }) => children;

const sampleParams: Record<string, string> = {
  id: '123',
  siteId: 'site-1',
  templateId: 'template-1',
  volunteerId: 'volunteer-1',
  assignmentId: 'assignment-1',
};

const materializePath = (path: string): string =>
  path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => sampleParams[key] ?? `${key}-value`);

const collectRoutePaths = (node: ReactNode): string[] => {
  const paths: string[] = [];

  Children.forEach(node, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    const props = child.props as {
      path?: string;
      children?: ReactNode;
    };

    if (props.path) {
      paths.push(props.path);
    }

    if (props.children) {
      paths.push(...collectRoutePaths(props.children));
    }
  });

  return paths;
};

describe('non-admin route families', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps every non-admin route-module path represented in the route catalog', () => {
    vi.stubEnv('VITE_TEAM_CHAT_ENABLED', 'true');

    const routeFamilies = [
      ['people', collectRoutePaths(createPeopleRoutes(Wrapper))],
      ['engagement', collectRoutePaths(createEngagementRoutes(Wrapper))],
      ['finance', collectRoutePaths(createFinanceRoutes(Wrapper))],
      ['grants', collectRoutePaths(createGrantsRoutes(Wrapper))],
      ['analytics', collectRoutePaths(createAnalyticsRoutes(Wrapper))],
      ['workflow', collectRoutePaths(createWorkflowRoutes(Wrapper))],
      ['websites', collectRoutePaths(createWebsiteRoutes(Wrapper))],
      ['builder', collectRoutePaths(createBuilderRoutes(Wrapper))],
    ] as const;

    for (const [family, paths] of routeFamilies) {
      expect(paths.length).toBeGreaterThan(0);

      for (const path of paths) {
        const samplePath = materializePath(path);
        const entry = matchRouteCatalogEntry(samplePath);

        expect(entry, `Missing route catalog entry for ${family} path ${path}`).toBeTruthy();
        expect(
          entry &&
            (entry.path === path || materializePath(getRouteHref(entry)) === samplePath),
          `Route catalog resolved ${family} path ${path} to ${entry?.path ?? 'nothing'}`
        ).toBe(true);
      }
    }
  });
});
