import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { createMeasurementSchema, updateMeasurementSchema } from '@healthbridge/shared';
import * as measurementController from '../controllers/measurementController.js';
import * as aiExtractController from '../controllers/aiExtractController.js';

const router = Router();

router.use(authenticate);

router.get('/', measurementController.list);
router.post('/', validate(createMeasurementSchema), measurementController.create);
router.post('/import', upload.single('file'), measurementController.importCsv);
router.post('/extract', upload.single('file'), aiExtractController.extractMeasurements);
router.get('/timeseries', measurementController.timeseries);
router.get('/stats', measurementController.stats);
router.delete('/all', measurementController.deleteAll);
router.get('/:id', measurementController.getById);
router.put('/:id', validate(updateMeasurementSchema), measurementController.update);
router.delete('/:id', measurementController.remove);

export default router;
