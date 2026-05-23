import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { createMeasurementTypeSchema, updateMeasurementTypeSchema } from '@healthbridge/shared';
import * as measurementTypeController from '../controllers/measurementTypeController.js';

const router = Router();

router.get('/', authenticate, measurementTypeController.list);

router.post('/', authenticate, requireRole('admin'), validate(createMeasurementTypeSchema), measurementTypeController.create);
router.get('/all', authenticate, requireRole('admin'), measurementTypeController.listAll);
router.put('/:key', authenticate, requireRole('admin'), validate(updateMeasurementTypeSchema), measurementTypeController.update);
router.delete('/:key', authenticate, requireRole('admin'), measurementTypeController.remove);

export default router;
