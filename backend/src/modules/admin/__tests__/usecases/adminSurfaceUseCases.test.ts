import * as organizationSettingsUseCase from '../../usecases/organizationSettingsUseCase';
import * as adminBrandingUseCase from '../../usecases/adminBrandingUseCase';
import * as adminDashboardStatsUseCase from '../../usecases/adminDashboardStatsUseCase';
import * as organizationSettingsRepository from '../../repositories/organizationSettingsRepository';
import * as adminBrandingRepository from '../../repositories/adminBrandingRepository';
import * as adminDashboardStatsRepository from '../../repositories/adminDashboardStatsRepository';

jest.mock('../../repositories/organizationSettingsRepository', () => ({
  __esModule: true,
  getOrganizationSettings: jest.fn(),
  upsertOrganizationSettings: jest.fn(),
}));

jest.mock('../../repositories/adminBrandingRepository', () => ({
  __esModule: true,
  getBranding: jest.fn(),
  updateBranding: jest.fn(),
}));

jest.mock('../../repositories/adminDashboardStatsRepository', () => ({
  __esModule: true,
  getAdminDashboardStats: jest.fn(),
}));

describe('admin surface usecases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates organization settings reads and writes to the repository', async () => {
    const settings = {
      organizationId: 'org-1',
      config: { name: 'West Cat Society' },
      createdAt: '2026-04-16T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
    };

    (
      organizationSettingsRepository.getOrganizationSettings as jest.MockedFunction<
        typeof organizationSettingsRepository.getOrganizationSettings
      >
    ).mockResolvedValue(settings as Awaited<
      ReturnType<typeof organizationSettingsRepository.getOrganizationSettings>
    >);
    (
      organizationSettingsRepository.upsertOrganizationSettings as jest.MockedFunction<
        typeof organizationSettingsRepository.upsertOrganizationSettings
      >
    ).mockResolvedValue(settings as Awaited<
      ReturnType<typeof organizationSettingsRepository.upsertOrganizationSettings>
    >);

    await expect(
      organizationSettingsUseCase.getOrganizationSettings('org-1', 'user-1')
    ).resolves.toEqual(settings);
    await expect(
      organizationSettingsUseCase.updateOrganizationSettings(
        'org-1',
        settings.config as never,
        'user-1'
      )
    ).resolves.toEqual(settings);
  });

  it('delegates branding reads and writes to the repository', async () => {
    const branding = {
      appName: 'Nonprofit Manager',
      appIcon: null,
      primaryColour: '#0055AA',
      secondaryColour: '#00AA55',
      favicon: null,
    };

    (
      adminBrandingRepository.getBranding as jest.MockedFunction<
        typeof adminBrandingRepository.getBranding
      >
    ).mockResolvedValue(branding);
    (
      adminBrandingRepository.updateBranding as jest.MockedFunction<
        typeof adminBrandingRepository.updateBranding
      >
    ).mockResolvedValue(branding);

    await expect(adminBrandingUseCase.getBranding()).resolves.toEqual(branding);
    await expect(adminBrandingUseCase.updateBranding(branding)).resolves.toEqual(branding);
  });

  it('delegates dashboard stats reads to the repository', async () => {
    const stats = {
      totalUsers: 12,
      activeUsers: 8,
      totalContacts: 140,
      recentDonations: 3200,
      recentSignups: [{ id: 'user-1', email: 'admin@example.com', created_at: '2026-04-16T00:00:00.000Z' }],
    };

    (
      adminDashboardStatsRepository.getAdminDashboardStats as jest.MockedFunction<
        typeof adminDashboardStatsRepository.getAdminDashboardStats
      >
    ).mockResolvedValue(stats);

    await expect(adminDashboardStatsUseCase.getAdminDashboardStats()).resolves.toEqual(stats);
  });
});
