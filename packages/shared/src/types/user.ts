export type UserRole = 'patient' | 'doctor' | 'analyst' | 'admin' | 'nurse';

export interface Address {
  full: string;
  city: string;
  province: string;
  region: string;
  country: string;
  zip?: string;
}

export interface IUser {
  _id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  role: UserRole;
  unitSystem: 'metric' | 'imperial';
  specialty?: string;
  birthDate?: string;
  sex?: 'male' | 'female' | 'other';
  birthCity?: string;
  homeAddress?: Address;
  legalAddress?: Address;
  maxPatients?: number;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'doctor' | 'analyst';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: IUser;
  tokens: AuthTokens;
}
