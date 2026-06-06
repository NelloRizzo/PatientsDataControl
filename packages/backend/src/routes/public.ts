import { Router } from 'express';
import { createRegistrationRequest } from '../controllers/ticketController.js';

const router = Router();

router.post('/registration-request', createRegistrationRequest);

export default router;
