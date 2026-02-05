import type { AdaptedPerson, PeopleFilter } from '../../types/schema';
import { mockPeople } from '../../utils/mockData';
import { adaptMockPeople } from '../../utils/dataAdapter';
import { delay, SIMULATED_LATENCY } from './latency';

export const getPeople = async (filter?: PeopleFilter): Promise<AdaptedPerson[]> => {
  await delay(SIMULATED_LATENCY);

  let people = adaptMockPeople(mockPeople);

  if (filter?.role) {
    people = people.filter((person) => person.role === filter.role);
  }

  if (filter?.query && filter.query.trim() !== '') {
    const query = filter.query.toLowerCase();
    people = people.filter(
      (person) =>
        person.firstName.toLowerCase().includes(query) ||
        person.lastName.toLowerCase().includes(query) ||
        person.email.toLowerCase().includes(query)
    );
  }

  if (filter?.status) {
    people = people.filter((person) => person.status === filter.status);
  }

  console.log('[LoopApiService] getPeople:', { filter, resultCount: people.length });
  return people;
};

export const updatePerson = async (
  id: string,
  data: Partial<AdaptedPerson>
): Promise<AdaptedPerson> => {
  await delay(SIMULATED_LATENCY);

  const mockPerson = mockPeople.find((person) => person.id === id);
  if (!mockPerson) {
    throw new Error(`Person with id ${id} not found`);
  }

  const updated = { ...mockPerson, ...data };
  console.log('[LoopApiService] updatePerson:', { id, data, updated });

  return adaptMockPeople([updated])[0];
};

export const createPerson = async (
  data: Omit<AdaptedPerson, 'id' | 'fullName'>
): Promise<AdaptedPerson> => {
  await delay(SIMULATED_LATENCY);

  const newPerson: AdaptedPerson = {
    ...data,
    id: `person-${Date.now()}`,
    fullName: `${data.firstName} ${data.lastName}`,
  };

  console.log('[LoopApiService] createPerson:', newPerson);
  return newPerson;
};
