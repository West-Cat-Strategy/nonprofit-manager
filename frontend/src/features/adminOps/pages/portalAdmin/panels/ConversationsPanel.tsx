import PortalSection, {
  type PortalSectionProps,
} from '../../adminSettings/sections/PortalSection';

export default function ConversationsPanel(props: Omit<PortalSectionProps, 'visiblePanels'>) {
  return <PortalSection {...props} visiblePanels={['conversations']} />;
}
