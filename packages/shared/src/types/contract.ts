export type FeeType = 'fixed' | 'monthly' | 'per_patient';

export type ContractStatus = 'active' | 'expired' | 'cancelled';

export interface IContract {
  _id: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  maxPatients: number;
  fee: number;
  feeType: FeeType;
  currency: string;
  notes?: string;
  status: ContractStatus;
}
