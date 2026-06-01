import mongoose from 'mongoose';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Measurement } from './models/Measurement.js';
import { MeasurementTypeConfig } from './models/MeasurementTypeConfig.js';
import { PatientDoctor } from './models/PatientDoctor.js';
import { ChartConfig } from './models/ChartConfig.js';
import { AlertTemplate } from './models/AlertTemplate.js';
import { DoctorContract } from './models/DoctorContract.js';
import { GdprConsent } from './models/GdprConsent.js';

async function seed() {
  const cleanArg = process.argv.includes('--clean');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.mongoUri);
  console.log('Connected.');

  if (!cleanArg) {
    const existing = await User.countDocuments();
    if (existing > 0) {
      console.log(`Database already has ${existing} users. Use --clean to drop all data and re-seed.`);
      await mongoose.disconnect();
      process.exit(0);
    }
  } else {
    console.log('Cleaning existing data...');
    await Promise.all([
      User.deleteMany({}),
      Measurement.deleteMany({}),
      MeasurementTypeConfig.deleteMany({}),
      PatientDoctor.deleteMany({}),
      ChartConfig.deleteMany({}),
      AlertTemplate.deleteMany({}),
      DoctorContract.deleteMany({}),
      GdprConsent.deleteMany({}),
    ]);
    console.log('Cleaned.');
  }

  // ── Measurement Type Configs ──
  console.log('Creating measurement types...');
  const typeConfigs = await MeasurementTypeConfig.insertMany([
    {
      key: 'blood_pressure',
      name: 'Pressione Sanguigna',
      category: 'vital',
      macrogroup: 'cardiac',
      fields: [
        {
          key: 'systolic', name: 'Sistolica', unit: 'mmHg', units: ['mmHg'],
          type: 'integer', min: 30, max: 300,
          alertMin: 90, alertMax: 140,
          dangerMin: 60, dangerMax: 180,
        },
        {
          key: 'diastolic', name: 'Diastolica', unit: 'mmHg', units: ['mmHg'],
          type: 'integer', min: 20, max: 200,
          alertMin: 60, alertMax: 90,
          dangerMin: 40, dangerMax: 120,
        },
      ],
      active: true,
    },
    {
      key: 'glucose',
      name: 'Glicemia',
      category: 'lab',
      macrogroup: 'blood_gas',
      fields: [
        {
          key: 'value', name: 'Livello Glicemia', unit: 'mg/dL', units: ['mg/dL', 'mmol/L'],
          type: 'decimal', min: 0, max: 1000,
          alertMin: 70, alertMax: 180,
          dangerMin: 40, dangerMax: 500,
        },
      ],
      active: true,
    },
    {
      key: 'heart_rate',
      name: 'Frequenza Cardiaca',
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
      name: 'Peso',
      category: 'body',
      macrogroup: 'generalhealth',
      fields: [
        {
          key: 'value', name: 'Peso', unit: 'kg', units: ['kg'],
          type: 'decimal', min: 0, max: 500,
        },
      ],
      active: true,
    },
    {
      key: 'temperature',
      name: 'Temperatura Corporea',
      category: 'vital',
      macrogroup: 'generalhealth',
      fields: [
        {
          key: 'value', name: 'Temperatura', unit: '°C', units: ['°C', '°F'],
          type: 'decimal', min: 30, max: 45,
          alertMin: 36, alertMax: 38,
          dangerMin: 35, dangerMax: 40,
        },
      ],
      active: true,
    },
    {
      key: 'spo2',
      name: 'Saturazione Ossigeno (SpO₂)',
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
      name: 'Frequenza Respiratoria',
      category: 'vital',
      macrogroup: 'blood_gas',
      fields: [
        {
          key: 'value', name: 'Atti/min', unit: 'bpm', units: ['bpm'],
          type: 'integer', min: 0, max: 100,
          alertMin: 12, alertMax: 20,
          dangerMin: 8, dangerMax: 30,
        },
      ],
      active: true,
    },
    {
      key: 'cholesterol',
      name: 'Colesterolo',
      category: 'lab',
      macrogroup: 'lipidemia',
      fields: [
        {
          key: 'total', name: 'Totale', unit: 'mg/dL', units: ['mg/dL', 'mmol/L'],
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
    {
      key: 'height',
      name: 'Altezza',
      category: 'body',
      macrogroup: 'generalhealth',
      fields: [
        {
          key: 'value', name: 'Altezza', unit: 'cm', units: ['cm'],
          type: 'decimal', min: 0, max: 300,
        },
      ],
      active: true,
    },
    {
      key: 'body_composition',
      name: 'Composizione Corporea',
      description: 'Analisi bioimpedenziometrica',
      category: 'body',
      macrogroup: 'generalhealth',
      fields: [
        {
          key: 'body_fat_pct', name: 'Grasso Corporeo', unit: '%', units: ['%'],
          type: 'decimal', min: 0, max: 100,
        },
        {
          key: 'muscle_mass_kg', name: 'Massa Muscolare', unit: 'kg', units: ['kg'],
          type: 'decimal', min: 0, max: 300,
        },
        {
          key: 'bone_mass_kg', name: 'Massa Ossea', unit: 'kg', units: ['kg'],
          type: 'decimal', min: 0, max: 50,
        },
        {
          key: 'water_pct', name: 'Acqua Corporea', unit: '%', units: ['%'],
          type: 'decimal', min: 0, max: 100,
        },
        {
          key: 'visceral_fat', name: 'Grasso Viscerale', unit: 'index', units: ['index'],
          type: 'integer', min: 1, max: 59,
        },
        {
          key: 'bmr_kcal', name: 'BMR', unit: 'kcal', units: ['kcal'],
          type: 'integer', min: 500, max: 5000,
        },
        {
          key: 'metabolic_age', name: 'Età Metabolica', unit: 'years', units: ['years'],
          type: 'integer', min: 10, max: 120,
        },
      ],
      active: true,
    },
    {
      key: 'body_circumferences',
      name: 'Circonferenze Corporee',
      description: 'Misure con metro a nastro',
      category: 'body',
      macrogroup: 'generalhealth',
      fields: [
        { key: 'neck', name: 'Collo', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'chest', name: 'Torace', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'waist', name: 'Vita', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'hip', name: 'Fianchi', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'abdomen', name: 'Addome', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'arm', name: 'Braccio', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'forearm', name: 'Avambraccio', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'thigh', name: 'Coscia', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
        { key: 'calf', name: 'Polpaccio', unit: 'cm', units: ['cm', 'in'], type: 'decimal', min: 1, max: 300 },
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
    { email: 'patient1@example.com', password: 'patient1234', name: 'John Doe', role: 'patient' as const, birthDate: new Date('1985-06-15'), sex: 'male' as const, birthCity: 'Milan', homeAddress: { full: '123 Main St, Milan, MI 20100, Italy', city: 'Milan', province: 'MI', region: 'Lombardy', country: 'Italy' }, legalAddress: { full: '123 Main St, Milan, MI 20100, Italy', city: 'Milan', province: 'MI', region: 'Lombardy', country: 'Italy' } },
    { email: 'patient2@example.com', password: 'patient1234', name: 'Jane Roe', role: 'patient' as const, birthDate: new Date('1990-11-22'), sex: 'female' as const, birthCity: 'Rome', homeAddress: { full: '456 Oak Ave, Rome, RM 00100, Italy', city: 'Rome', province: 'RM', region: 'Lazio', country: 'Italy' }, legalAddress: { full: '789 Pine Rd, Florence, FI 50100, Italy', city: 'Florence', province: 'FI', region: 'Tuscany', country: 'Italy' } },
    { email: 'patient3@example.com', password: 'patient1234', name: 'Mike Brown', role: 'patient' as const, birthDate: new Date('1978-03-08'), sex: 'male' as const, birthCity: 'Turin', homeAddress: { full: '321 Elm St, Turin, TO 10100, Italy', city: 'Turin', province: 'TO', region: 'Piedmont', country: 'Italy' }, legalAddress: { full: '321 Elm St, Turin, TO 10100, Italy', city: 'Turin', province: 'TO', region: 'Piedmont', country: 'Italy' } },
    { email: 'patient4@example.com', password: 'patient1234', name: 'Sara White', role: 'patient' as const, birthDate: new Date('2000-07-30'), sex: 'female' as const, birthCity: 'Naples', homeAddress: { full: '654 Beach Rd, Naples, NA 80100, Italy', city: 'Naples', province: 'NA', region: 'Campania', country: 'Italy' }, legalAddress: { full: '654 Beach Rd, Naples, NA 80100, Italy', city: 'Naples', province: 'NA', region: 'Campania', country: 'Italy' } },
    { email: 'patient5@example.com', password: 'patient1234', name: 'Tom Gray', role: 'patient' as const, birthDate: new Date('1965-12-10'), sex: 'male' as const, birthCity: 'Bologna', homeAddress: { full: '987 Hill Rd, Bologna, BO 40100, Italy', city: 'Bologna', province: 'BO', region: 'Emilia-Romagna', country: 'Italy' }, legalAddress: { full: '987 Hill Rd, Bologna, BO 40100, Italy', city: 'Bologna', province: 'BO', region: 'Emilia-Romagna', country: 'Italy' } },
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

  // ── GDPR Consent for seed patients ──
  console.log('Creating GDPR consents...');
  await GdprConsent.insertMany(
    patients.map((p) => ({
      userId: p._id,
      type: 'privacy_policy' as const,
      granted: true,
      grantedAt: new Date(),
    }))
  );
  console.log(`  Created ${patients.length} GDPR consents.`);

  // ── Sample Measurements ──
  console.log('Creating sample measurements...');
  const now = new Date();
  const measurementDocs: any[] = [];

  for (const patient of patients) {
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);

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

      const glucose = 85 + Math.floor(Math.random() * 40);
      measurementDocs.push({
        userId: patient._id,
        type: 'glucose',
        values: { value: dayOffset === 3 ? 210 : glucose },
        units: { value: 'mg/dL' },
        source: 'manual',
        timestamp: date,
      });

      const hr = 65 + Math.floor(Math.random() * 25);
      measurementDocs.push({
        userId: patient._id,
        type: 'heart_rate',
        values: { value: hr },
        units: { value: 'bpm' },
        source: 'manual',
        timestamp: date,
      });

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
    if (t.key === 'weight') continue;

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

  await AlertTemplate.insertMany(alertTemplates);
  console.log(`  Created ${alertTemplates.length} alert templates.`);

  // ── Doctor Contracts ──
  console.log('Creating doctor contracts...');
  const contractStart = new Date();
  contractStart.setFullYear(contractStart.getFullYear() - 1);
  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + 1);
  const contracts = await DoctorContract.insertMany([
    {
      doctorId: drSmith._id,
      startDate: contractStart,
      endDate: contractEnd,
      maxPatients: 30,
      fee: 500,
      feeType: 'monthly',
      currency: 'EUR',
      status: 'active',
    },
    {
      doctorId: drJones._id,
      startDate: contractStart,
      endDate: contractEnd,
      maxPatients: 25,
      fee: 12000,
      feeType: 'fixed',
      currency: 'EUR',
      status: 'active',
    },
  ]);
  console.log(`  Created ${contracts.length} contracts.`);

  console.log('\n✅ Seed complete!');
  console.log('── Credenziali di accesso ──');
  console.log('  Admin:   admin@healthbridge.com / admin1234');
  console.log('  Doctor:  dr.smith@healthbridge.com / doctor1234');
  console.log('  Doctor:  dr.jones@healthbridge.com / doctor1234');
  console.log('  Analyst: analyst@healthbridge.com / analyst1234');
  console.log('  Patient: patient1@example.com / patient1234 (etc.)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed fallito:', err);
  process.exit(1);
});
