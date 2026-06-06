import mongoose from 'mongoose';

export interface ITicketDocument extends mongoose.Document {
  ticketNumber: string;
  userId: mongoose.Types.ObjectId | null;
  type: 'suggestion' | 'bug_report' | 'registration_request';
  title: string;
  description: string;
  page: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'in_review' | 'in_progress' | 'resolved' | 'closed';
  assigneeId: mongoose.Types.ObjectId | null;
  adminNotes: string;
  requesterEmail?: string;
  requestedRole?: 'doctor' | 'nurse' | 'patient';
  annotation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new mongoose.Schema<ITicketDocument>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['suggestion', 'bug_report', 'registration_request'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    page: { type: String, default: '' },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminNotes: { type: String, default: '', maxlength: 2000 },
    requesterEmail: { type: String, trim: true, lowercase: true },
    requestedRole: {
      type: String,
      enum: ['doctor', 'nurse', 'patient'],
    },
    annotation: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ userId: 1, createdAt: -1 });

export const Ticket = mongoose.model<ITicketDocument>('Ticket', ticketSchema);
