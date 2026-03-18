/**
 * @deprecated Import builder site-aware helpers from
 * `frontend/src/features/builder/lib/siteAwareEditor.ts`.
 * This page-layer module remains as a thin compatibility facade for tests only.
 */
export type { BuilderSiteContext } from '../../features/builder/lib/siteAwareEditor';
export {
  getBuilderBackLabel,
  getBuilderBackTarget,
  getBuilderContextLabel,
  getBuilderStatusLabel,
  resolveBuilderSiteId,
} from '../../features/builder/lib/siteAwareEditor';
