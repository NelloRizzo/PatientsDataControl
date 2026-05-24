import apiClient from './client';
import type { IChartConfig, CreateChartConfigRequest } from '../../../shared/dist/index.js';

export async function getChartConfigs(): Promise<IChartConfig[]> {
  const res = await apiClient.get('/chart-configs');
  return res.data.data;
}

export async function createChartConfig(data: CreateChartConfigRequest): Promise<IChartConfig> {
  const res = await apiClient.post('/chart-configs', data);
  return res.data;
}

export async function updateChartConfig(id: string, data: Partial<CreateChartConfigRequest>): Promise<IChartConfig> {
  const res = await apiClient.put(`/chart-configs/${id}`, data);
  return res.data;
}

export async function deleteChartConfig(id: string): Promise<void> {
  await apiClient.delete(`/chart-configs/${id}`);
}
