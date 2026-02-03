import type { Role } from '@prisma/client';

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedUserWithRefreshToken extends AuthenticatedUser {
  refreshToken: string;
}
