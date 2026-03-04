import PortalSection, {
  type PortalSectionProps,
} from '../../adminSettings/sections/PortalSection';

export default function AccessPanel(props: Omit<PortalSectionProps, 'visiblePanels'>) {
  return <PortalSection {...props} visiblePanels={['access']} />;
}
