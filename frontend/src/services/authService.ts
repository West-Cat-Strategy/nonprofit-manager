import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profilePicture?: string | null;
  };
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  method: 'totp';
  mfaToken: string;
  user: AuthResponse['user'];
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  completeTotpLogin: async (params: {
    email: string;
    mfaToken: string;
    code: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/2fa', params);
    return response.data;
  },

  passkeyLoginOptions: async (email: string): Promise<{ challengeId: string; options: unknown }> => {
    const response = await api.post<{ challengeId: string; options: unknown }>(
      '/auth/passkeys/login/options',
      { email }
    );
    return response.data;
  },

  passkeyLoginVerify: async (params: {
    email: string;
    challengeId: string;
    credential: unknown;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/passkeys/login/verify', params);
    return response.data;
  },

  register: async (
    data: RegisterData
  ): Promise<{ message: string; user: AuthResponse['user'] }> => {
    const response = await api.post<{ message: string; user: AuthResponse['user'] }>(
      '/auth/register',
      data
    );
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};
