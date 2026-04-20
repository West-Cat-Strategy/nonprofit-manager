import SurfaceContextBar from './SurfaceContextBar';
import { useNavigationPreferences } from '../../hooks/useNavigationPreferences';

export default function WorkspaceHeader() {
  const { favoriteItems, pinnedItems } = useNavigationPreferences();
  const shortcuts = favoriteItems ?? pinnedItems ?? [];

  return (
    <SurfaceContextBar
      showLocalNavigation
      shortcuts={shortcuts.map((item) => ({
        id: item.id,
        label: item.shortLabel ?? item.name,
        path: item.path,
        icon: item.icon,
        ariaLabel: `Pinned shortcut: ${item.ariaLabel ?? item.name}`,
      }))}
      secondaryAction={{ label: 'Manage Navigation', to: '/settings/navigation' }}
      shortcutLabel="Pinned shortcuts"
    />
  );
}
