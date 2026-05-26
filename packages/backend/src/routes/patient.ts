import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as patientController from '../controllers/patientController.js';

const router = Router();

router.use(authenticate);

router.get('/notes', patientController.myNotes);
router.get('/anamnesis', patientController.myAnamnesis);

export default router;
