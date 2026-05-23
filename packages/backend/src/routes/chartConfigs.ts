import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createChartConfigSchema, updateChartConfigSchema } from '@healthbridge/shared';
import * as chartConfigController from '../controllers/chartConfigController.js';

const router = Router();

router.use(authenticate);

router.get('/', chartConfigController.list);
router.post('/', validate(createChartConfigSchema, 'body'), chartConfigController.create);
router.put('/:id', validate(updateChartConfigSchema, 'body'), chartConfigController.update);
router.delete('/:id', chartConfigController.remove);

export default router;
