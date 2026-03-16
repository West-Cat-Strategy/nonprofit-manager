import { ContactCommunicationsUseCase } from '../usecases/contactCommunications.usecase';
import type { ContactCommunicationsPort } from '../types/ports';

const createRepositoryMock = (): jest.Mocked<ContactCommunicationsPort> => ({
  list: jest.fn(),
});

describe('ContactCommunicationsUseCase', () => {
  it('delegates communication listing to the repository', async () => {
    const repository = createRepositoryMock();
    repository.list.mockResolvedValueOnce({
      items: [],
      total: 0,
      filters: { limit: 50 },
    });

    const useCase = new ContactCommunicationsUseCase(repository);
    const result = await useCase.list('contact-1', { limit: 50 });

    expect(repository.list).toHaveBeenCalledWith('contact-1', { limit: 50 });
    expect(result).toEqual({
      items: [],
      total: 0,
      filters: { limit: 50 },
    });
  });
});
