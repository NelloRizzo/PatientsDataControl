import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Anamnesis } from '../src/models/Anamnesis.js';

async function migrate() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected.');

  const oldRecords = await Anamnesis.find({
    pathologies: { $exists: true },
  }).lean();

  console.log(`Found ${oldRecords.length} records with old format.`);
  let migrated = 0;

  for (const record of oldRecords) {
    const update: any = {
      $set: {
        patologicaProssima: { entries: record.pathologies ? [record.pathologies] : [] },
        farmacologica: { entries: record.therapies ? [record.therapies] : [] },
        fisiologica: { entries: [] },
        familiare: { entries: [] },
        patologicaRemota: { entries: [] },
        sociale: { entries: [] },
      },
    };
    if (!record.notes) {
      update.$unset = { pathologies: '', therapies: '' };
    } else {
      update.$unset = { pathologies: '', therapies: '' };
    }

    await Anamnesis.updateOne({ _id: record._id }, update);
    migrated++;
  }

  console.log(`Migrated ${migrated} record(s).`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
