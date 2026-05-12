import type * as ReactRouterDom from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OutreachCenterPage from '../OutreachCenterPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { mockNavigate, mockLocation, mockGetCampaignStats, mockGetCampaignEvents } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLocation: vi.fn(() => ({ pathname: '/outreach' })),
  mockGetCampaignStats: vi.fn(),
  mockGetCampaignEvents: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation(),
  };
});

vi.mock('../../../../services/LoopApiService', () => ({
  default: {
    getCampaignStats: mockGetCampaignStats,
    getCampaignEvents: mockGetCampaignEvents,
  },
}));

describe('OutreachCenterPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetCampaignStats.mockResolvedValue({
      peopleEngaged: 1234,
      newsletterSubs: 456,
      upcomingEvents: 7,
      activeDonors: 89,
      socialHandle: '@westcat',
    });
    mockGetCampaignEvents.mockResolvedValue([
      {
        id: 'event-1',
        title: 'Spring Community Night',
        date: 'APR 17',
        rsvpCount: 24,
        time: '6:00 PM',
      },
      {
        id: 'event-2',
        title: 'Volunteer Welcome',
        date: 'APR 22',
        rsvpCount: 11,
        time: '4:30 PM',
      },
    ]);
  });

  it('routes the new blast CTA to communications settings', async () => {
    const user = userEvent.setup();
    mockLocation.mockReturnValue({ pathname: '/outreach' });

    renderWithProviders(<OutreachCenterPage />, {
      route: '/outreach',
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new blast/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /new blast/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/settings/communications');
  });

  it('renders deterministic demo outreach data without calling the staff outreach APIs', async () => {
    mockLocation.mockReturnValue({ pathname: '/demo/outreach' });

    renderWithProviders(<OutreachCenterPage />, {
      route: '/demo/outreach',
    });

    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    expect(screen.getByText('Demo Spring Community Night')).toBeInTheDocument();
    expect(screen.getByText('Demo Volunteer Welcome')).toBeInTheDocument();
  });

  it('shows a fallback notice when outreach APIs fail without logging console errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockLocation.mockReturnValue({ pathname: '/outreach' });
    mockGetCampaignStats.mockRejectedValueOnce(new Error('stats unavailable'));
    mockGetCampaignEvents.mockRejectedValueOnce(new Error('events unavailable'));

    renderWithProviders(<OutreachCenterPage />, {
      route: '/outreach',
    });

    await waitFor(() => {
      expect(
        screen.getByText(/some outreach data is temporarily unavailable/i)
      ).toBeInTheDocument();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it.each([
    ['title', 'volunteer', 'Volunteer Welcome'],
    ['date', 'apr 17', 'Spring Community Night'],
    ['time', '4:30', 'Volunteer Welcome'],
    ['RSVP count', '24', 'Spring Community Night'],
  ])('filters visible outreach rows by %s', async (_field, query, expectedTitle) => {
    const user = userEvent.setup();
    mockLocation.mockReturnValue({ pathname: '/outreach' });

    renderWithProviders(<OutreachCenterPage />, {
      route: '/outreach',
    });

    await waitFor(() => {
      expect(screen.getByText('Spring Community Night')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('searchbox', { name: /search outreach campaigns/i }), query);

    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    const otherTitle =
      expectedTitle === 'Spring Community Night' ? 'Volunteer Welcome' : 'Spring Community Night';
    expect(screen.queryByText(otherTitle)).not.toBeInTheDocument();
  });

  it('shows an empty state when outreach search has no matches', async () => {
    const user = userEvent.setup();
    mockLocation.mockReturnValue({ pathname: '/outreach' });

    renderWithProviders(<OutreachCenterPage />, {
      route: '/outreach',
    });

    await waitFor(() => {
      expect(screen.getByText('Spring Community Night')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('searchbox', { name: /search outreach campaigns/i }), 'zzzz');

    expect(screen.getByRole('heading', { name: /no outreach rows found/i })).toBeInTheDocument();
    expect(
      screen.getByText(/try a different campaign, date, time, or rsvp count/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Spring Community Night')).not.toBeInTheDocument();
  });
});
