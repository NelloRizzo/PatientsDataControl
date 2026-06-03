import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as deviceController from '../controllers/deviceController.js';

const router = Router();

router.get('/oauth-url', authenticate, deviceController.getOAuthUrl);
router.get('/callback', deviceController.handleCallback);
router.post('/sync/:provider', authenticate, deviceController.syncProvider);
router.post('/upgrade-to-google', authenticate, deviceController.upgradeToGoogle);

router.use(authenticate);

router.get('/connections', deviceController.listConnections);
router.post('/connect', deviceController.connect);
router.delete('/connections/:id', deviceController.disconnect);

export default router;
