import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

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
  console.log('[EmailService] Ethereal account created:', account.user);
  return etherealTransporter;
}

async function getTransport() {
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

export async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; previewUrl?: string }> {
  try {
    const transport = await getTransport();
    const info = await transport.sendMail({
      from: env.email.from,
      to,
      subject,
      text: body,
    });

    if (info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('[EmailService] Preview URL:', previewUrl);
      }
      return { success: true, previewUrl: previewUrl || undefined };
    }
    return { success: false };
  } catch (error) {
    console.error('[EmailService] Send failed:', error);
    return { success: false };
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<{ success: boolean; previewUrl?: string }> {
  const verificationUrl = `${env.appUrl}/verify-email?token=${token}`;
  const subject = 'Verify your email address — HealthBridge';
  const body = `Welcome to HealthBridge!\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`;

  const result = await sendEmail(email, subject, body);
  if (result.success) {
    console.log(`[EmailService] Verification email sent to ${email}`);
    console.log(`[EmailService] Verification URL: ${verificationUrl}`);
  }
  return result;
}
