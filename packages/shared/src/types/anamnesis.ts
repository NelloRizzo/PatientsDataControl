export interface IAnamnesis {
  _id: string;
  patientId: string;
  recordedAt: string;
  pathologies: string;
  therapies: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
