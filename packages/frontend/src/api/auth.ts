import apiClient from './client';
import type { LoginRequest, RegisterRequest, AuthResponse, IUser } from '@healthbridge/shared';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/register', data);
  return res.data;
}

export async function getMe(): Promise<IUser> {
  const res = await apiClient.get('/auth/me');
  return res.data.user;
}
