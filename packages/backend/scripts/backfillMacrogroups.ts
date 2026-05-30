import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { MeasurementTypeConfig } from '../src/models/MeasurementTypeConfig.js';

const MACROGROUP_MAP: Record<string, string> = {
  blood_pressure: 'cardiac',
  heart_rate: 'cardiac',
  glucose: 'blood_gas',
  spo2: 'blood_gas',
  respiratory_rate: 'blood_gas',
  weight: 'generalhealth',
  temperature: 'generalhealth',
  cholesterol: 'lipidemia',
  triglycerides: 'lipidemia',
  hba1c: 'blood_gas',
  creatinine: 'renal',
  height: 'generalhealth',
  body_composition: 'generalhealth',
  body_circumferences: 'generalhealth',
};

async function backfill() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected.');

  const types = await MeasurementTypeConfig.find({}).lean();
  let updated = 0;

  for (const type of types) {
    const macrogroup = MACROGROUP_MAP[type.key];
    if (!macrogroup) {
      console.log(`  Skipping "${type.key}" — no mapping defined`);
      continue;
    }
    if (!type.macrogroup || type.macrogroup.trim() === '') {
      await MeasurementTypeConfig.updateOne(
        { _id: type._id },
        { $set: { macrogroup } }
      );
      console.log(`  Updated "${type.key}" → macrogroup: "${macrogroup}"`);
      updated++;
    } else {
      console.log(`  Skipping "${type.key}" — already has macrogroup: "${type.macrogroup}"`);
    }
  }

  console.log(`\nDone. Updated ${updated} type(s).`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
