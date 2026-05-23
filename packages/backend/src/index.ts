import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
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

app.use(cors({ origin: env.nodeEnv === 'production' ? false : 'http://localhost:5173', credentials: true }));
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

if (env.nodeEnv === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`HealthBridge backend running on port ${env.port}`);
  });
}

start();
