import mongoose from 'mongoose';

export interface ITicketDocument extends mongoose.Document {
  ticketNumber: string;
  userId: mongoose.Types.ObjectId;
  type: 'suggestion' | 'bug_report';
  title: string;
  description: string;
  page: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'in_review' | 'in_progress' | 'resolved' | 'closed';
  assigneeId: mongoose.Types.ObjectId | null;
  adminNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new mongoose.Schema<ITicketDocument>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['suggestion', 'bug_report'],
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
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ userId: 1, createdAt: -1 });

export const Ticket = mongoose.model<ITicketDocument>('Ticket', ticketSchema);
