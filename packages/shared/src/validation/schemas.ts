import { z } from 'zod';

const measurementSources = [
  'manual', 'fitbit', 'google_fit', 'apple_health', 'device_api', 'import',
] as const;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  birthDate: z.string().optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  area: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const fieldValueSchema = z.record(z.string(), z.number());

const fieldUnitsSchema = z.record(z.string(), z.string().min(1));

export const createMeasurementSchema = z.object({
  type: z.string().min(1),
  values: fieldValueSchema,
  units: fieldUnitsSchema,
  source: z.enum(measurementSources).default('manual'),
  timestamp: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateMeasurementSchema = z.object({
  values: fieldValueSchema.optional(),
  units: fieldUnitsSchema.optional(),
  timestamp: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const measurementTypeFieldSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
  units: z.array(z.string().min(1).max(50)).min(1),
  type: z.enum(['number', 'integer', 'decimal']),
  min: z.number().optional(),
  max: z.number().optional(),
  alertMin: z.number().optional(),
  alertMax: z.number().optional(),
  dangerMin: z.number().optional(),
  dangerMax: z.number().optional(),
});

export const createMeasurementTypeSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(100),
  macrogroup: z.string().min(1).max(100),
  fields: z.array(measurementTypeFieldSchema).min(1),
});

export const updateMeasurementTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(100).optional(),
  macrogroup: z.string().min(1).max(100).optional(),
  fields: z.array(measurementTypeFieldSchema).min(1).optional(),
  active: z.boolean().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.string().optional(),
});

const addressSchema = z.object({
  full: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['doctor', 'analyst', 'admin']),
  birthDate: z.string().optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  birthCity: z.string().max(100).optional(),
  homeAddress: addressSchema.optional(),
  legalAddress: addressSchema.optional(),
  maxPatients: z.number().int().positive().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['patient', 'doctor', 'analyst', 'admin']).optional(),
  birthDate: z.string().optional().nullable(),
  sex: z.enum(['male', 'female', 'other']).optional().nullable(),
  birthCity: z.string().max(100).optional().nullable(),
  homeAddress: addressSchema.optional().nullable(),
  legalAddress: addressSchema.optional().nullable(),
  maxPatients: z.number().int().positive().optional().nullable(),
});

export const addPatientSchema = z.object({
  email: z.string().email('Invalid email'),
});

export const doctorCreatePatientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  birthDate: z.string().min(1, 'Birth date is required'),
  sex: z.enum(['male', 'female', 'other']),
  birthCity: z.string().max(100).optional(),
  homeAddress: addressSchema.optional(),
  height: z.number().positive('Height must be positive').optional(),
  weight: z.number().positive('Weight must be positive').optional(),
  sharedMeasurementTypes: z.array(z.string()).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  birthDate: z.string().optional().nullable(),
  sex: z.enum(['male', 'female', 'other']).optional().nullable(),
  birthCity: z.string().max(100).optional().nullable(),
  homeAddress: addressSchema.optional().nullable(),
  legalAddress: addressSchema.optional().nullable(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000),
  showToPatient: z.boolean().optional().default(false),
  notifyPatient: z.boolean().optional().default(false),
  anamnesisId: z.string().optional(),
});

const anamnesisSectionSchema = z.object({
  entries: z.array(z.string()).default([]),
});

const farmacologicaEntrySchema = z.object({
  text: z.string().min(1, 'Text is required'),
  isCurrent: z.boolean(),
});

const farmacologicaSectionSchema = z.object({
  entries: z.array(farmacologicaEntrySchema).default([]),
});

export const createAnamnesisSchema = z.object({
  fisiologica: anamnesisSectionSchema.optional(),
  familiare: anamnesisSectionSchema.optional(),
  farmacologica: farmacologicaSectionSchema.optional(),
  patologicaRemota: anamnesisSectionSchema.optional(),
  patologicaProssima: anamnesisSectionSchema.optional(),
  sociale: anamnesisSectionSchema.optional(),
  notes: z.string().max(2000).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const updateSharingSchema = z.object({
  types: z.array(z.string()).default([]),
});

export const requestSharingSchema = z.object({
  types: z.array(z.string().min(1)).min(1, 'At least one type is required'),
});

export const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const privacyConsentSchema = z.object({
  action: z.enum(['accept', 'revoke']),
});

const channelConfigSchema = z.object({
  type: z.enum(['email', 'sms', 'watchapp']),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.any()).default({}),
});

export const createAlertTemplateSchema = z.object({
  measurementType: z.string().min(1),
  status: z.enum(['alert', 'danger', 'info']),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  channels: z.array(channelConfigSchema).default([{ type: 'email', enabled: true, settings: {} }]),
  active: z.boolean().default(true),
});

export const createChartConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  measurementType: z.string().min(1),
  groupBy: z.enum(['hour', 'day', 'week', 'month', 'year']).default('day'),
  aggregation: z.enum(['avg', 'min', 'max']).default('avg'),
  fields: z.array(z.string().min(1)).min(1),
  chartType: z.enum(['line', 'area', 'bar']).default('line'),
  dateRange: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
});

export const updateChartConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  measurementType: z.string().min(1).optional(),
  groupBy: z.enum(['hour', 'day', 'week', 'month', 'year']).optional(),
  aggregation: z.enum(['avg', 'min', 'max']).optional(),
  fields: z.array(z.string().min(1)).min(1).optional(),
  chartType: z.enum(['line', 'area', 'bar']).optional(),
  dateRange: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
});

export const updateAlertTemplateSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(2000).optional(),
  channels: z.array(channelConfigSchema).optional(),
  active: z.boolean().optional(),
});

const feeTypeEnum = z.enum(['fixed', 'monthly', 'per_patient']);

export const createContractSchema = z.object({
  doctorId: z.string().min(1, 'Doctor is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  maxPatients: z.number().int().positive('Must be at least 1'),
  fee: z.number().min(0, 'Fee must be ≥ 0'),
  feeType: feeTypeEnum.default('fixed'),
  currency: z.string().min(1).default('EUR'),
  notes: z.string().max(500).optional(),
  status: z.enum(['active', 'expired', 'cancelled']).default('active'),
});

const prescriptionTimeSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

export const createPrescriptionSchema = z.object({
  drugName: z.string().min(1, 'Drug name is required').max(200),
  dosage: z.string().min(1, 'Dosage is required').max(100),
  frequency: z.string().min(1, 'Frequency is required').max(200),
  route: z.string().min(1, 'Route is required').max(100),
  schedule: z.array(prescriptionTimeSchema).min(1, 'At least one schedule time is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePrescriptionSchema = z.object({
  drugName: z.string().min(1).max(200).optional(),
  dosage: z.string().min(1).max(100).optional(),
  frequency: z.string().min(1).max(200).optional(),
  route: z.string().min(1).max(100).optional(),
  schedule: z.array(prescriptionTimeSchema).min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});

export const logMedicationSchema = z.object({
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  notes: z.string().max(500).optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createTicketSchema = z.object({
  type: z.enum(['suggestion', 'bug_report']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  page: z.string().max(500).optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_review', 'in_progress', 'resolved', 'closed']).optional(),
  assigneeId: z.string().optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export const updateContractSchema = z.object({
  doctorId: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxPatients: z.number().int().positive().optional(),
  fee: z.number().min(0).optional(),
  feeType: feeTypeEnum.optional(),
  currency: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['active', 'expired', 'cancelled']).optional(),
});
