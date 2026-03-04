import { render } from '@testing-library/react';
import { vi } from 'vitest';
import AccessPanel from '../AccessPanel';
import UsersPanel from '../UsersPanel';
import ConversationsPanel from '../ConversationsPanel';
import AppointmentsPanel from '../AppointmentsPanel';
import SlotsPanel from '../SlotsPanel';

const portalSectionSpy = vi.fn(() => <div data-testid="portal-section" />);

vi.mock('../../../adminSettings/sections/PortalSection', () => ({
  __esModule: true,
  default: (props: unknown) => portalSectionSpy(props),
}));

describe('portal admin panel wrappers', () => {
  beforeEach(() => {
    portalSectionSpy.mockClear();
  });

  it.each([
    ['access', AccessPanel, ['access']],
    ['users', UsersPanel, ['users']],
    ['conversations', ConversationsPanel, ['conversations']],
    ['appointments', AppointmentsPanel, ['appointments']],
    ['slots', SlotsPanel, ['slots']],
  ])('%s wrapper passes the expected visible panel', (_name, PanelComponent, expectedPanels) => {
    const panelProps = {} as unknown as Parameters<typeof PanelComponent>[0];
    render(<PanelComponent {...panelProps} />);
    expect(portalSectionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        visiblePanels: expectedPanels,
      })
    );
  });
});
