import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import * as patientController from '../controllers/patientController.js';
import * as medicationController from '../controllers/medicationController.js';
import { privacyConsentSchema, logMedicationSchema } from '@healthbridge/shared';

const router = Router();

router.use(authenticate);

router.get('/notes', patientController.myNotes);
router.get('/anamnesis', patientController.myAnamnesis);

// Doctor management
router.get('/doctors', patientController.myDoctors);
router.post('/doctors/:doctorId/confirm', patientController.confirmDoctor);
router.delete('/doctors/:doctorId/reject', patientController.rejectDoctor);
router.delete('/doctors/:doctorId/disconnect', patientController.disconnectDoctor);

// Nurse management
router.get('/nurses', patientController.myNurses);
router.post('/nurses/:nurseId/confirm', patientController.confirmNurse);
router.delete('/nurses/:nurseId/reject', patientController.rejectNurse);
router.delete('/nurses/:nurseId/disconnect', patientController.disconnectNurse);

// BMI
router.get('/bmi', patientController.getBmi);
router.get('/bmi/timeseries', patientController.getBmiTimeSeries);

// Medications
router.get('/medications', medicationController.myMedications);
router.get('/medications/due', medicationController.dueMedications);
router.get('/medications/:id/log', medicationController.getMedicationLog);
router.post('/medications/:id/take', validate(logMedicationSchema), medicationController.takeMedication);

// GDPR Privacy
router.post('/privacy-consent', validate(privacyConsentSchema), patientController.privacyConsent);
router.get('/privacy-consent', patientController.getPrivacyConsentHistory);

export default router;
