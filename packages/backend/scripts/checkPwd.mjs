import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ennerre:r1zz0nell0@cluster0.lh3sthm.mongodb.net/healthbridge?appName=Cluster0';

async function check() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected.');

  // Check all users
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log(`\nTotal users: ${users.length}`);
  for (const u of users) {
    console.log(`\n  ${u.email} (${u.role}):`);
    console.log(`    password field exists: ${!!u.password}`);
    console.log(`    password type: ${typeof u.password}`);
    console.log(`    password length: ${u.password?.length || 0}`);
    console.log(`    starts with hash prefix: ${u.password?.startsWith?.('$2b') || u.password?.startsWith?.('$2a')}`);
    console.log(`    mustChangePassword: ${u.mustChangePassword}`);
    console.log(`    emailVerified: ${u.emailVerified}`);
  }

  // Try comparing a password
  const patient = await mongoose.connection.db.collection('users').findOne({ email: 'patient1@example.com' });
  if (patient && patient.password) {
    const match = await bcrypt.compare('patient1234', patient.password);
    console.log(`\npatient1 password match (patient1234): ${match}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
