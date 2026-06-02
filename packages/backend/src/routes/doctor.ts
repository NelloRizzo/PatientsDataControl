import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import * as doctorController from '../controllers/doctorController.js';
import * as anamnesisController from '../controllers/anamnesisController.js';
import { createMeasurementSchema, requestSharingSchema } from '@healthbridge/shared';

const router = Router();

router.use(authenticate);
router.use(requireRole('doctor'));

router.get('/patients', doctorController.myPatients);
router.post('/patients', doctorController.addPatient);
router.patch('/patients/:patientId', doctorController.updatePatientAssociation);
router.patch('/patients/:patientId/notify', doctorController.toggleNotify);
router.delete('/patients/:patientId', doctorController.removePatientAssociation);
router.put('/patients/:patientId/profile', doctorController.updatePatientProfile);
router.post('/patients/:patientId/reset-password', doctorController.resetPatientPassword);
router.get('/patients/:patientId/notes', doctorController.getPatientNotes);
router.post('/patients/:patientId/notes', doctorController.addPatientNote);
router.get('/patients/:patientId/alerts', doctorController.getPatientAlerts);
router.get('/patients/:patientId/latest-measurements', doctorController.patientLatestMeasurements);
router.get('/patients/:patientId/measurements', doctorController.patientMeasurements);
router.post('/patients/:patientId/measurements', validate(createMeasurementSchema), doctorController.createPatientMeasurement);
router.delete('/patients/:patientId/measurements', doctorController.deletePatientMeasurements);
router.get('/patients/:patientId/timeseries', doctorController.patientTimeseries);
router.get('/patients/:patientId/stats', doctorController.patientStats);
router.get('/patients/:patientId/sharing', doctorController.getPatientSharing);
router.post('/patients/:patientId/request-sharing', validate(requestSharingSchema), doctorController.requestSharing);
router.get('/patients/:patientId/anamnesis', anamnesisController.listAnamnesis);
router.post('/patients/:patientId/anamnesis', anamnesisController.createAnamnesis);
router.get('/recent-activity', doctorController.recentActivity);
router.get('/timeseries', doctorController.aggregatedTimeseries);
router.get('/stats', doctorController.aggregatedStats);
router.get('/contract-status', doctorController.getContractStatus);

export default router;
