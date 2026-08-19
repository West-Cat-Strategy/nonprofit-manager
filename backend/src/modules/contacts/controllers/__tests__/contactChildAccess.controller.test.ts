import { createContactPhonesController } from '../phones.controller';
import { createContactRelationshipsController } from '../relationships.controller';

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('contact child controller organization access', () => {
  it('does not create a phone for a contact outside the active directory scope', async () => {
    const useCase = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const directoryUseCase = { getById: jest.fn().mockResolvedValue(null) };
    const controller = createContactPhonesController(useCase as never, directoryUseCase as never);
    const res = createResponse();

    await controller.createContactPhone(
      {
        user: { id: 'user-1', role: 'admin' },
        params: { contactId: 'other-org-contact' },
        body: { phone_number: '5551234567', phone_type: 'mobile' },
      } as never,
      res as never,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(useCase.create).not.toHaveBeenCalled();
  });

  it('validates both contacts before creating a relationship', async () => {
    const useCase = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const directoryUseCase = {
      getById: jest
        .fn()
        .mockResolvedValueOnce({ contact_id: 'contact-1' })
        .mockResolvedValueOnce(null),
    };
    const controller = createContactRelationshipsController(
      useCase as never,
      directoryUseCase as never
    );
    const res = createResponse();

    await controller.createContactRelationship(
      {
        user: { id: 'user-1', role: 'admin' },
        params: { contactId: 'contact-1' },
        body: { related_contact_id: 'other-org-contact', relationship_type: 'support' },
      } as never,
      res as never,
      jest.fn()
    );

    expect(directoryUseCase.getById).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(useCase.create).not.toHaveBeenCalled();
  });
});
