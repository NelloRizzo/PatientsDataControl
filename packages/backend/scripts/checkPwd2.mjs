import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const MONGO_URI = 'mongodb+srv://ennerre:r1zz0nell0@cluster0.lh3sthm.mongodb.net/healthbridge?appName=Cluster0';

async function check() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected.\n');

  // Check doctor-created patient
  const patient = await mongoose.connection.db.collection('users').findOne({ email: 'nellorizzo@live.it' });
  if (patient) {
    console.log(`Patient: ${patient.email}`);
    console.log(`  password exists: ${!!patient.password}`);
    console.log(`  password: ${patient.password?.substring(0, 30)}...`);
    console.log(`  mustChangePassword: ${patient.mustChangePassword}`);
    console.log(`  emailVerified: ${patient.emailVerified}`);
    
    // Try common passwords
    const passwords = ['prova1234', 'password1234', 'test1234!', 'Temp1234!', 'salute123', 'medico1234'];
    for (const pwd of passwords) {
      const match = await bcrypt.compare(pwd, patient.password);
      if (match) console.log(`  *** PASSWORD MATCH: ${pwd} ***`);
    }
    console.log('  No match found with common passwords');
  }

  // Also check all patients with mustChangePassword
  const patients = await mongoose.connection.db.collection('users').find({ mustChangePassword: true }).toArray();
  console.log(`\nUsers with mustChangePassword: ${patients.length}`);
  for (const p of patients) {
    console.log(`  ${p.email}: password=${!!p.password}, emailVerified=${p.emailVerified}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
