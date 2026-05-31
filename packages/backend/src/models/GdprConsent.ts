import mongoose from 'mongoose';

export interface IGdprConsentDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: 'privacy_policy' | 'data_sharing';
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const gdprConsentSchema = new mongoose.Schema<IGdprConsentDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['privacy_policy', 'data_sharing'],
      required: true,
    },
    granted: {
      type: Boolean,
      required: true,
    },
    grantedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  { timestamps: true }
);

gdprConsentSchema.index({ userId: 1, type: 1, grantedAt: -1 });

export const GdprConsent = mongoose.model<IGdprConsentDocument>(
  'GdprConsent',
  gdprConsentSchema
);
