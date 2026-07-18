import { http } from '@/shared/api/http';
import { LoginResponse, PublicUser, UserRole } from './types';

export const authApi = {
  login: (username: string, password: string) =>
    http.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data),
  me: () => http.get<PublicUser>('/auth/me').then((r) => r.data),
};

export interface UserPayload {
  fullName?: string;
  username?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export const usersApi = {
  list: () => http.get<PublicUser[]>('/users').then((r) => r.data),
  create: (payload: UserPayload) => http.post<PublicUser>('/users', payload).then((r) => r.data),
  update: (id: string, payload: UserPayload) =>
    http.patch<PublicUser>(`/users/${id}`, payload).then((r) => r.data),
  remove: (id: string) => http.delete(`/users/${id}`).then((r) => r.data),
};
