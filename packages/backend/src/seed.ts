import mongoose from 'mongoose';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Measurement } from './models/Measurement.js';
import { MeasurementTypeConfig } from './models/MeasurementTypeConfig.js';
import { PatientDoctor } from './models/PatientDoctor.js';
import { ChartConfig } from './models/ChartConfig.js';
import { AlertTemplate } from './models/AlertTemplate.js';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.mongoUri);
  console.log('Connected.');

  // ── Clear existing data ──
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Measurement.deleteMany({}),
    MeasurementTypeConfig.deleteMany({}),
    PatientDoctor.deleteMany({}),
    ChartConfig.deleteMany({}),
  ]);
  console.log('Cleared.');

  // ── Measurement Type Configs ──
  console.log('Creating measurement types...');
  const typeConfigs = await MeasurementTypeConfig.insertMany([
    {
      key: 'blood_pressure',
      name: 'Blood Pressure',
      category: 'vital',
      macrogroup: 'cardiac',
      fields: [
        {
          key: 'systolic', name: 'Systolic', unit: 'mmHg', units: ['mmHg'],
          type: 'integer', min: 30, max: 300,
          alertMin: 90, alertMax: 140,
          dangerMin: 60, dangerMax: 180,
        },
        {
          key: 'diastolic', name: 'Diastolic', unit: 'mmHg', units: ['mmHg'],
          type: 'integer', min: 20, max: 200,
          alertMin: 60, alertMax: 90,
          dangerMin: 40, dangerMax: 120,
        },
      ],
      active: true,
    },
    {
      key: 'glucose',
      name: 'Glucose',
      category: 'lab',
      macrogroup: 'blood_gas',
      fields: [
        {
          key: 'value', name: 'Glucose Level', unit: 'mg/dL', units: ['mg/dL', 'mmol/L'],
          type: 'decimal', min: 0, max: 1000,
          alertMin: 70, alertMax: 180,
          dangerMin: 40, dangerMax: 500,
        },
      ],
      active: true,
    },
    {
      key: 'heart_rate',
      name: 'Heart Rate',
      category: 'vital',
      macrogroup: 'cardiac',
      fields: [
        {
          key: 'value', name: 'BPM', unit: 'bpm', units: ['bpm'],
          type: 'integer', min: 20, max: 300,
          alertMin: 50, alertMax: 110,
          dangerMin: 30, dangerMax: 220,
        },
      ],
      active: true,
    },
    {
      key: 'weight',
      name: 'Weight',
      category: 'body',
      macrogroup: 'generalhealth',
      fields: [
        {
          key: 'value', name: 'Weight', unit: 'kg', units: ['kg', 'lbs', 'stones'],
          type: 'decimal', min: 1, max: 500,
        },
      ],
      active: true,
    },
    {
      key: 'temperature',
      name: 'Temperature',
      category: 'vital',
      macrogroup: 'generalhealth',
      fields: [
        {
          key: 'value', name: 'Temperature', unit: '°C', units: ['°C', '°F'],
          type: 'decimal', min: 30, max: 45,
          alertMin: 36, alertMax: 38,
          dangerMin: 35, dangerMax: 40,
        },
      ],
      active: true,
    },
    {
      key: 'spo2',
      name: 'Oxygen Saturation (SpO₂)',
      category: 'vital',
      macrogroup: 'blood_gas',
      fields: [
        {
          key: 'value', name: 'SpO₂', unit: '%', units: ['%'],
          type: 'integer', min: 0, max: 100,
          alertMin: 92, alertMax: 100,
          dangerMin: 85, dangerMax: 100,
        },
      ],
      active: true,
    },
    {
      key: 'respiratory_rate',
      name: 'Respiratory Rate',
      category: 'vital',
      macrogroup: 'blood_gas',
      fields: [
        {
          key: 'value', name: 'Breaths/min', unit: 'bpm', units: ['bpm'],
          type: 'integer', min: 0, max: 100,
          alertMin: 12, alertMax: 20,
          dangerMin: 8, dangerMax: 30,
        },
      ],
      active: true,
    },
    {
      key: 'cholesterol',
      name: 'Cholesterol',
      category: 'lab',
      macrogroup: 'lipidemia',
      fields: [
        {
          key: 'total', name: 'Total', unit: 'mg/dL', units: ['mg/dL', 'mmol/L'],
          type: 'integer', min: 0, max: 500,
          alertMax: 200,
          dangerMax: 240,
        },
        {
          key: 'hdl', name: 'HDL', unit: 'mg/dL', units: ['mg/dL', 'mmol/L'],
          type: 'integer', min: 0, max: 200,
          alertMin: 40,
          dangerMin: 35,
        },
        {
          key: 'ldl', name: 'LDL', unit: 'mg/dL', units: ['mg/dL', 'mmol/L'],
          type: 'integer', min: 0, max: 400,
          alertMax: 130,
          dangerMax: 160,
        },
      ],
      active: true,
    },
  ]);
  console.log(`  Created ${typeConfigs.length} measurement types.`);

  // ── Users ──
  console.log('Creating users...');
  const usersRaw = [
    { email: 'admin@healthbridge.com', password: 'admin1234', name: 'System Admin', role: 'admin' as const },
    { email: 'dr.smith@healthbridge.com', password: 'doctor1234', name: 'Dr. Alice Smith', role: 'doctor' as const, specialty: 'Cardiology', maxPatients: 2 },
    { email: 'dr.jones@healthbridge.com', password: 'doctor1234', name: 'Dr. Bob Jones', role: 'doctor' as const, specialty: 'Endocrinology', maxPatients: 2 },
    { email: 'analyst@healthbridge.com', password: 'analyst1234', name: 'Charlie Data', role: 'analyst' as const },
    { email: 'patient1@example.com', password: 'patient1234', name: 'John Doe', role: 'patient' as const, birthDate: new Date('1985-06-15'), sex: 'male' as const, homeAddress: { full: '123 Main St, Milan, MI 20100, Italy', city: 'Milan', province: 'MI', region: 'Lombardy', country: 'Italy' }, legalAddress: { full: '123 Main St, Milan, MI 20100, Italy', city: 'Milan', province: 'MI', region: 'Lombardy', country: 'Italy' } },
    { email: 'patient2@example.com', password: 'patient1234', name: 'Jane Roe', role: 'patient' as const, birthDate: new Date('1990-11-22'), sex: 'female' as const, homeAddress: { full: '456 Oak Ave, Rome, RM 00100, Italy', city: 'Rome', province: 'RM', region: 'Lazio', country: 'Italy' }, legalAddress: { full: '789 Pine Rd, Florence, FI 50100, Italy', city: 'Florence', province: 'FI', region: 'Tuscany', country: 'Italy' } },
    { email: 'patient3@example.com', password: 'patient1234', name: 'Mike Brown', role: 'patient' as const, birthDate: new Date('1978-03-08'), sex: 'male' as const, homeAddress: { full: '321 Elm St, Turin, TO 10100, Italy', city: 'Turin', province: 'TO', region: 'Piedmont', country: 'Italy' }, legalAddress: { full: '321 Elm St, Turin, TO 10100, Italy', city: 'Turin', province: 'TO', region: 'Piedmont', country: 'Italy' } },
    { email: 'patient4@example.com', password: 'patient1234', name: 'Sara White', role: 'patient' as const, birthDate: new Date('2000-07-30'), sex: 'female' as const, homeAddress: { full: '654 Beach Rd, Naples, NA 80100, Italy', city: 'Naples', province: 'NA', region: 'Campania', country: 'Italy' }, legalAddress: { full: '654 Beach Rd, Naples, NA 80100, Italy', city: 'Naples', province: 'NA', region: 'Campania', country: 'Italy' } },
    { email: 'patient5@example.com', password: 'patient1234', name: 'Tom Gray', role: 'patient' as const, birthDate: new Date('1965-12-10'), sex: 'male' as const, homeAddress: { full: '987 Hill Rd, Bologna, BO 40100, Italy', city: 'Bologna', province: 'BO', region: 'Emilia-Romagna', country: 'Italy' }, legalAddress: { full: '987 Hill Rd, Bologna, BO 40100, Italy', city: 'Bologna', province: 'BO', region: 'Emilia-Romagna', country: 'Italy' } },
  ];

  const users = await User.create(usersRaw);
  console.log(`  Created ${users.length} users.`);

  // ── Patient-Doctor Associations ──
  console.log('Creating associations...');
  const admin = users.find((u) => u.role === 'admin')!;
  const drSmith = users.find((u) => u.email === 'dr.smith@healthbridge.com')!;
  const drJones = users.find((u) => u.email === 'dr.jones@healthbridge.com')!;
  const patients = users.filter((u) => u.role === 'patient');

  const associations = await PatientDoctor.insertMany([
    { patientId: patients[0]._id, doctorId: drSmith._id, status: 'active', assignedBy: admin._id, assignedAt: new Date() },
    { patientId: patients[1]._id, doctorId: drSmith._id, status: 'active', assignedBy: admin._id, assignedAt: new Date() },
    { patientId: patients[2]._id, doctorId: drSmith._id, status: 'active', assignedBy: admin._id, assignedAt: new Date() },
    { patientId: patients[3]._id, doctorId: drJones._id, status: 'active', assignedBy: admin._id, assignedAt: new Date() },
    { patientId: patients[4]._id, doctorId: drJones._id, status: 'active', assignedBy: admin._id, assignedAt: new Date() },
  ]);
  console.log(`  Created ${associations.length} associations.`);

  // ── Sample Measurements ──
  console.log('Creating sample measurements...');
  const now = new Date();
  const measurementDocs: any[] = [];

  for (const patient of patients) {
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);

      // Blood pressure (with occasional alert values)
      const systolic = 110 + Math.floor(Math.random() * 30);
      const diastolic = 70 + Math.floor(Math.random() * 20);
      measurementDocs.push({
        userId: patient._id,
        type: 'blood_pressure',
        values: { systolic: dayOffset === 5 ? 152 : systolic, diastolic: dayOffset === 5 ? 98 : diastolic },
        units: { systolic: 'mmHg', diastolic: 'mmHg' },
        source: 'manual',
        timestamp: date,
      });

      // Glucose
      const glucose = 85 + Math.floor(Math.random() * 40);
      measurementDocs.push({
        userId: patient._id,
        type: 'glucose',
        values: { value: dayOffset === 3 ? 210 : glucose },
        units: { value: 'mg/dL' },
        source: 'manual',
        timestamp: date,
      });

      // Heart rate
      const hr = 65 + Math.floor(Math.random() * 25);
      measurementDocs.push({
        userId: patient._id,
        type: 'heart_rate',
        values: { value: hr },
        units: { value: 'bpm' },
        source: 'manual',
        timestamp: date,
      });

      // Weight (weekly)
      if (dayOffset % 7 === 0) {
        const baseWeight = [78, 65, 92, 55, 83];
        measurementDocs.push({
          userId: patient._id,
          type: 'weight',
          values: { value: baseWeight[patients.indexOf(patient)] + Math.random() * 3 - 1.5 },
          units: { value: 'kg' },
          source: 'manual',
          timestamp: date,
        });
      }

      // SpO₂ (always normal)
      if (dayOffset % 2 === 0) {
        measurementDocs.push({
          userId: patient._id,
          type: 'spo2',
          values: { value: 97 + Math.floor(Math.random() * 3) },
          units: { value: '%' },
          source: 'manual',
          timestamp: date,
        });
      }

      // Temperature (with occasional fever)
      const temp = 36.5 + Math.random() * 0.8;
      measurementDocs.push({
        userId: patient._id,
        type: 'temperature',
        values: { value: dayOffset === 10 ? 38.5 : temp },
        units: { value: '°C' },
        source: 'manual',
        timestamp: date,
      });
    }
  }

  const inserted = await Measurement.insertMany(measurementDocs);
  console.log(`  Created ${inserted.length} measurements.`);

  // ── Alert Templates ──
  console.log('Creating alert templates...');
  const typeKeys = await MeasurementTypeConfig.find({ active: true }).select('key').lean();
  const defaultChannel = [{ type: 'email' as const, enabled: true, settings: {} }];

  const alertTemplates: any[] = [];
  for (const t of typeKeys) {
    if (t.key === 'weight') continue; // no thresholds

    alertTemplates.push({
      measurementType: t.key,
      status: 'alert',
      subject: 'Alert: {patientName} - {fieldName} = {value} {unit}',
      body: `Patient {patientName} has recorded a {fieldName} of {value} {unit} on {measurementType}.\n\nThis value is outside the normal range ({thresholdMin}-{thresholdMax}).\n\nPlease review the patient's data at your earliest convenience.`,
      channels: defaultChannel,
      active: true,
    });

    alertTemplates.push({
      measurementType: t.key,
      status: 'danger',
      subject: 'DANGER: {patientName} - {fieldName} = {value} {unit}',
      body: `URGENT: Patient {patientName} has recorded a {fieldName} of {value} {unit} on {measurementType}.\n\nThis value is critically outside the safe range ({thresholdMin}-{thresholdMax}).\n\nImmediate attention may be required.`,
      channels: defaultChannel,
      active: true,
    });
  }

  // Info templates (one per type, for "new measurement" notifications)
  for (const t of typeKeys) {
    alertTemplates.push({
      measurementType: t.key,
      status: 'info',
      subject: 'New measurement: {patientName} - {measurementType}',
      body: `Patient {patientName} has recorded a new {measurementType} measurement.\n\nValues: {fieldSummary}\n\nPlease review in the patient dashboard.`,
      channels: defaultChannel,
      active: true,
    });
  }

  await AlertTemplate.deleteMany({});
  await AlertTemplate.insertMany(alertTemplates);
  console.log(`  Created ${alertTemplates.length} alert templates.`);

  console.log('\n✅ Seed complete!');
  console.log('── Login credentials ──');
  console.log('  Admin:   admin@healthbridge.com / admin1234');
  console.log('  Doctor:  dr.smith@healthbridge.com / doctor1234');
  console.log('  Doctor:  dr.jones@healthbridge.com / doctor1234');
  console.log('  Analyst: analyst@healthbridge.com / analyst1234');
  console.log('  Patient: patient1@example.com / patient1234 (etc.)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
