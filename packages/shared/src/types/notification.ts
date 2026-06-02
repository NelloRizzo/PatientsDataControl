export type NotificationCategory = 'info' | 'alert' | 'danger' | 'warning' | 'medicalnote' | 'medication';

export interface INotification {
  _id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  readAt: string | null;
  referenceId: string | null;
  referenceModel: string | null;
  createdAt: string;
  updatedAt: string;
}
