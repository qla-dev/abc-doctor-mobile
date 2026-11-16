import { apiRequest } from '@/lib/api';
import type { User } from '@/context/AuthContext';

export type SocialAuthResponse = {
  user: User;
  token: string;
  is_new_user: boolean;
};

export const Auth = {
  login: (email: string, password: string) =>
    apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  google: (idToken: string) =>
    apiRequest<SocialAuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    }),

  apple: (identityToken: string, fullName?: string) =>
    apiRequest<SocialAuthResponse>('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ identity_token: identityToken, full_name: fullName || undefined }),
    }),

  logout: () => apiRequest<null>('/auth/logout', { method: 'POST' }),

  me: () => apiRequest<User>('/auth/me'),
};
