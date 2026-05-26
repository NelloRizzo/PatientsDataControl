import apiClient from './client';
import type { IAnamnesis } from '@healthbridge/shared';

export async function getPatientAnamnesis(patientId: string): Promise<IAnamnesis[]> {
  const res = await apiClient.get(`/doctor/patients/${patientId}/anamnesis`);
  return res.data.data;
}

export async function createPatientAnamnesis(
  patientId: string,
  data: { pathologies: string; therapies: string; notes?: string; recordedAt?: string }
): Promise<IAnamnesis> {
  const res = await apiClient.post(`/doctor/patients/${patientId}/anamnesis`, data);
  return res.data.data;
}

export async function getMyAnamnesis(): Promise<IAnamnesis[]> {
  const res = await apiClient.get('/patient/anamnesis');
  return res.data.data;
}
