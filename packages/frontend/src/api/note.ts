import apiClient from './client';
import type { IPatientNote } from '@healthbridge/shared';

export async function getMyNotes(): Promise<IPatientNote[]> {
  const res = await apiClient.get('/patient/notes');
  return res.data.data;
}
