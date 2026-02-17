import type { UserProfile } from '../../types/schema';
import api from '../api';

export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await api.get<UserProfile>('/auth/profile');
  return response.data;
};

export const updateUserProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
  const response = await api.put<UserProfile>('/auth/profile', data);
  return response.data;
};
