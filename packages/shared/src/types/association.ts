export type AssociationStatus = 'pending' | 'active' | 'inactive' | 'rejected';

export interface IPatientDoctor {
  _id: string;
  patientId: string;
  doctorId: string;
  patientName?: string;
  doctorName?: string;
  status: AssociationStatus;
  sharedMeasurementTypes?: string[];
  assignedBy: string;
  assignedAt: string;
}

export interface AssignDoctorRequest {
  patientId: string;
  doctorId: string;
}
