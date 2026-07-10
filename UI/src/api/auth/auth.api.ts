import { api } from '../axios';

export type Role = 'SUPERADMIN' | 'ADMIN' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  role: Role;
  customerId: string | null;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const { data } = await api.post<LoginResult>('/auth/login', { email, password });
  return data;
};

export const getMe = async (): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
};

export const getUsers = async (): Promise<AuthUser[]> => {
  const { data } = await api.get<AuthUser[]>('/auth/users');
  return data;
};

export const registerAccount = async (
  email: string,
  password: string,
  role: 'ADMIN' | 'CUSTOMER',
  name?: string,
  customerId?: string,
): Promise<AuthUser> => {
  const { data } = await api.post<AuthUser>('/auth/register', { email, password, name, role, customerId });
  return data;
};
