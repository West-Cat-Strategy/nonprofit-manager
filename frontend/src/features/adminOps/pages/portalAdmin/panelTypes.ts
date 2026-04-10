import type { PortalSectionProps } from '../adminSettings/sections/PortalSection';

export type PortalSectionPanel = 'access' | 'users' | 'conversations' | 'appointments' | 'slots';

export type PortalPanelProps = Omit<PortalSectionProps, 'visiblePanels'>;
