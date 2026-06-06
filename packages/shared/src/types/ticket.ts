export type TicketType = 'suggestion' | 'bug_report' | 'registration_request';
export type TicketSeverity = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'in_review' | 'in_progress' | 'resolved' | 'closed';

export type RequestedRole = 'doctor' | 'nurse' | 'patient';

export interface ITicket {
  _id: string;
  ticketNumber: string;
  userId?: string;
  type: TicketType;
  title: string;
  description: string;
  page?: string;
  severity?: TicketSeverity;
  status: TicketStatus;
  assigneeId?: string;
  adminNotes?: string;
  requesterEmail?: string;
  requestedRole?: RequestedRole;
  annotation?: string;
  createdAt: string;
  updatedAt: string;
}
