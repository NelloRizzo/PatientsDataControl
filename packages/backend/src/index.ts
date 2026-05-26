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
import measurementTypeRoutes from './routes/measurementTypes.js';
import chartConfigRoutes from './routes/chartConfigs.js';
import analystRoutes from './routes/analyst.js';
import alertRoutes from './routes/alert.js';

const app = express();

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
app.use('/api/measurement-types', measurementTypeRoutes);
app.use('/api/chart-configs', chartConfigRoutes);
app.use('/api/analyst', analystRoutes);
app.use('/api/alerts', alertRoutes);

app.use(errorHandler);

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`HealthBridge backend running on port ${env.port}`);
  });
}

start();
