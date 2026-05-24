import apiClient from './client';
import type { IMeasurementTypeConfig } from '../../../shared/dist/index.js';

export async function getMeasurementTypes(): Promise<IMeasurementTypeConfig[]> {
  const res = await apiClient.get('/measurement-types');
  return res.data.data;
}

export async function getAllMeasurementTypes(): Promise<IMeasurementTypeConfig[]> {
  const res = await apiClient.get('/measurement-types/all');
  return res.data.data;
}

export async function createMeasurementType(data: Partial<IMeasurementTypeConfig>): Promise<IMeasurementTypeConfig> {
  const res = await apiClient.post('/measurement-types', data);
  return res.data;
}

export async function updateMeasurementType(key: string, data: Partial<IMeasurementTypeConfig>): Promise<IMeasurementTypeConfig> {
  const res = await apiClient.put(`/measurement-types/${key}`, data);
  return res.data;
}

export async function deleteMeasurementType(key: string): Promise<void> {
  await apiClient.delete(`/measurement-types/${key}`);
}
