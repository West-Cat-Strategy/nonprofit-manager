import type { NextFunction, Response } from 'express';
import { createVolunteersController } from '../volunteers.controller';
import { VolunteerCatalogUseCase } from '../../usecases/volunteerCatalog.usecase';
import { VolunteerImportExportUseCase } from '../../usecases/volunteerImportExport.usecase';
import { VolunteerLifecycleUseCase } from '../../usecases/volunteerLifecycle.usecase';
import type { AuthRequest } from '@middleware/auth';

const createResponse = () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  return response as unknown as Response & typeof response;
};

describe('volunteers controller background-check approval', () => {
  it('passes notes and approval dates through the dedicated approval usecase', async () => {
    const approvedVolunteer = {
      volunteer_id: 'volunteer-1',
      background_check_status: 'approved',
      background_check_date: '2026-05-06',
      background_check_expiry: '2027-05-06',
      background_check_approved_by: 'staff-1',
      background_check_approval_notes: 'Cleared after reviewing the vendor report.',
    };
    const lifecycleUseCase = {
      approveBackgroundCheck: jest.fn().mockResolvedValue(approvedVolunteer),
    } as unknown as VolunteerLifecycleUseCase;
    const controller = createVolunteersController(
      {} as VolunteerCatalogUseCase,
      lifecycleUseCase,
      {} as VolunteerImportExportUseCase
    );
    const req = {
      params: { id: 'volunteer-1' },
      body: {
        notes: 'Cleared after reviewing the vendor report.',
        background_check_date: '2026-05-06',
        background_check_expiry: '2027-05-06',
      },
      user: { id: 'staff-1' },
    } as unknown as AuthRequest;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await controller.approveVolunteerBackgroundCheck(req, res, next);

    expect(lifecycleUseCase.approveBackgroundCheck).toHaveBeenCalledWith(
      'volunteer-1',
      {
        notes: 'Cleared after reviewing the vendor report.',
        background_check_date: '2026-05-06',
        background_check_expiry: '2027-05-06',
      },
      'staff-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: approvedVolunteer,
        background_check_status: 'approved',
        background_check_approval_notes: 'Cleared after reviewing the vendor report.',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
