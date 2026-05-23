export type AlertStatus = 'alert' | 'danger' | 'info';

export type FieldSummary = { key: string; value: number; unit: string };
export type NotificationChannelType = 'email' | 'sms' | 'watchapp';

export interface ChannelConfig {
  type: NotificationChannelType;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface IAlertTemplate {
  _id: string;
  measurementType: string;
  status: AlertStatus;
  subject: string;
  body: string;
  channels: ChannelConfig[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAlertLog {
  _id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  measurementId: string;
  measurementType: string;
  status: AlertStatus;
  field: string;
  value: number;
  unit: string;
  message: string;
  channel: NotificationChannelType;
  delivered: boolean;
  sentAt: string;
}
