import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import measurementRoutes from './routes/measurements.js';
import deviceRoutes from './routes/devices.js';
import adminRoutes from './routes/admin.js';
import doctorRoutes from './routes/doctor.js';
import nurseRoutes from './routes/nurse.js';
import measurementTypeRoutes from './routes/measurementTypes.js';
import chartConfigRoutes from './routes/chartConfigs.js';
import analystRoutes from './routes/analyst.js';
import alertRoutes from './routes/alert.js';
import notificationRoutes from './routes/notifications.js';
import patientRoutes from './routes/patient.js';
import contractRoutes from './routes/contracts.js';
import ticketRoutes from './routes/tickets.js';
import { FitbitProvider, GoogleHealthProvider, deviceRegistry } from './services/device/index.js';

const app = express();

if (env.fitbit.clientId && env.fitbit.clientSecret) {
  deviceRegistry.register(new FitbitProvider(env.fitbit.clientId, env.fitbit.clientSecret));
}

if (env.googleHealth.clientId && env.googleHealth.clientSecret) {
  deviceRegistry.register(new GoogleHealthProvider(env.googleHealth.clientId, env.googleHealth.clientSecret));
}

const allowedOrigins = ['http://localhost:5173', env.appUrl];
app.use(cors({ origin: [...new Set(allowedOrigins)], credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/measurement-types', measurementTypeRoutes);
app.use('/api/chart-configs', chartConfigRoutes);
app.use('/api/analyst', analystRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/admin/contracts', contractRoutes);
app.use('/api/tickets', ticketRoutes);

app.use(errorHandler);

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`HealthBridge backend running on port ${env.port}`);
  });
}

start();
