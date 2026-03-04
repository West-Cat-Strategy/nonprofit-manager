import PortalSection, {
  type PortalSectionProps,
} from '../../adminSettings/sections/PortalSection';

export default function SlotsPanel(props: Omit<PortalSectionProps, 'visiblePanels'>) {
  return <PortalSection {...props} visiblePanels={['slots']} />;
}
