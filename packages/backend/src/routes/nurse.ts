import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as nurseController from '../controllers/nurseController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('nurse'));

router.get('/patients', nurseController.myPatients);
router.post('/patients', nurseController.addPatient);
router.get('/patients/:patientId/latest-measurements', nurseController.patientLatestMeasurements);
router.get('/patients/:patientId/timeseries', nurseController.patientTimeseries);
router.get('/patients/:patientId/measurements', nurseController.patientMeasurements);
router.get('/patients/:patientId/medications', nurseController.patientMedications);
router.post('/patients/:patientId/measurements', nurseController.createPatientMeasurement);
router.post('/patients/:patientId/reset-password', nurseController.resetPatientPassword);
router.get('/patients/:patientId/notes', nurseController.getPatientNotes);
router.get('/patients/:patientId/anamnesis', nurseController.getPatientAnamnesis);

export default router;
