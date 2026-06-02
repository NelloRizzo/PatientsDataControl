import mongoose from 'mongoose';

export interface INotificationDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  category: 'info' | 'alert' | 'danger' | 'warning' | 'medicalnote' | 'medication';
  title: string;
  body: string;
  read: boolean;
  readAt: Date | null;
  referenceId: mongoose.Types.ObjectId | null;
  referenceModel: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<INotificationDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['info', 'alert', 'danger', 'warning', 'medicalnote', 'medication'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceModel: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema
);
