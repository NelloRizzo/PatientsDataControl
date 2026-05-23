import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as alertController from '../controllers/alertController.js';

const router = Router();

router.use(authenticate);

router.get('/templates', requireRole('admin'), alertController.listTemplates);
router.post('/templates', requireRole('admin'), alertController.createTemplate);
router.put('/templates/:id', requireRole('admin'), alertController.updateTemplate);
router.delete('/templates/:id', requireRole('admin'), alertController.deleteTemplate);

router.get('/logs', requireRole('admin', 'doctor'), alertController.listLogs);

export default router;
