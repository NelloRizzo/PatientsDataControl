import apiClient from './client';
import type {
  CreateMeasurementRequest, UpdateMeasurementRequest,
  PaginatedResponse, IMeasurement, MeasurementStats, TimeSeriesResponse,
  AggregationFunction, ExtractionResult,
} from '@healthbridge/shared';

export async function getMeasurements(params: {
  type?: string; from?: string; to?: string; page?: number; limit?: number;
}): Promise<PaginatedResponse<IMeasurement>> {
  const res = await apiClient.get('/measurements', { params });
  return res.data;
}

export async function createMeasurement(data: CreateMeasurementRequest): Promise<IMeasurement> {
  const res = await apiClient.post('/measurements', data);
  return res.data;
}

export async function getMeasurement(id: string): Promise<IMeasurement> {
  const res = await apiClient.get(`/measurements/${id}`);
  return res.data;
}

export async function updateMeasurement(id: string, data: UpdateMeasurementRequest): Promise<IMeasurement> {
  const res = await apiClient.put(`/measurements/${id}`, data);
  return res.data;
}

export async function deleteMeasurement(id: string): Promise<void> {
  await apiClient.delete(`/measurements/${id}`);
}

export async function getMeasurementStats(params: {
  type: string; from?: string; to?: string;
}): Promise<MeasurementStats> {
  const res = await apiClient.get('/measurements/stats', { params });
  return res.data;
}

export async function getTimeSeries(params: {
  type: string; groupBy?: string; fields?: string; from?: string; to?: string; aggregation?: AggregationFunction;
}): Promise<TimeSeriesResponse> {
  const res = await apiClient.get('/measurements/timeseries', { params });
  return res.data;
}

export async function extractMeasurements(file: File): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/measurements/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
