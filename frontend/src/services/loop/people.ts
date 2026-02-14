import type { AdaptedPerson, PeopleFilter } from '../../types/schema';
import api from '../api';

interface ContactApiResponse {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  job_title?: string;
  roles?: string[];
  is_active?: boolean;
  tags?: string[];
}

interface ContactsResponse {
  data: ContactApiResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

const CARD_COLORS: AdaptedPerson['cardColor'][] = ['pink', 'cyan', 'yellow', 'gray'];

function mapRole(roles?: string[]): AdaptedPerson['role'] | undefined {
  if (!roles || roles.length === 0) return undefined;
  const primary = roles[0].toLowerCase();
  if (primary === 'staff' || primary === 'volunteer' || primary === 'board') {
    return primary as AdaptedPerson['role'];
  }
  return undefined;
}

function mapStatus(isActive?: boolean): AdaptedPerson['status'] {
  if (isActive === undefined) return 'active';
  return isActive ? 'active' : 'inactive';
}

function adaptContact(contact: ContactApiResponse, index: number): AdaptedPerson {
  const firstName = contact.first_name || 'Unknown';
  const lastName = contact.last_name || '';
  return {
    id: contact.contact_id,
    firstName,
    lastName,
    email: contact.email || '',
    phone: contact.phone || contact.mobile_phone,
    role: mapRole(contact.roles),
    status: mapStatus(contact.is_active),
    title: contact.job_title,
    fullName: `${firstName} ${lastName}`.trim(),
    cardColor: CARD_COLORS[index % CARD_COLORS.length],
  };
}

export const getPeople = async (filter?: PeopleFilter): Promise<AdaptedPerson[]> => {
  const params: Record<string, string> = { limit: '100' };

  if (filter?.role) {
    params.role = filter.role;
  }
  if (filter?.query && filter.query.trim() !== '') {
    params.search = filter.query.trim();
  }

  const response = await api.get<ContactsResponse>('/contacts', { params });
  const contacts = response.data.data || [];

  let people = contacts.map((c, i) => adaptContact(c, i));

  // Client-side status filter since backend doesn't support it directly
  if (filter?.status) {
    people = people.filter((p) => p.status === filter.status);
  }

  return people;
};

export const updatePerson = async (
  id: string,
  data: Partial<AdaptedPerson>
): Promise<AdaptedPerson> => {
  const payload: Record<string, unknown> = {};
  if (data.firstName !== undefined) payload.first_name = data.firstName;
  if (data.lastName !== undefined) payload.last_name = data.lastName;
  if (data.email !== undefined) payload.email = data.email;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.title !== undefined) payload.job_title = data.title;

  const response = await api.put<{ data: ContactApiResponse }>(`/contacts/${id}`, payload);
  return adaptContact(response.data.data, 0);
};

export const createPerson = async (
  data: Omit<AdaptedPerson, 'id' | 'fullName'>
): Promise<AdaptedPerson> => {
  const payload: Record<string, unknown> = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    job_title: data.title,
  };

  const response = await api.post<{ data: ContactApiResponse }>('/contacts', payload);
  return adaptContact(response.data.data, 0);
};
