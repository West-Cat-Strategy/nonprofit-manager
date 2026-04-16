import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  passwordConfirm: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token?: string;
  csrfToken?: string;
  organizationId?: string | null;
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
  organizationId?: string | null;
  user: AuthResponse['user'];
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;
export type AuthUser = AuthResponse['user'];

export interface RegisterResponse {
  message: string;
  token?: string;
  csrfToken?: string;
  user?: AuthUser;
  organizationId?: string | null;
  pendingApproval?: boolean;
  registrationToken?: string | null;
  passkeySetupAllowed?: boolean;
  hasStagedPasskeys?: boolean;
}

export type CurrentUserResponse = AuthUser & {
  organizationId: string | null;
  createdAt?: string;
};

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
    const response = await api.post<AuthResponse>('/auth/login/2fa', {
      ...params,
      token: params.code,
    });
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

  pendingPasskeyRegistrationOptions: async (params: {
    registrationToken: string;
    email: string;
  }): Promise<{ challengeId: string; options: unknown }> => {
    const response = await api.post<{ challengeId: string; options: unknown }>(
      '/auth/passkeys/pending/options',
      params
    );
    return response.data;
  },

  pendingPasskeyRegistrationVerify: async (params: {
    registrationToken: string;
    challengeId: string;
    credential: unknown;
    name?: string | null;
  }): Promise<{ message?: string; hasStagedPasskeys?: boolean }> => {
    const response = await api.post<{ message?: string; hasStagedPasskeys?: boolean }>(
      '/auth/passkeys/pending/verify',
      params
    );
    return response.data;
  },

  register: async (
    data: RegisterData
  ): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>(
      '/auth/register',
      data
    );
    return response.data;
  },

  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    const response = await api.get<CurrentUserResponse>('/auth/me');
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};
