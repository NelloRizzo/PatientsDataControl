export type TicketType = 'suggestion' | 'bug_report';
export type TicketSeverity = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'in_review' | 'in_progress' | 'resolved' | 'closed';

export interface ITicket {
  _id: string;
  ticketNumber: string;
  userId: string;
  type: TicketType;
  title: string;
  description: string;
  page?: string;
  severity?: TicketSeverity;
  status: TicketStatus;
  assigneeId?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}
