import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Pool } from 'pg';
import { VolunteerImportExportUseCase } from '../usecases/volunteerImportExport.usecase';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

const buildExportRow = (overrides: Record<string, unknown> = {}) => ({
  volunteer_id: '22222222-2222-4222-8222-222222222222',
  contact_id: '33333333-3333-4333-8333-333333333333',
  account_id: ORGANIZATION_ID,
  account_number: 'ORG-1',
  account_name: 'Test Organization',
  first_name: 'Val',
  preferred_name: null,
  last_name: 'Volunteer',
  email: 'val@example.com',
  phone: '555-111-2222',
  mobile_phone: null,
  tags: ['community'],
  roles: ['volunteer'],
  skills: ['Driving', 'First Aid'],
  availability_status: 'available',
  availability_notes: 'Weekdays',
  background_check_status: 'approved',
  background_check_date: '2026-01-01',
  background_check_expiry: '2027-01-01',
  preferred_roles: ['Support'],
  certifications: ['CPR'],
  max_hours_per_week: 10,
  emergency_contact_name: 'Alex Example',
  emergency_contact_phone: '555-111-0000',
  emergency_contact_relationship: 'Sibling',
  volunteer_since: '2025-01-01',
  total_hours_logged: 12,
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

describe('VolunteerImportExportUseCase', () => {
  let mockQuery: jest.Mock;
  let useCase: VolunteerImportExportUseCase;

  beforeEach(() => {
    mockQuery = jest.fn();
    useCase = new VolunteerImportExportUseCase({ query: mockQuery } as unknown as Pool);
  });

  it('keeps volunteer_id, contact_id, and email when custom export columns are requested', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [buildExportRow()],
    });

    const file = await useCase.exportVolunteers(
      { format: 'csv', columns: ['skills'] },
      ORGANIZATION_ID
    );
    const [header] = file.buffer.toString('utf8').trim().split(/\r?\n/);

    expect(header.split(',')).toEqual(['volunteer_id', 'contact_id', 'email', 'skills']);
  });

  it('omits derived columns from the import template', async () => {
    const file = await useCase.getImportTemplate('csv');
    const [header] = file.buffer.toString('utf8').trim().split(/\r?\n/);
    const columns = header.split(',');

    expect(columns).not.toContain('account_name');
    expect(columns).not.toContain('created_at');
    expect(columns).not.toContain('updated_at');
    expect(columns).not.toContain('volunteer_since');
    expect(columns).not.toContain('total_hours_logged');
  });
});
