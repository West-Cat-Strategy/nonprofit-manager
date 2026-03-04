import PortalSection, {
  type PortalSectionProps,
} from '../../adminSettings/sections/PortalSection';

export default function UsersPanel(props: Omit<PortalSectionProps, 'visiblePanels'>) {
  return <PortalSection {...props} visiblePanels={['users']} />;
}
