export interface IPatientDoctor {
  _id: string;
  patientId: string;
  doctorId: string;
  patientName?: string;
  doctorName?: string;
  status: 'active' | 'inactive';
  assignedBy: string;
  assignedAt: string;
}

export interface AssignDoctorRequest {
  patientId: string;
  doctorId: string;
}
