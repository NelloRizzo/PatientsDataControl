import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as analystController from '../controllers/analystController.js';
import * as exportController from '../controllers/exportController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('analyst', 'admin'));

router.get('/stats', analystController.stats);
router.get('/timeseries', analystController.timeseries);
router.get('/export/csv', exportController.analystCsv);

export default router;
