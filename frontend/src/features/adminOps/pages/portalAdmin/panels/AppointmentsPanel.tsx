import PortalSection, {
  type PortalSectionProps,
} from '../../adminSettings/sections/PortalSection';

export default function AppointmentsPanel(props: Omit<PortalSectionProps, 'visiblePanels'>) {
  return <PortalSection {...props} visiblePanels={['appointments']} />;
}
