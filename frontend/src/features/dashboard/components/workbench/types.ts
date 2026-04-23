import type { NavigationItem } from '../../../../hooks/useNavigationPreferences';

export type WorkbenchLink = NavigationItem & {
  sectionLabel: string;
};
