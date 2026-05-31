export interface IAnamnesisSection {
  entries: string[];
}

export interface IAnamnesis {
  _id: string;
  patientId: string;
  recordedAt: string;
  fisiologica?: IAnamnesisSection;
  familiare?: IAnamnesisSection;
  farmacologica?: IAnamnesisSection;
  patologicaRemota?: IAnamnesisSection;
  patologicaProssima?: IAnamnesisSection;
  sociale?: IAnamnesisSection;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
