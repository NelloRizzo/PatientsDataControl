import type { ChannelConfig } from '../../../../shared/dist/index.js';

export interface NotificationMessage {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationChannel {
  type: string;
  send(message: NotificationMessage, config: ChannelConfig): Promise<boolean>;
}
