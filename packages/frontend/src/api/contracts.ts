import apiClient from './client';

export type FeeType = 'fixed' | 'monthly' | 'per_patient';

export interface ContractData {
  _id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  startDate: string;
  endDate: string;
  maxPatients: number;
  fee: number;
  feeType: FeeType;
  currency: string;
  notes?: string;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
}

export interface ContractReportContract {
  _id: string;
  startDate: string;
  endDate: string;
  maxPatients: number;
  fee: number;
  feeType: FeeType;
  currency: string;
  status: string;
  overlapMonths: number;
  totalFee: number;
  consumedFee: number;
}

export interface ContractReportRow {
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  contracts: ContractReportContract[];
  actualPeakPatients: number;
  actualAvgPatients: number;
  totalFeeOwed: number;
  totalContractFee: number;
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

export async function invoiceContract(id: string) {
  const res = await apiClient.put(`/admin/contracts/${id}/invoice`);
  return res.data;
}

export interface ContractStatus {
  contractId: string;
  feeType: FeeType;
  fee: number;
  maxPatients: number;
  lastInvoiceDate: string | null;
  sinceDate: string;
  consumedSinceInvoice: number;
  currency: string;
  startDate: string;
  endDate: string;
}

export async function getMyContractStatus() {
  const res = await apiClient.get('/doctor/contract-status');
  return res.data.data as ContractStatus | null;
}

export async function getContractReport(from: string, to: string) {
  const res = await apiClient.get('/admin/contracts/report', { params: { from, to } });
  return res.data;
}
