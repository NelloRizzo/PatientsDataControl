export interface ExtractedField {
  key: string;
  value: number;
  unit: string;
  confidence: number; // 0–100
  alertStatus?: 'normal' | 'alert' | 'danger';
  alertMessage?: string;
  name?: string;
}

export interface ExtractionResult {
  type: string;
  typeName: string;
  fields: ExtractedField[];
  notes?: string;
  overallConfidence: number; // 0–100
  isNew?: boolean;
}

export interface ExtractionWarning {
  fieldKey: string;
  fieldName: string;
  value: number;
  threshold: string;
  status: 'alert' | 'danger';
  message: string;
}
