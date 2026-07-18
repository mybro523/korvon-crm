export type UserRole = 'OWNER' | 'SELLER';

export interface PublicUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}
