import { AlertTemplate } from '../models/AlertTemplate.js';
import { AlertLog } from '../models/AlertLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { emailChannel } from './channels/emailChannel.js';
import type { FieldEvaluation, NotificationChannelType, FieldSummary } from '@healthbridge/shared';
import type { NotificationChannel } from './channels/channelInterface.js';

const channelRegistry: Record<string, NotificationChannel> = {
  email: emailChannel,
};

export function registerChannel(channel: NotificationChannel) {
  channelRegistry[channel.type] = channel;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
}

export async function processAlert(
  patientId: string,
  measurementId: string,
  measurementType: string,
  evaluation: FieldEvaluation[],
  measurementValues: Record<string, number>
): Promise<void> {
  const alertFields = evaluation.filter((f) => f.status !== 'normal');
  if (alertFields.length === 0) return;

  const [patient, doctors] = await Promise.all([
    User.findById(patientId).lean(),
    PatientDoctor.find({ patientId, status: 'active' }).populate('doctorId', 'name email').lean(),
  ]);

  if (!patient || doctors.length === 0) return;

  for (const field of alertFields) {
    const template = await AlertTemplate.findOne({
      measurementType,
      status: field.status,
      active: true,
    }).lean();

    if (!template) continue;

    const vars: Record<string, string> = {
      patientName: patient.name,
      patientEmail: patient.email,
      fieldName: field.key,
      value: String(field.value),
      unit: field.unit || '',
      thresholdMin: String(field.status === 'danger' ? (field.dangerMin ?? '') : (field.alertMin ?? '')),
      thresholdMax: String(field.status === 'danger' ? (field.dangerMax ?? '') : (field.alertMax ?? '')),
      measurementType,
    };

    const subject = fillTemplate(template.subject, vars);
    const body = fillTemplate(template.body, vars);

    for (const doctorAssoc of doctors) {
      const doctor = doctorAssoc.doctorId as any;
      if (!doctor?.email) continue;

      // In-app notification for the doctor
      await Notification.create({
        userId: doctor._id,
        category: field.status === 'danger' ? 'danger' : 'alert',
        title: `Alert ${measurementType} — ${field.key}`,
        body: `${field.key}: ${field.value} ${field.unit || ''} (${field.status === 'danger' ? 'Critico' : 'Fuori range'})`,
        referenceId: measurementId,
        referenceModel: 'Measurement',
      });

      for (const channelCfg of template.channels) {
        if (!channelCfg.enabled) continue;

        const channel = channelRegistry[channelCfg.type];
        if (!channel) continue;

        const delivered = await channel.send(
          { to: doctor.email, subject, body },
          channelCfg
        );

        await AlertLog.create({
          patientId,
          doctorId: doctor._id,
          measurementId,
          measurementType,
          status: field.status,
          field: field.key,
          value: field.value,
          unit: field.unit || '',
          message: `${subject}\n\n${body}`,
          channel: channelCfg.type as NotificationChannelType,
          delivered,
        });
      }
    }
  }

  for (const field of alertFields) {
    const category = field.status === 'danger' ? 'danger' : 'alert';
    await Notification.create({
      userId: patientId,
      category,
      title: `${measurementType}: ${field.status === 'danger' ? 'Critico' : 'Avviso'} — ${field.key}`,
      body: `${field.key}: ${field.value} ${field.unit || ''}`,
      referenceId: measurementId,
      referenceModel: 'Measurement',
    });
  }
}

export async function sendInfoNotification(
  patientId: string,
  measurementId: string,
  measurementType: string,
  measurementValues: Record<string, number>,
  typeConfig: any
): Promise<void> {
  const typeName = typeConfig?.name || measurementType;
  const fields: FieldSummary[] = typeConfig?.fields
    ? typeConfig.fields.map((f: any) => ({
        key: f.key,
        value: measurementValues[f.key],
        unit: measurementValues[f.key] != null ? (f.unit || '') : undefined,
      })).filter((f: FieldSummary) => f.value != null)
    : Object.entries(measurementValues).map(([k, v]) => ({ key: k, value: v, unit: '' }));

  if (fields.length === 0) return;

  const fieldSummary = fields.map((f) => `${f.key}: ${f.value}${f.unit ? ' ' + f.unit : ''}`).join(', ');

  const [patient, doctors] = await Promise.all([
    User.findById(patientId).lean(),
    PatientDoctor.find({ patientId, status: 'active', notifyOnNewMeasurement: true }).populate('doctorId', 'name email').lean(),
  ]);

  if (!patient || doctors.length === 0) return;

  const template = await AlertTemplate.findOne({
    measurementType,
    status: 'info',
    active: true,
  }).lean();

  if (!template) return;

  const vars: Record<string, string> = {
    patientName: patient.name,
    patientEmail: patient.email,
    fieldSummary,
    measurementType: typeName,
  };

  const subject = fillTemplate(template.subject, vars);
  const body = fillTemplate(template.body, vars);

  for (const doctorAssoc of doctors) {
    const doctor = doctorAssoc.doctorId as any;
    if (!doctor?.email) continue;

    // In-app notification for the doctor
    await Notification.create({
      userId: doctor._id,
      category: 'info',
      title: `Nuova misura: ${typeName}`,
      body: fieldSummary,
      referenceId: measurementId,
      referenceModel: 'Measurement',
    });

    for (const channelCfg of template.channels) {
      if (!channelCfg.enabled) continue;

      const channel = channelRegistry[channelCfg.type];
      if (!channel) continue;

      const delivered = await channel.send({ to: doctor.email, subject, body }, channelCfg);

      await AlertLog.create({
        patientId,
        doctorId: doctor._id,
        measurementId,
        measurementType,
        status: 'info',
        field: fieldSummary,
        value: 0,
        unit: '',
        message: `${subject}\n\n${body}`,
        channel: channelCfg.type as NotificationChannelType,
        delivered,
      });
    }
  }

  await Notification.create({
    userId: patientId,
    category: 'info',
    title: `Nuova misura registrata: ${typeName}`,
    body: fieldSummary,
    referenceId: measurementId,
    referenceModel: 'Measurement',
  });
}
