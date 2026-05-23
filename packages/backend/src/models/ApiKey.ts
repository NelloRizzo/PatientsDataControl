import mongoose from 'mongoose';

export interface IApiKeyDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  key: string;
  active: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new mongoose.Schema<IApiKeyDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    lastUsed: Date,
  },
  { timestamps: true }
);

apiKeySchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.key;
    return ret;
  },
});

export const ApiKey = mongoose.model<IApiKeyDocument>('ApiKey', apiKeySchema);
