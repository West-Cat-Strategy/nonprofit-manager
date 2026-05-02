import type { Pool } from 'pg';
import { DonationDesignationService } from '../donationDesignationService';

const mockQuery = jest.fn();
const pool = {
  query: mockQuery,
} as unknown as Pool;

describe('DonationDesignationService', () => {
  let service: DonationDesignationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DonationDesignationService(pool);
  });

  it('lists active fund designations for an organization', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          designation_id: 'designation-1',
          organization_id: 'org-1',
          code: 'building-fund',
          name: 'Building Fund',
          description: 'Restricted to the capital campaign',
          restriction_type: 'temporarily_restricted',
          is_active: true,
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-01T00:00:00.000Z'),
        },
      ],
    });

    const result = await service.listDesignations('org-1');

    expect(result).toEqual([
      {
        designation_id: 'designation-1',
        organization_id: 'org-1',
        code: 'building-fund',
        name: 'Building Fund',
        description: 'Restricted to the capital campaign',
        restriction_type: 'temporarily_restricted',
        is_active: true,
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM fund_designations'), [
      'org-1',
      false,
    ]);
  });

  it('validates selected designation ownership before returning its reporting label', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'designation-1',
          name: 'Building Fund',
          code: 'building-fund',
          restriction_type: 'temporarily_restricted',
        },
      ],
    });

    await expect(
      service.resolveDesignationInput({
        organizationId: 'org-1',
        designationId: 'designation-1',
        designationName: 'ignored legacy label',
      })
    ).resolves.toEqual({
      designation_id: 'designation-1',
      designation: 'Building Fund',
      designation_code: 'building-fund',
      designation_restriction_type: 'temporarily_restricted',
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('organization_id = $2'), [
      'designation-1',
      'org-1',
      null,
    ]);
  });

  it('allows the current inactive designation when preserving an existing link', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'designation-1',
          name: 'Legacy Building Fund',
          code: 'legacy-building-fund',
          restriction_type: 'temporarily_restricted',
        },
      ],
    });

    await expect(
      service.resolveDesignationInput({
        organizationId: 'org-1',
        designationId: 'designation-1',
        allowInactiveDesignationId: 'designation-1',
      })
    ).resolves.toEqual({
      designation_id: 'designation-1',
      designation: 'Legacy Building Fund',
      designation_code: 'legacy-building-fund',
      designation_restriction_type: 'temporarily_restricted',
    });

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('OR id = $3'), [
      'designation-1',
      'org-1',
      'designation-1',
    ]);
  });

  it('rejects typed designation ids when organization context is unavailable', async () => {
    await expect(
      service.resolveDesignationInput({
        designationId: 'designation-1',
      })
    ).rejects.toThrow('Donation designation organization context is required');

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('creates a typed designation from a legacy free-text label', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'designation-2',
            name: 'Clinic Expansion',
            code: 'clinic-expansion',
            restriction_type: 'unrestricted',
          },
        ],
      });

    const result = await service.resolveDesignationInput({
      organizationId: 'org-1',
      userId: 'user-1',
      designationName: ' Clinic Expansion ',
    });

    expect(result).toEqual({
      designation_id: 'designation-2',
      designation: 'Clinic Expansion',
      designation_code: 'clinic-expansion',
      designation_restriction_type: 'unrestricted',
    });
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO fund_designations'),
      ['org-1', 'clinic-expansion', 'Clinic Expansion', 'user-1']
    );
  });

  it('preserves text labels when organization context is unavailable', async () => {
    const result = await service.resolveDesignationInput({
      designationName: 'Legacy Fund',
    });

    expect(result).toEqual({
      designation_id: null,
      designation: 'Legacy Fund',
      designation_code: null,
      designation_restriction_type: null,
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
