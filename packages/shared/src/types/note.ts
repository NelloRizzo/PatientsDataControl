export interface IPatientNote {
  _id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  content: string;
  showToPatient: boolean;
  patientNotified: boolean;
  createdAt: string;
  updatedAt: string;
}
