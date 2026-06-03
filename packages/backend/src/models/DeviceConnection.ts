import mongoose from 'mongoose';
import type { DeviceProvider } from '@healthbridge/shared';

export type OAuthType = 'fitbit' | 'google';

export interface IDeviceConnectionDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  provider: DeviceProvider;
  oauthType: OAuthType;
  name: string;
  accessToken: string;
  refreshToken?: string;
  active: boolean;
  lastSync?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceConnectionSchema = new mongoose.Schema<IDeviceConnectionDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['fitbit', 'google_fit', 'google_health', 'apple_health', 'garmin', 'custom'],
    },
    oauthType: { type: String, enum: ['fitbit', 'google'], default: 'fitbit' },
    name: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: String,
    active: { type: Boolean, default: true },
    lastSync: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

deviceConnectionSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.accessToken;
    delete ret.refreshToken;
    return ret;
  },
});

export const DeviceConnection = mongoose.model<IDeviceConnectionDocument>(
  'DeviceConnection',
  deviceConnectionSchema
);
