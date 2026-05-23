import mongoose from 'mongoose';
import type { AlertStatus, ChannelConfig } from '@healthbridge/shared';

export interface IAlertTemplateDocument extends mongoose.Document {
  measurementType: string;
  status: AlertStatus;
  subject: string;
  body: string;
  channels: ChannelConfig[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const channelConfigSchema = new mongoose.Schema<ChannelConfig>(
  {
    type: { type: String, enum: ['email', 'sms', 'watchapp'], required: true },
    enabled: { type: Boolean, required: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const alertTemplateSchema = new mongoose.Schema<IAlertTemplateDocument>(
  {
    measurementType: { type: String, required: true, index: true },
    status: { type: String, enum: ['alert', 'danger', 'info'], required: true },
    subject: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 2000 },
    channels: { type: [channelConfigSchema], default: [{ type: 'email', enabled: true, settings: {} }] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

alertTemplateSchema.index({ measurementType: 1, status: 1 }, { unique: true });

export const AlertTemplate = mongoose.model<IAlertTemplateDocument>('AlertTemplate', alertTemplateSchema);
