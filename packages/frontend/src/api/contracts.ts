import apiClient from './client';

export interface ContractData {
  _id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  startDate: string;
  endDate: string;
  maxPatients: number;
  fee: number;
  currency: string;
  notes?: string;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
}

export interface ContractReportRow {
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  contracts: Array<{
    _id: string;
    startDate: string;
    endDate: string;
    maxPatients: number;
    fee: number;
    currency: string;
    status: string;
  }>;
  actualPeakPatients: number;
  actualAvgPatients: number;
  totalFeeOwed: number;
  currency: string;
}

export async function getContracts(params?: Record<string, string>) {
  const res = await apiClient.get('/admin/contracts', { params });
  return res.data;
}

export async function createContract(data: Record<string, any>) {
  const res = await apiClient.post('/admin/contracts', data);
  return res.data.data;
}

export async function updateContract(id: string, data: Record<string, any>) {
  const res = await apiClient.put(`/admin/contracts/${id}`, data);
  return res.data.data;
}

export async function deleteContract(id: string) {
  await apiClient.delete(`/admin/contracts/${id}`);
}

export async function getContractReport(from: string, to: string) {
  const res = await apiClient.get('/admin/contracts/report', { params: { from, to } });
  return res.data;
}
