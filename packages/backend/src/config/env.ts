import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/healthbridge',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@healthbridge.com',
  },
  groqApiKey: process.env.GROQ_API_KEY || '',
  fitbit: {
    clientId: process.env.FITBIT_CLIENT_ID || '',
    clientSecret: process.env.FITBIT_CLIENT_SECRET || '',
  },
};
