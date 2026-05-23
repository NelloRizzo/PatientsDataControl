import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as deviceController from '../controllers/deviceController.js';

const router = Router();

router.use(authenticate);

router.get('/connections', deviceController.listConnections);
router.post('/connect', deviceController.connect);
router.delete('/connections/:id', deviceController.disconnect);

export default router;
