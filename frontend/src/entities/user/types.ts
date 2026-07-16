export type UserRole = 'OWNER' | 'SELLER';

export interface PublicUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  pointId: string | null;
  point: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}
