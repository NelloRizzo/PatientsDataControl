import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import * as patientController from '../controllers/patientController.js';
import * as medicationController from '../controllers/medicationController.js';
import { updateSharingSchema, privacyConsentSchema, logMedicationSchema } from '@healthbridge/shared';

const router = Router();

router.use(authenticate);

router.get('/notes', patientController.myNotes);
router.get('/anamnesis', patientController.myAnamnesis);

// Doctor management
router.get('/doctors', patientController.myDoctors);
router.post('/doctors/:doctorId/confirm', patientController.confirmDoctor);
router.delete('/doctors/:doctorId/reject', patientController.rejectDoctor);

// Sharing
router.get('/doctors/:doctorId/sharing', patientController.getDoctorSharing);
router.put('/doctors/:doctorId/sharing', validate(updateSharingSchema), patientController.updateDoctorSharing);

// BMI
router.get('/bmi', patientController.getBmi);

// Medications
router.get('/medications', medicationController.myMedications);
router.get('/medications/due', medicationController.dueMedications);
router.get('/medications/:id/log', medicationController.getMedicationLog);
router.post('/medications/:id/take', validate(logMedicationSchema), medicationController.takeMedication);

// GDPR Privacy
router.post('/privacy-consent', validate(privacyConsentSchema), patientController.privacyConsent);
router.get('/privacy-consent', patientController.getPrivacyConsentHistory);

export default router;
