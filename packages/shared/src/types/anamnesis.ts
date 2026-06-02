export interface IAnamnesisSection {
  entries: string[];
}

export interface IFarmacologicaEntry {
  text: string;
  isCurrent: boolean;
}

export interface IFarmacologicaSection {
  entries: IFarmacologicaEntry[];
}

export interface IAnamnesis {
  _id: string;
  patientId: string;
  recordedAt: string;
  fisiologica?: IAnamnesisSection;
  familiare?: IAnamnesisSection;
  farmacologica?: IFarmacologicaSection;
  patologicaRemota?: IAnamnesisSection;
  patologicaProssima?: IAnamnesisSection;
  sociale?: IAnamnesisSection;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
