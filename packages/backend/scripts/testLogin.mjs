import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/healthbridge');
  
  const userDoc = await mongoose.connection.db.collection('users').findOne({ email: 'patient1@example.com' });
  if (userDoc) {
    console.log('Found patient1:');
    console.log('  password exists:', !!userDoc.password);
    console.log('  starts with hash:', userDoc.password?.startsWith('$2b'));
    console.log('  mustChangePassword:', userDoc.mustChangePassword);
    const match = await bcrypt.compare('patient1234', userDoc.password);
    console.log('  password match (patient1234):', match);
  } else {
    console.log('patient1@example.com not found');
  }

  const patients = await mongoose.connection.db.collection('users').find({ role: 'patient' }).toArray();
  console.log(`\nAll ${patients.length} patients:`);
  for (const p of patients) {
    console.log(`  ${p.email}: password=${!!p.password}, mustChangePassword=${p.mustChangePassword}`);
  }
  
  await mongoose.disconnect();
}

test().catch(console.error);
