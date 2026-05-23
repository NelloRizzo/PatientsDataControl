import nodemailer from 'nodemailer';
import type { ChannelConfig } from '@healthbridge/shared';
import type { NotificationMessage, NotificationChannel } from './channelInterface.js';
import { env } from '../../config/env.js';

let etherealTransporter: any = null;

async function getEtherealTransport() {
  if (etherealTransporter) return etherealTransporter;
  const account = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  });
  console.log('[EmailChannel] Ethereal account created:', account.user);
  return etherealTransporter;
}

function getTransport(settings?: Record<string, any>) {
  const s = settings ?? {};

  if (s.host) {
    return nodemailer.createTransport({
      host: s.host,
      port: s.port || 587,
      secure: s.secure || false,
      auth: s.auth || undefined,
    });
  }

  if (env.email.user && env.email.pass) {
    return nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: { user: env.email.user, pass: env.email.pass },
    });
  }

  return getEtherealTransport();
}

export const emailChannel: NotificationChannel = {
  type: 'email',

  async send(message: NotificationMessage, config: ChannelConfig): Promise<boolean> {
    try {
      const transport = await getTransport(config.settings);
      const from = config.settings?.from || env.email.from;

      const info = await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });

      if (info.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log('[EmailChannel] Preview URL:', previewUrl);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('[EmailChannel] Send failed:', error);
      return false;
    }
  },
};
