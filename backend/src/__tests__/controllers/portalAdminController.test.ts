import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { deletePortalAdminAppointmentSlot } from '../../modules/portalAdmin/controllers/portalAdminController';
import { deleteAppointmentSlot } from '@modules/portalAdmin/services/portalAppointmentSlotService';

jest.mock('@modules/portalAdmin/services/portalAppointmentSlotService', () => ({
  __esModule: true,
  deleteAppointmentSlot: jest.fn(),
  checkInAppointmentByStaff: jest.fn(),
  createAppointmentSlot: jest.fn(),
  getAppointmentById: jest.fn(),
  listAdminAppointments: jest.fn(),
  listAdminAppointmentSlots: jest.fn(),
  updateAppointmentSlot: jest.fn(),
  updateAppointmentStatusByStaff: jest.fn(),
}));

describe('portalAdminController', () => {
  const deleteAppointmentSlotMock = deleteAppointmentSlot as jest.MockedFunction<typeof deleteAppointmentSlot>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 204 with no body for successful slot deletion', async () => {
    deleteAppointmentSlotMock.mockResolvedValueOnce(true);

    const req = {
      params: { slotId: 'slot-1' },
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    } as unknown as AuthRequest;
    const res = createMockResponse();
    const next = jest.fn();

    await deletePortalAdminAppointmentSlot(req, res as unknown as Response, next);

    expect(deleteAppointmentSlotMock).toHaveBeenCalledWith('slot-1');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });
});

const createMockResponse = () => {
  const res: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn().mockReturnValue(undefined);
  return res;
};
