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

export type RouteArea =
  | 'Home'
  | 'People'
  | 'Service'
  | 'Engagement'
  | 'Finance'
  | 'Insights'
  | 'Publishing'
  | 'Admin'
  | 'Access'
  | 'Events'
  | 'Check-In'
  | 'Reports'
  | 'Cases'
  | 'Messages'
  | 'Documents'
  | 'Forms'
  | 'Appointments'
  | 'Account'
  | 'Demo';

export type RouteSurface = 'public' | 'staff' | 'portal' | 'demo';
export type RouteAuthScope = 'public' | 'staff' | 'portal' | 'admin';
export type StaffNavGroup = 'primary' | 'secondary' | 'utility';
export type AdminNavigationMode = 'settings' | 'portal';
export type FeatureFlagValues = Partial<Record<string, string | boolean | undefined>>;
export type RouteNavKind = 'hub' | 'leaf' | 'utility';
export type RouteAuditFixtureKey =
  | 'staff-invitation'
  | 'admin-registration-review'
  | 'password-reset'
  | 'public-case-form'
  | 'portal-invitation'
  | 'public-report-snapshot'
  | 'public-events';

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
  area: RouteArea;
  surface: RouteSurface;
  path: string;
  href?: string;
  requiresAuth: boolean;
  authScope: RouteAuthScope;
  navKind: RouteNavKind;
  parentId?: string;
  breadcrumbLabel: string;
  featureStatus?: FeatureAccessStatus;
  featureFlagEnv?: string;
  auditFixtureKey?: RouteAuditFixtureKey;
  auditScore?: UiAuditScore;
  primaryAction?: {
    label: string;
    href: string;
  };
  mobilePriority?: number;
  showInMobileHeader?: boolean;
  showInMobileDrawerUtilities?: boolean;
  adminSurface?: 'core' | 'workspace';
  adminLabel?: string;
  adminDescription?: string;
  adminIcon?: string;
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
