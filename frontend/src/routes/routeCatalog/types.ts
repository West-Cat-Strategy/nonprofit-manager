export type FeatureAccessStatus =
  | 'available'
  | 'hidden'
  | 'broken'
  | 'missing-ui'
  | 'role-gated'
  | 'flag-disabled';

export interface UiAuditScore {
  readability: number;
  accessibility: number;
  efficiency: number;
  workflowClarity: number;
}

export type RouteSection =
  | 'Auth'
  | 'Portal'
  | 'People'
  | 'Engagement'
  | 'Finance'
  | 'Analytics'
  | 'Settings'
  | 'Builder'
  | 'Core'
  | 'Demo'
  | 'Websites';

export type RouteSurface = 'public' | 'staff' | 'portal' | 'demo';
export type RouteAuthScope = 'public' | 'staff' | 'portal' | 'admin';
export type StaffNavGroup = 'primary' | 'secondary' | 'utility';
export type AdminNavigationMode = 'settings' | 'portal';
export type FeatureFlagValues = Partial<Record<string, string | boolean | undefined>>;

export interface RouteCatalogAlias {
  path: string;
  query?: Record<string, string>;
  exactQuery?: boolean;
}

export interface RouteCatalogAdminNavConfig {
  mode: AdminNavigationMode;
  order: number;
  label?: string;
  matchPrefixes?: string[];
}

export interface RouteCatalogEntry {
  id: string;
  title: string;
  section: RouteSection;
  surface: RouteSurface;
  path: string;
  href?: string;
  requiresAuth: boolean;
  authScope: RouteAuthScope;
  featureStatus?: FeatureAccessStatus;
  featureFlagEnv?: string;
  auditScore?: UiAuditScore;
  aliases?: readonly (string | RouteCatalogAlias)[];
  primaryAction?: {
    label: string;
    href: string;
  };
  staffNav?: {
    group: StaffNavGroup;
    order: number;
    label?: string;
    shortLabel?: string;
    ariaLabel?: string;
    icon?: string;
    pinnedEligible?: boolean;
  };
  portalNav?: {
    order: number;
    label?: string;
  };
  adminNav?: RouteCatalogAdminNavConfig | readonly RouteCatalogAdminNavConfig[];
}
