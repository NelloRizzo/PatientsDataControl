export interface PrescriptionTime {
  time: string;
  daysOfWeek?: number[];
}

export interface IPrescription {
  _id: string;
  patientId: string;
  doctorId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  schedule: PrescriptionTime[];
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IMedicationLog {
  _id: string;
  prescriptionId: string;
  patientId: string;
  takenAt: string;
  scheduledTime: string;
  notes?: string;
}
